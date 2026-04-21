export type UserRole = "GUEST" | "STAFF" | "MANAGER" | "ADMIN";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  avatar?: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  guestProfile?: GuestProfile | null;
  staffProfile?: StaffProfile | null;
}

export interface GuestProfile {
  id: string;
  userId: string;
  idType?: string | null;
  idNumber?: string | null;
  dateOfBirth?: string | null;
  nationality?: string | null;
  address?: string | null;
  preferences: Record<string, unknown>;
  loyaltyTier: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
  totalPoints: number;
  lifetimePoints: number;
  totalStays: number;
  totalSpend: string | number;
}

export interface StaffProfile {
  id: string;
  userId: string;
  staffNumber: string;
  department: "FRONT_DESK" | "HOUSEKEEPING" | "MANAGEMENT";
  isOnDuty: boolean;
  hiredAt: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
}
