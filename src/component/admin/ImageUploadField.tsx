'use client'
import React, { useRef, useState } from 'react'
import Image from 'next/image'
import { HiOutlinePhotograph, HiOutlineX } from 'react-icons/hi'
import { api } from '@/lib/api'
import { toast } from 'sonner'

interface Props {
  /** Current image URL (from DB or just uploaded) */
  value: string
  /** Called with the new Cloudinary URL or empty string on remove */
  onChange: (url: string) => void
  /** Cloudinary folder e.g. "services" or "room-service" */
  folder: string
  /** Label above the field */
  label?: string
  disabled?: boolean
}

const ImageUploadField = ({
  value,
  onChange,
  folder,
  label = 'Image',
  disabled = false,
}: Props) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are allowed')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5 MB')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.post(`/upload?folder=${folder}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const url = res.data.data.url as string
      onChange(url)
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div>
      <label className="text-foreground-tertiary text-[11px] uppercase tracking-wider font-semibold">
        {label} <span className="normal-case text-foreground-tertiary">(optional)</span>
      </label>

      {value ? (
        /* Preview */
        <div className="mt-1.5 relative group rounded-xl overflow-hidden border border-border h-36">
          <Image src={value} alt="Preview" fill className="object-cover" />
          <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/40 transition-colors flex items-center justify-center">
            <button
              type="button"
              onClick={() => onChange('')}
              disabled={disabled || uploading}
              className="opacity-0 group-hover:opacity-100 transition-opacity bg-foreground-inverse text-foreground p-2 rounded-full shadow-lg hover:bg-danger-bg hover:text-danger"
              title="Remove image"
            >
              <HiOutlineX size={16} />
            </button>
          </div>
        </div>
      ) : (
        /* Drop zone */
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          disabled={disabled || uploading}
          className="mt-1.5 w-full h-28 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-1.5 hover:border-foreground/30 hover:bg-foreground-disabled/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <>
              <span className="w-5 h-5 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
              <span className="text-foreground-tertiary text-xs">Uploading…</span>
            </>
          ) : (
            <>
              <HiOutlinePhotograph size={22} className="text-foreground-tertiary" />
              <span className="text-foreground-secondary text-xs font-medium">
                Click or drag to upload
              </span>
              <span className="text-foreground-tertiary text-[10px]">PNG, JPG up to 5 MB</span>
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}

export default ImageUploadField
