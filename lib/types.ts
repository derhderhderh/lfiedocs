// ==========================================
// LifeDocs Family - Firestore Schema Types
// ==========================================

export type UserRole = "family_manager" | "parent" | "family_member"

export type SubscriptionPlan = "basic" | "extended"
export type SubscriptionStatus = "active" | "past_due" | "canceled" | "trialing"

export type DocumentCategory =
  | "id"
  | "insurance"
  | "medical"
  | "legal"
  | "financial"
  | "property"
  | "warranties"
  | "other"

export type EmergencyTriggerType = "death" | "medical_incapacity" | "emergency_access"
export type EmergencyStatus = "active" | "resolved"

// ==========================================
// Firestore Collections
// ==========================================

export interface Family {
  id: string
  name: string
  createdAt: Date
  createdBy: string // userId of Family Manager
  memberCount: number
  maxMembers: number
  subscriptionId?: string
  stripeCustomerId?: string
}

export interface FamilyUser {
  id: string
  email: string
  displayName: string
  familyId: string
  role: UserRole
  createdAt: Date
  updatedAt: Date
  hasCompletedOnboarding: boolean
  twoFactorEnabled: boolean
  lastLoginAt?: Date
}

export interface Document {
  id: string
  familyId: string
  ownerUserId: string
  ownerName: string
  title: string
  description?: string
  category: DocumentCategory
  fileUrl?: string
  fileName?: string
  fileSize?: number
  mimeType?: string
  expirationDate?: Date
  reminderSent?: boolean
  createdAt: Date
  updatedAt: Date
  isEmergencyVault: boolean // If true, only accessible after emergency trigger
  metadata?: Record<string, unknown>
}

export interface TrustedContact {
  id: string
  familyId: string
  addedByUserId: string
  addedByUserName: string
  fullName: string
  email: string
  relationship?: string
  createdAt: Date
  notifiedAt?: Date
  hasEmergencyAccess: boolean
  emergencyAccessGrantedAt?: Date
  emergencyAccessExpiresAt?: Date
}

export interface EmergencyEvent {
  id: string
  familyId: string
  triggeredByUserId: string
  triggeredByUserName: string
  triggerType: EmergencyTriggerType
  status: EmergencyStatus
  triggeredAt: Date
  resolvedAt?: Date
  resolvedByUserId?: string
  notes?: string
  affectedUserIds: string[] // Users whose data is now accessible
}

export interface AuditLog {
  id: string
  familyId: string
  userId: string
  userName: string
  action: string
  resourceType: "document" | "emergency" | "trusted_contact" | "family" | "user" | "subscription"
  resourceId?: string
  details?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  createdAt: Date
}

export interface Subscription {
  id: string
  familyId: string
  stripeSubscriptionId?: string
  stripeCustomerId?: string
  plan: SubscriptionPlan
  status: SubscriptionStatus
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
  createdAt: Date
  updatedAt: Date
}

// ==========================================
// Form Types
// ==========================================

export interface SignUpFormData {
  email: string
  password: string
  confirmPassword: string
  displayName: string
  familyName: string
}

export interface SignInFormData {
  email: string
  password: string
}

export interface TrustedContactFormData {
  fullName: string
  email: string
  relationship?: string
}

export interface DocumentFormData {
  title: string
  description?: string
  category: DocumentCategory
  expirationDate?: string
  isEmergencyVault: boolean
  file?: File
}

export interface FamilyMemberFormData {
  email: string
  displayName: string
  role: "parent" | "family_member"
  tempPassword: string
}

// ==========================================
// API Response Types
// ==========================================

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// ==========================================
// UI State Types
// ==========================================

export interface AuthState {
  user: FamilyUser | null
  family: Family | null
  isLoading: boolean
  isAuthenticated: boolean
}

export const DOCUMENT_CATEGORIES: { value: DocumentCategory; label: string }[] = [
  { value: "id", label: "Identification" },
  { value: "insurance", label: "Insurance" },
  { value: "medical", label: "Medical" },
  { value: "legal", label: "Legal" },
  { value: "financial", label: "Financial" },
  { value: "property", label: "Property" },
  { value: "warranties", label: "Warranties" },
  { value: "other", label: "Other" },
]

export const PRICING = {
  basic: {
    price: 7.99,
    maxMembers: 4,
    label: "Basic Plan",
    description: "Up to 4 family members",
  },
  extended: {
    price: 9.99,
    maxMembers: 999,
    label: "Extended Plan",
    description: "5+ family members",
  },
} as const
