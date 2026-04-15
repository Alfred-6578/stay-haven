export type WalkInStep = 1 | 2 | 3 | 4 | 'success'

export type PaymentMethod = 'CASH' | 'POS' | 'BANK_TRANSFER'

export interface AvailableRoom {
  room: {
    id: string
    number: string
    floor: number
    roomType: {
      id: string
      name: string
      capacity: number
      basePrice: number | string
    }
  }
  baseAmount: number
  taxAmount: number
  totalAmount: number
  totalNights: number
}

export interface WalkInBookingResult {
  id: string
  bookingRef: string
  checkIn: string
  checkOut: string
  status: string
  totalAmount: number
  adults: number
  room: { number: string; floor: number }
  roomType: { name: string }
  payment: { reference: string; amount: number }
}

export interface WalkInFormData {
  step: WalkInStep
  // Guest
  guestId?: string
  isExistingGuest: boolean
  firstName: string
  lastName: string
  email: string
  phone: string
  loyaltyTier?: string
  // Stay
  checkIn: string // YYYY-MM-DD
  checkOut: string
  adults: number
  children: number
  specialRequests: string
  // Rooms (multi-select)
  selectedRooms: AvailableRoom[]
  // Payment
  paymentMethod: PaymentMethod
  amountReceived: number
  receiptRef: string
  // Result
  result?: {
    groupRef: string | null
    isGroup: boolean
    bookings: WalkInBookingResult[]
    guest: { id: string; firstName: string; lastName: string; email: string; isNewGuest: boolean }
    payment: {
      method: PaymentMethod
      amountReceived: number
      groupTotal: number
      underpayment?: boolean
      shortfall?: number
    }
    loyaltyPointsAwarded: number
    processedByName: string
    processedAt: string
  }
}

// All date helpers operate in the user's LOCAL timezone. Using
// `toISOString()` would return UTC dates, which drift back a day for
// timezones ahead of UTC (e.g. WAT = UTC+1) during the hours just
// after local midnight.
const pad = (n: number) => String(n).padStart(2, '0')

const toLocalYMD = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const todayYMD = (): string => toLocalYMD(new Date())

export const addDaysYMD = (ymd: string, days: number): string => {
  const [y, m, d] = ymd.split('-').map(Number)
  // Construct from local components; setDate handles month/year rollover
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + days)
  return toLocalYMD(date)
}

export const formatNaira = (v: number): string =>
  `₦${new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 }).format(v)}`

export const sumRoomsTotal = (rooms: AvailableRoom[]): number =>
  rooms.reduce((s, r) => s + r.totalAmount, 0)

export const sumRoomsBase = (rooms: AvailableRoom[]): number =>
  rooms.reduce((s, r) => s + r.baseAmount, 0)

export const sumRoomsTax = (rooms: AvailableRoom[]): number =>
  rooms.reduce((s, r) => s + r.taxAmount, 0)

export const sumCapacity = (rooms: AvailableRoom[]): number =>
  rooms.reduce((s, r) => s + r.room.roomType.capacity, 0)

export const initialFormData = (): WalkInFormData => ({
  step: 1,
  isExistingGuest: false,
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  checkIn: todayYMD(),
  checkOut: addDaysYMD(todayYMD(), 1),
  adults: 1,
  children: 0,
  specialRequests: '',
  selectedRooms: [],
  paymentMethod: 'CASH',
  amountReceived: 0,
  receiptRef: '',
})
