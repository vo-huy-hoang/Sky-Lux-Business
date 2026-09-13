// Common Enums for Sky-Lux CRM

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  LOCKED = 'LOCKED',
}

export enum RoleScope {
  OWN = 'OWN',
  TEAM = 'TEAM',
  ALL = 'ALL',
}

export enum CustomerType {
  INDIVIDUAL = 'INDIVIDUAL',
  COMPANY = 'COMPANY',
  ORGANIZATION = 'ORGANIZATION',
}

export enum CustomerActivityType {
  CALL = 'CALL',
  QUOTE_SENT = 'QUOTE_SENT',
  CUSTOMER_RESPONSE = 'CUSTOMER_RESPONSE',
  BROCHURE_SENT = 'BROCHURE_SENT',
  NOTE = 'NOTE',
  CUSTOMER_CREATED = 'CUSTOMER_CREATED',
  CUSTOMER_UPDATED = 'CUSTOMER_UPDATED',
  CUSTOMER_DELETED = 'CUSTOMER_DELETED',
  DOSSIER_CREATED = 'DOSSIER_CREATED',
  DOSSIER_UPDATED = 'DOSSIER_UPDATED',
}

export enum DossierStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  IN_REVIEW = 'IN_REVIEW',
  NEED_CHANGES = 'NEED_CHANGES',
  RESUBMITTED = 'RESUBMITTED',
  APPROVED = 'APPROVED',
  COMPLETED = 'COMPLETED',
  LOCKED = 'LOCKED',
  CANCELLED = 'CANCELLED',
}

export enum PriorityLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum EstimateStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  IN_REVIEW = 'IN_REVIEW',
  NEED_CHANGES = 'NEED_CHANGES',
  APPROVED = 'APPROVED',
  SUPERSEDED = 'SUPERSEDED',
  REJECTED = 'REJECTED',
}

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CHANGES_REQUESTED = 'CHANGES_REQUESTED',
}

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING = 'WAITING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentDirection {
  CUSTOMER_RECEIPT = 'CUSTOMER_RECEIPT',
  SUPPLIER_PAYMENT = 'SUPPLIER_PAYMENT',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
}

export enum PaymentMethod {
  BANK_TRANSFER = 'BANK_TRANSFER',
  CASH = 'CASH',
  CREDIT_CARD = 'CREDIT_CARD',
  OTHER = 'OTHER',
}

export enum ConversationType {
  DIRECT = 'DIRECT',
  GROUP = 'GROUP',
  DOSSIER = 'DOSSIER',
}

export enum ParticipantRole {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

export enum MessageType {
  TEXT = 'TEXT',
  FILE = 'FILE',
  IMAGE = 'IMAGE',
  SYSTEM = 'SYSTEM',
}

export enum ImportSessionStatus {
  UPLOADED = 'UPLOADED',
  PROCESSING = 'PROCESSING',
  READY_FOR_REVIEW = 'READY_FOR_REVIEW',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
}

export enum ImportErrorSeverity {
  WARNING = 'WARNING',
  ERROR = 'ERROR',
}

export enum KpiMetric {
  REVENUE = 'REVENUE',
  PROFIT = 'PROFIT',
  DOSSIER_COUNT = 'DOSSIER_COUNT',
  CLOSE_RATE = 'CLOSE_RATE',
}

export enum KpiPeriodType {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
}

export enum AccountingPeriodStatus {
  OPEN = 'OPEN',
  LOCKED = 'LOCKED',
}
