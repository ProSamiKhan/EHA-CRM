
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  EXECUTIVE = 'EXECUTIVE',
  VIEW_ONLY = 'VIEW_ONLY'
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  isActive?: boolean;
}

export interface Batch {
  id: string;
  name: string;
  maxSeats: number;
  createdAt: number;
}

export enum AdmissionStatus {
  CONFIRMED = 'CONFIRMED',
  DEFERRED = 'DEFERRED',
  CANCELLED = 'CANCELLED'
}

export enum PaymentStatus {
  ADVANCE_PAID = 'ADVANCE_PAID',
  FULLY_PAID = 'FULLY_PAID',
  DEFERRED = 'DEFERRED',
  CANCELLED = 'CANCELLED'
}

export interface PaymentEntry {
  id: string;
  amount: number;
  utr: string;
  screenshot: string; // Base64
  date: number;
  executiveId: string;
  executiveName: string;
}

export interface AuditLog {
  id: string;
  timestamp: number;
  action: string;
  userId: string;
  userName: string;
  details: string;
}

export interface Candidate {
  id: string;
  batchId: string;
  executiveId: string;
  status: AdmissionStatus;
  paymentStatus: PaymentStatus;
  notes?: string;
  personalDetails: {
    fullName: string;
    email: string;
    gender: 'Male' | 'Female';
    dob: { day: string; month: string; year: string };
    qualification: string;
    medium: 'Hindi' | 'English' | 'Urdu';
  };
  contactDetails: {
    callingNumber: string;
    whatsappNumber: string;
    emergencyContact: string;
  };
  addressDetails: {
    country: string;
    address: string;
    state: string;
    city: string;
    pincode: string;
  };
  travelDetails: {
    mode: 'Train' | 'Flight' | 'Bus' | 'None';
    arrivalDate: string;
    arrivalTime: string;
    pickupRequired: boolean;
  };
  documents: {
    aadharCard: string; // Base64
  };
  paymentHistory: PaymentEntry[];
  createdAt: number;
  updatedAt: number;
}
