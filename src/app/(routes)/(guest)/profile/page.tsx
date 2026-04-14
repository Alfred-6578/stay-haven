'use client'
import React, { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import Button from '@/component/ui/Button'
import { HiOutlineCamera } from 'react-icons/hi'
import Image from 'next/image'

interface ProfileData {
  user: {
    id: string; firstName: string; lastName: string; email: string;
    phone: string | null; avatar: string | null
  }
  guestProfile: {
    dateOfBirth: string | null; nationality: string | null; address: string | null;
    idType: string | null; idNumber: string | null;
    preferences: Record<string, boolean>
  } | null
}

const prefOptions = [
  { key: 'extraPillows', label: 'Extra Pillows' },
  { key: 'highFloor', label: 'High Floor' },
  { key: 'quietRoom', label: 'Quiet Room' },
  { key: 'lateCheckout', label: 'Late Checkout' },
]

export default function ProfilePage() {
  const { setUser } = useAuth()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Form state
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [nationality, setNationality] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [address, setAddress] = useState('')
  const [idType, setIdType] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [prefs, setPrefs] = useState<Record<string, boolean>>({})

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/guest/profile')
        const data: ProfileData = res.data.data
        setProfile(data)
        setFirstName(data.user.firstName)
        setLastName(data.user.lastName)
        setPhone(data.user.phone || '')
        setNationality(data.guestProfile?.nationality || '')
        setDateOfBirth(data.guestProfile?.dateOfBirth?.split('T')[0] || '')
        setAddress(data.guestProfile?.address || '')
        setIdType(data.guestProfile?.idType || '')
        setIdNumber(data.guestProfile?.idNumber || '')
        setPrefs(data.guestProfile?.preferences as Record<string, boolean> || {})
      } catch {}
      setLoading(false)
    })()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const res = await api.patch('/guest/profile', {
        firstName, lastName, phone: phone || undefined,
        nationality: nationality || undefined,
        dateOfBirth: dateOfBirth || undefined,
        address: address || undefined,
        idType: idType || undefined,
        idNumber: idNumber || undefined,
        preferences: prefs,
      })
      setProfile(prev => prev ? { ...prev, user: { ...prev.user, firstName, lastName, phone } } : prev)
      setUser(res.data.data)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {}
    setSaving(false)
  }

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.patch('/guest/profile/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setProfile(prev => prev ? { ...prev, user: { ...prev.user, avatar: res.data.data.avatarUrl } } : prev)
    } catch {}
    setUploading(false)
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 w-48 bg-foreground-disabled/15 rounded mb-8" />
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="h-48 bg-foreground-disabled/10 rounded-2xl" />
          <div className="lg:col-span-2 h-96 bg-foreground-disabled/10 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-foreground font-heading text-2xl font-bold mb-6">My Profile</h1>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Avatar */}
        <div className="border border-border rounded-2xl p-6 flex flex-col items-center">
          <div className="relative group mb-4">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-foreground-disabled/15 flex items-center justify-center text-foreground font-bold text-2xl">
              {profile?.user.avatar ? (
                <Image src={profile.user.avatar} alt="" fill className="object-cover rounded-full" />
              ) : (
                <span>{profile?.user.firstName?.charAt(0)}{profile?.user.lastName?.charAt(0)}</span>
              )}
            </div>
            <label className="absolute inset-0 rounded-full bg-foreground/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              {uploading ? (
                <div className="w-5 h-5 border-2 border-foreground-inverse border-t-transparent rounded-full animate-spin" />
              ) : (
                <HiOutlineCamera size={20} className="text-foreground-inverse" />
              )}
              <input type="file" accept="image/*" onChange={handleAvatar} className="hidden" />
            </label>
          </div>
          <p className="text-foreground font-semibold">{profile?.user.firstName} {profile?.user.lastName}</p>
          <p className="text-foreground-tertiary text-sm">{profile?.user.email}</p>
        </div>

        {/* Form */}
        <div className="lg:col-span-2 border border-border rounded-2xl p-5 vsm:p-6">
          <h3 className="text-foreground font-semibold text-sm mb-5">Personal Information</h3>
          <div className="grid grid-cols-1 vsm:grid-cols-2 gap-4 mb-6">
            {[
              { label: 'First Name', value: firstName, setter: setFirstName, type: 'text' },
              { label: 'Last Name', value: lastName, setter: setLastName, type: 'text' },
              { label: 'Email', value: profile?.user.email || '', setter: () => {}, type: 'email', disabled: true },
              { label: 'Phone', value: phone, setter: setPhone, type: 'tel' },
              { label: 'Nationality', value: nationality, setter: setNationality, type: 'text' },
              { label: 'Date of Birth', value: dateOfBirth, setter: setDateOfBirth, type: 'date' },
              { label: 'ID Type', value: idType, setter: setIdType, type: 'text', placeholder: 'e.g. Passport, NIN' },
              { label: 'ID Number', value: idNumber, setter: setIdNumber, type: 'text' },
            ].map(field => (
              <div key={field.label} className="flex flex-col gap-1.5">
                <label className="text-foreground-tertiary text-xs font-semibold uppercase tracking-wider">{field.label}</label>
                <input
                  type={field.type}
                  value={field.value}
                  onChange={(e) => field.setter(e.target.value)}
                  disabled={'disabled' in field && field.disabled}
                  placeholder={('placeholder' in field ? field.placeholder : '') as string}
                  className="border border-border rounded-lg px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-foreground/20 disabled:bg-foreground-disabled/5 disabled:text-foreground-tertiary"
                />
              </div>
            ))}
            <div className="vsm:col-span-2 flex flex-col gap-1.5">
              <label className="text-foreground-tertiary text-xs font-semibold uppercase tracking-wider">Address</label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                className="border border-border rounded-lg px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-foreground/20 resize-none"
              />
            </div>
          </div>

          {/* Preferences */}
          <h3 className="text-foreground font-semibold text-sm mb-3 pt-4 border-t border-border">Preferences</h3>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {prefOptions.map(opt => (
              <label key={opt.key} className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!prefs[opt.key]}
                  onChange={(e) => setPrefs(prev => ({ ...prev, [opt.key]: e.target.checked }))}
                  className="w-4 h-4 rounded border-border text-foreground focus:ring-foreground"
                />
                <span className="text-foreground text-sm">{opt.label}</span>
              </label>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleSave} loading={saving}>
              Save Changes
            </Button>
            {saved && <span className="text-success text-sm">Saved!</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
