'use client'
import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { z } from 'zod'
import { HiOutlineX, HiOutlinePlus, HiOutlineTrash, HiOutlinePhotograph, HiOutlineMinus } from 'react-icons/hi'
import { toast } from 'sonner'
import { api } from '@/lib/api'

interface RoomType {
  id: string
  slug: string
  name: string
  description: string
  capacity: number
  amenities: string[]
  basePrice: number | string
  weekendMultiplier: number | string
  image: string | null
  images: string[]
  tag?: string | null
}

interface Props {
  open: boolean
  initial?: RoomType | null
  onClose: () => void
  onSaved: () => void
}

const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  capacity: z.number().int().min(1, 'Capacity must be ≥ 1').max(10),
  amenities: z.array(z.string().min(1)).min(1, 'Add at least one amenity'),
  basePrice: z.number().positive('Price must be positive'),
  weekendMultiplier: z.number().min(1, 'Multiplier must be ≥ 1'),
  tag: z.string().optional(),
  images: z.array(z.string().url()).optional(),
})

interface PendingImage {
  id: string
  file: File
  previewUrl: string
  uploadedUrl?: string
  uploading: boolean
  error?: string
}

const RoomTypeFormModal = ({ open, initial, onClose, onSaved }: Props) => {
  const editing = !!initial

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [capacity, setCapacity] = useState(2)
  const [basePrice, setBasePrice] = useState('')
  const [weekendMultiplier, setWeekendMultiplier] = useState('1.0')
  const [tag, setTag] = useState('')
  const [amenities, setAmenities] = useState<string[]>([])
  const [amenityInput, setAmenityInput] = useState('')

  // images: already-uploaded URLs + pending uploads
  const [existingImages, setExistingImages] = useState<string[]>([])
  const [pending, setPending] = useState<PendingImage[]>([])

  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Reset/seed when opening
  useEffect(() => {
    if (!open) return
    if (initial) {
      setName(initial.name)
      setDescription(initial.description)
      setCapacity(initial.capacity)
      setBasePrice(String(initial.basePrice))
      setWeekendMultiplier(String(initial.weekendMultiplier))
      setTag(initial.tag || '')
      setAmenities(initial.amenities || [])
      setExistingImages(initial.images || [])
    } else {
      setName('')
      setDescription('')
      setCapacity(2)
      setBasePrice('')
      setWeekendMultiplier('1.0')
      setTag('')
      setAmenities([])
      setExistingImages([])
    }
    setAmenityInput('')
    setPending([])
    setErrors({})
  }, [open, initial])

  // Escape + body scroll lock
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && !submitting) onClose() }
    window.addEventListener('keydown', handler)
    const orig = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = orig
    }
  }, [open, submitting, onClose])

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      pending.forEach(p => URL.revokeObjectURL(p.previewUrl))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAddAmenity = () => {
    const trimmed = amenityInput.trim()
    if (!trimmed) return
    if (amenities.includes(trimmed)) {
      setAmenityInput('')
      return
    }
    setAmenities(prev => [...prev, trimmed])
    setAmenityInput('')
  }

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    const newItems: PendingImage[] = Array.from(files).map(file => ({
      id: `${Date.now()}-${file.name}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      uploading: true,
    }))
    setPending(prev => [...prev, ...newItems])
    e.target.value = '' // reset input

    // Upload each in parallel
    newItems.forEach(async (item) => {
      try {
        const formData = new FormData()
        formData.append('file', item.file)
        const res = await api.post('/upload?folder=room-types', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        const url = res.data?.data?.url as string | undefined
        if (!url) throw new Error('No URL returned')
        setPending(prev => prev.map(p => p.id === item.id ? { ...p, uploading: false, uploadedUrl: url } : p))
      } catch {
        setPending(prev => prev.map(p => p.id === item.id ? { ...p, uploading: false, error: 'Upload failed' } : p))
      }
    })
  }

  const removeExisting = (url: string) => {
    setExistingImages(prev => prev.filter(u => u !== url))
  }

  const removePending = (id: string) => {
    setPending(prev => {
      const target = prev.find(p => p.id === id)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter(p => p.id !== id)
    })
  }

  const anyUploading = pending.some(p => p.uploading)

  const handleSubmit = async () => {
    setErrors({})

    const images = [
      ...existingImages,
      ...pending.filter(p => p.uploadedUrl).map(p => p.uploadedUrl as string),
    ]

    const payload = {
      name: name.trim(),
      description: description.trim(),
      capacity: Number(capacity),
      amenities,
      basePrice: Number(basePrice),
      weekendMultiplier: Number(weekendMultiplier),
      tag: tag.trim() || undefined,
      images,
    }

    const result = schema.safeParse(payload)
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const path = issue.path.join('.')
        fieldErrors[path] = issue.message
      }
      setErrors(fieldErrors)
      toast.error('Please fix the highlighted fields')
      return
    }

    if (pending.some(p => p.error)) {
      toast.error('Remove failed uploads before saving')
      return
    }

    setSubmitting(true)
    try {
      const body = {
        ...payload,
        // Keep first image as the "hero" (existing behavior relies on `image` field sometimes)
        image: images[0] || undefined,
      }
      if (editing && initial) {
        await api.patch(`/rooms/types/${initial.slug}`, body)
        toast.success('Room type updated')
      } else {
        await api.post('/rooms/types', body)
        toast.success('Room type created')
      }
      onSaved()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Save failed'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-foreground/50 backdrop-blur-sm animate-modal-backdrop" onClick={submitting ? undefined : onClose} />

      <div className="relative w-full max-w-3xl bg-foreground-inverse rounded-2xl shadow-2xl max-h-[92vh] overflow-hidden flex flex-col animate-modal-content">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-foreground font-heading font-bold text-lg">
              {editing ? 'Edit Room Type' : 'New Room Type'}
            </h2>
            <p className="text-foreground-tertiary text-xs">
              {editing ? 'Update details, amenities, pricing, and images' : 'Add a new room category to the inventory'}
            </p>
          </div>
          <button onClick={onClose} disabled={submitting} className="p-2 text-foreground-tertiary hover:text-foreground">
            <HiOutlineX size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Basic info */}
          <div className="grid vsm:grid-cols-2 gap-4">
            <Field label="Name" error={errors.name}>
              <input value={name} onChange={e => setName(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none bg-transparent focus:ring-2 focus:ring-foreground/20" placeholder="e.g. Deluxe Suite" />
            </Field>
            <Field label="Tag (optional)">
              <input value={tag} onChange={e => setTag(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none bg-transparent focus:ring-2 focus:ring-foreground/20" placeholder="e.g. Most Popular" />
            </Field>
          </div>

          <Field label="Description" error={errors.description}>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="input resize-none"
              placeholder="Spacious room with skyline views..."
            />
          </Field>

          <div className="grid vsm:grid-cols-3 gap-4">
            <Field label="Capacity" error={errors.capacity}>
              <div className="flex items-center gap-2 border border-border rounded-lg px-2 py-1">
                <button type="button" onClick={() => setCapacity(Math.max(1, capacity - 1))} className="p-1.5 text-foreground-tertiary hover:text-foreground">
                  <HiOutlineMinus size={14} />
                </button>
                <input
                  type="number"
                  value={capacity}
                  onChange={e => setCapacity(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
                  className="w-full text-center text-sm outline-none bg-transparent"
                />
                <button type="button" onClick={() => setCapacity(Math.min(10, capacity + 1))} className="p-1.5 text-foreground-tertiary hover:text-foreground">
                  <HiOutlinePlus size={14} />
                </button>
              </div>
            </Field>
            <Field label="Base Price" error={errors.basePrice}>
              <div className="flex items-center border border-border rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-foreground/20">
                <span className="text-foreground-tertiary text-sm mr-1">₦</span>
                <input
                  type="number"
                  value={basePrice}
                  onChange={e => setBasePrice(e.target.value)}
                  className="w-full text-sm outline-none bg-transparent"
                  placeholder="150000"
                />
              </div>
            </Field>
            <Field label="Weekend Multiplier" error={errors.weekendMultiplier}>
              <input
                type="number"
                step="0.1"
                min="1"
                value={weekendMultiplier}
                onChange={e => setWeekendMultiplier(e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none bg-transparent focus:ring-2 focus:ring-foreground/20"
                placeholder="1.2"
              />
            </Field>
          </div>

          {/* Amenities */}
          <Field label="Amenities" error={errors.amenities}>
            <div className="flex gap-2">
              <input
                value={amenityInput}
                onChange={e => setAmenityInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddAmenity() } }}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none bg-transparent focus:ring-2 focus:ring-foreground/20"
                placeholder="WiFi, Mini Bar, Ocean View..."
              />
              <button type="button" onClick={handleAddAmenity} className="bg-[#0B1B3A] text-white rounded-lg px-3 text-sm font-medium hover:opacity-90">
                Add
              </button>
            </div>
            {amenities.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {amenities.map((a, i) => (
                  <span key={a + i} className="flex items-center gap-1.5 bg-foreground-disabled/10 text-foreground text-xs px-2 py-1 rounded-full">
                    {a}
                    <button type="button" onClick={() => setAmenities(prev => prev.filter((_, idx) => idx !== i))} className="text-foreground-tertiary hover:text-danger">
                      <HiOutlineX size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </Field>

          {/* Images */}
          <div>
            <label className="text-foreground-tertiary text-[11px] uppercase tracking-wider font-semibold mb-2 block">
              Images
            </label>
            <label className="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg py-6 cursor-pointer hover:bg-foreground-disabled/5 transition-colors">
              <HiOutlinePhotograph size={20} className="text-foreground-tertiary" />
              <span className="text-foreground-secondary text-sm">Click to upload images</span>
              <input type="file" accept="image/*" multiple onChange={handleFilesSelected} className="hidden" />
            </label>

            {(existingImages.length > 0 || pending.length > 0) && (
              <div className="grid grid-cols-3 vsm:grid-cols-4 gap-2 mt-3">
                {existingImages.map(url => (
                  <div key={url} className="relative aspect-square rounded-lg overflow-hidden border border-border bg-foreground-disabled/10 group">
                    <Image src={url} alt="" fill className="object-cover" sizes="(max-width: 640px) 33vw, 25vw" />
                    <button
                      type="button"
                      onClick={() => removeExisting(url)}
                      className="absolute top-1 right-1 p-1 bg-foreground/70 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <HiOutlineTrash size={12} />
                    </button>
                  </div>
                ))}
                {pending.map(p => (
                  <div key={p.id} className="relative aspect-square rounded-lg overflow-hidden border border-border bg-foreground-disabled/10 group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.previewUrl} alt="" className="w-full h-full object-cover" />
                    {p.uploading && (
                      <div className="absolute inset-0 bg-foreground/50 flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                    {p.error && (
                      <div className="absolute inset-0 bg-danger/80 flex items-center justify-center">
                        <span className="text-white text-[10px] font-medium text-center px-1">{p.error}</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removePending(p.id)}
                      className="absolute top-1 right-1 p-1 bg-foreground/70 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <HiOutlineTrash size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border bg-background-secondary">
          <p className="text-foreground-tertiary text-xs">
            {anyUploading ? 'Uploading images...' : `${existingImages.length + pending.filter(p => p.uploadedUrl).length} image(s) ready`}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={submitting}
              className="border border-border rounded-lg px-4 py-2 text-sm text-foreground hover:bg-foreground-disabled/5"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || anyUploading}
              className="bg-[#0B1B3A] text-white rounded-lg px-5 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
            >
              {submitting && <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
              {submitting ? 'Saving' : editing ? 'Save Changes' : 'Create Room Type'}
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-foreground-tertiary text-[11px] uppercase tracking-wider font-semibold">{label}</label>
      {children}
      {error && <p className="text-danger text-xs">{error}</p>}
    </div>
  )
}

export default RoomTypeFormModal
