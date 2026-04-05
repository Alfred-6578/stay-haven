// types/index.ts
export type UserRole = 'GUEST' | 'STAFF' | 'MANAGER' | 'ADMIN'
export type LoyaltyTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM'
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED' | 'NO_SHOW'
export type RoomStatus = 'AVAILABLE' | 'OCCUPIED' | 'CLEANING' | 'MAINTENANCE'
export type NotificationType = 'BOOKING_CONFIRMED' | 'BOOKING_CANCELLED' | 'CHECK_IN_REMINDER' | 'OVERSTAY_WARNING' | 'PAYMENT_SUCCESS' | 'ROOM_SERVICE_UPDATE' | 'POINTS_EARNED' | 'UPGRADE_APPROVED' | 'EXTENSION_APPROVED' | 'GENERAL'
export type StaffDepartment = 'FRONT_DESK' | 'HOUSEKEEPING' | 'MANAGEMENT'


export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  avatar?: string
  role: UserRole
  isActive: boolean
  createdAt: string
  updatedAt: string
  guestProfile?: GuestProfile
  staffProfile?: StaffProfile
}

export interface GuestProfile {
  id: string
  userId: string
  idType?: string
  idNumber?: string
  dateOfBirth?: string
  nationality?: string
  address?: string
  preferences: Record<string, any>
  loyaltyTier: LoyaltyTier
  totalPoints: number
  lifetimePoints: number
  totalStays: number
  totalSpend: number
}

export interface StaffProfile {
  id: string
  userId: string
  staffNumber: string
  department: StaffDepartment
  isOnDuty: boolean
  hiredAt: string
  createdAt: string
  updatedAt: string
}

export interface RoomType {
  id: string
  name: string
  slug: string
  description: string
  capacity: number
  amenities: string[]
  basePrice: number
  weekendMultiplier: number
  images: string[]
  isActive: boolean
}

export interface Room {
  id: string
  number: string
  floor: number
  roomTypeId: string
  roomType: RoomType
  status: RoomStatus
  notes?: string
}

export interface Booking {
  id: string
  bookingRef: string
  guestId: string
  roomId: string
  checkIn: string
  checkOut: string
  adults: number
  children: number
  totalNights: number
  baseAmount: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
  pointsUsed: number
  status: BookingStatus
  specialRequests?: string
  checkInAt?: string
  checkOutAt?: string
  createdAt: string
  room?: Room
  payment?: Payment
}

export interface Payment {
  id: string
  bookingId?: string
  reference: string
  amount: number
  currency: string
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED'
  createdAt: string
}

export interface Notification {
  id: string
  userId: string
  title: string
  message: string
  type: NotificationType
  isRead: boolean
  metadata?: Record<string, any>
  createdAt: string
}

export interface LoyaltyTransaction {
  id: string
  guestId: string
  points: number
  type: 'EARNED' | 'REDEEMED'
  description: string
  bookingId?: string
  createdAt: string
}

export interface RoomServiceOrder {
  id: string
  bookingId: string
  guestId: string
  items: Array<{itemId: string, name: string, price: number, quantity: number, subtotal: number}>
  totalAmount: number
  status: 'PENDING' | 'PREPARING' | 'DELIVERED' | 'CANCELLED'
  instructions?: string
  estimatedAt?: string
  deliveredAt?: string
  createdAt: string
}

export interface HotelService {
  id: string
  name: string
  description: string
  price: number
  category: 'FOOD' | 'BEVERAGE' | 'LAUNDRY' | 'SPA' | 'TRANSPORT' | 'OTHER'
  image?: string
  isAvailable: boolean
}

export interface ServiceBooking {
  id: string
  bookingId: string
  guestId: string
  serviceId: string
  service?: HotelService
  scheduledAt: string
  amount: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  notes?: string
  createdAt: string
}

export interface RoomUpgradeRequest {
  id: string
  bookingId: string
  currentRoomId: string
  requestedTypeId: string
  requestedType?: RoomType
  priceDifference: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
}

export interface StayExtension {
  id: string
  bookingId: string
  originalCheckOut: string
  newCheckOut: string
  additionalNights: number
  additionalAmount: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
}

export interface InviteRecord {
  id: string
  email: string
  token: string
  role: UserRole
  department?: StaffDepartment
  invitedById: string
  usedAt?: string
  expiresAt: string
  createdAt: string
  status?: 'pending' | 'used' | 'expired'
}

// API response wrapper
export interface ApiResponse<T> {
  success: boolean
  message?: string
  data: T
}

export interface PaginatedResponse<T> {
  data: T[]
  currentPage: number
  totalPages: number
  totalItems: number
}
