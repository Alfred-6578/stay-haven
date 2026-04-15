# Realtime Notifications

StayHaven uses [Supabase Realtime](https://supabase.com/docs/guides/realtime) on top of Postgres logical replication to push new notifications to logged-in users the moment they are inserted.

## Data flow

1. A server route handler calls `createNotification(...)` from [`src/lib/notifications.ts`](src/lib/notifications.ts).
2. Prisma inserts a row into `notifications`.
3. Supabase's replication stream picks up the `INSERT`.
4. Any browser subscribed to that user's channel receives the new row over the Realtime websocket.
5. The client updates its UI (badge count, dropdown, toast, etc.) without polling.

Prisma writes are the only way a row should be created. Do **not** call `prisma.notification.create()` directly in routes — always go through `createNotification()` so cross-cutting concerns (metadata normalization, analytics, future push delivery) live in one place.

## One-time Supabase setup

Realtime is opt-in per table. Enable it once per environment:

1. Open your project in the [Supabase Dashboard](https://app.supabase.com/).
2. **Database → Replication → Tables**.
3. Toggle **Enable Realtime** on `public.notifications`.
   - Ensure all three operations are enabled (`INSERT`, `UPDATE`, `DELETE`) — we currently only subscribe to `INSERT`, but the others are useful for read-receipt sync across devices.
4. If you use Supabase Row-Level Security, add a policy so authenticated clients can `SELECT` their own notifications — Realtime needs read access to deliver the payload. Example:

   ```sql
   alter table public.notifications enable row level security;

   create policy "own notifications"
     on public.notifications for select
     using (auth.uid()::text = "userId");
   ```

   StayHaven uses JWT cookies rather than Supabase Auth, so in practice we keep RLS **disabled** on `notifications` and rely on the anon key's default permissions. If you tighten this later, switch the browser client to pass the user's JWT via `supabase.realtime.setAuth(token)` before subscribing.

## Environment variables

| Key | Where used |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Both clients |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser (`lib/supabase-client.ts`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only (`lib/supabase.ts`) — **never expose** |

Already present in `.env`.

## Client subscription pattern

```tsx
'use client'
import { useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase-client'

export function useNotificationRealtime(
  userId: string | undefined,
  handleNewNotification: (n: unknown) => void
) {
  useEffect(() => {
    if (!userId) return

    const supabase = getSupabaseClient()
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `userId=eq.${userId}`,
        },
        (payload) => {
          handleNewNotification(payload.new)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, handleNewNotification])
}
```

### Channel naming

Use `notifications:{userId}` — unique per user, collision-free, and easy to filter in the Supabase dashboard while debugging.

### Filter string

The `filter` param is server-side — it evaluates on the replication stream before the payload is sent to the browser, so unrelated users' inserts never touch this socket. This is both a security win and a bandwidth win.

> ⚠️ The column name must match the DB column exactly. Prisma maps `userId` → `"userId"` (camelCase, quoted). If you switch the field to `snake_case` via `@map`, update the filter here.

## Unsubscribing

Always return the cleanup function from your `useEffect`:

```ts
return () => { supabase.removeChannel(channel) }
```

Leaking channels causes duplicate deliveries on hot reload and, in production, a slow resource drain as users navigate between routes.

## UX integration points

The `NotificationBell` component polls every 30s today. To switch it to Realtime:

1. Remove the 30-second polling interval.
2. Call `useNotificationRealtime(user.id, onNew)` inside the bell component.
3. In `onNew`, prepend the new notification to local state and increment `unreadCount`.
4. Still fetch the initial list on mount via `GET /api/notifications` — Realtime only delivers inserts after the subscription opens.

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| No messages arriving | Realtime not enabled for `public.notifications` in the Supabase dashboard |
| `CHANNEL_ERROR` on `.subscribe()` | Anon key wrong, URL wrong, or RLS policy denies SELECT for anon |
| Cross-user delivery leak | `filter` param mistyped — check the exact column name |
| Duplicate events | Channel created more than once (usually a missing cleanup) |
| Events missing under load | Bump `realtime.params.eventsPerSecond` in `supabase-client.ts` |

## Local development

Realtime works against hosted Supabase out of the box. For a fully offline loop you'd need [Supabase local dev](https://supabase.com/docs/guides/cli/local-development) with the `realtime` service running — optional, not currently set up.
