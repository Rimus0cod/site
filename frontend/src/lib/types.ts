export type BookingStatus = "pending" | "confirmed" | "canceled" | "completed";
export type BookingHoldStatus =
  | "created"
  | "payment_pending"
  | "paid"
  | "converted"
  | "expired"
  | "released"
  | "failed";
export type BookingPaymentStatus =
  | "unpaid"
  | "partially_paid"
  | "paid"
  | "refunded"
  | "partial_refund";
export type PaymentPolicy =
  | "offline"
  | "deposit_fixed"
  | "deposit_percent"
  | "full_prepayment";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded" | "partial_refund";

export interface Barber {
  id: string;
  name: string;
  photoUrl?: string | null;
  bio?: string | null;
  isActive: boolean;
}

export interface Service {
  id: string;
  name: string;
  description?: string | null;
  price: string;
  durationMin: number;
  paymentPolicy: PaymentPolicy;
  depositValue?: string | null;
  isActive: boolean;
}

export interface Booking {
  id: string;
  bookingHoldId?: string | null;
  clientAccountId?: string | null;
  barberId: string;
  serviceId: string;
  source?: "site" | "admin" | "telegram";
  clientName: string;
  clientPhone: string;
  clientTelegramUsername?: string | null;
  startTime: string;
  endTime: string;
  priceSnapshot?: string;
  depositAmount?: string;
  currency?: string;
  paymentStatus?: BookingPaymentStatus;
  status: BookingStatus;
  notes?: string | null;
  cancellationReason?: string | null;
  canceledAt?: string | null;
  completedAt?: string | null;
  managementToken?: string;
  createdAt?: string;
  updatedAt?: string;
  barber?: Barber;
  service?: Service;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface AdminBookingsResponse {
  data: Booking[];
  meta: PaginationMeta;
}

export interface AdminAuditLogEntry {
  id: string;
  adminId?: string | null;
  adminEmail: string;
  action: string;
  resource: string;
  resourceId?: string | null;
  summary: string;
  requestId?: string | null;
  ip?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface AdminAuditLogsResponse {
  data: AdminAuditLogEntry[];
  meta: PaginationMeta;
}

export interface BookingHold {
  id: string;
  clientAccountId?: string | null;
  barberId: string;
  serviceId: string;
  clientName: string;
  clientPhone: string;
  clientTelegramUsername?: string | null;
  startTime: string;
  endTime: string;
  priceSnapshot: string;
  depositAmount: string;
  currency: string;
  notes?: string | null;
  status: BookingHoldStatus;
  paymentProvider?: string | null;
  expiresAt: string;
  convertedBookingId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  paymentRequired: boolean;
  accessToken?: string;
  activePayment?: {
    id: string;
    status: PaymentStatus;
    provider: string;
    amount: string;
    currency: string;
    createdAt: string;
  } | null;
  barber?: Barber;
  service?: Service;
}

export interface CheckoutSession {
  holdId: string;
  bookingId?: string | null;
  holdStatus: BookingHoldStatus;
  expiresAt: string;
  paymentRequired: boolean;
  provider?: string | null;
  redirect?: {
    url: string;
    method: "GET" | "POST";
    fields?: Record<string, string>;
  } | null;
  payment?: {
    id: string;
    status: PaymentStatus;
    provider: string;
    amount: string;
    currency: string;
    createdAt: string;
  } | null;
}

export interface SlotsResponse {
  date: string;
  barberId: string;
  serviceDuration: number;
  slots: string[];
}

export interface ScheduleDay {
  id?: string;
  dayOfWeek: number;
  startTime?: string | null;
  endTime?: string | null;
  isDayOff?: boolean;
}

export interface ScheduleResponse {
  barberId: string;
  days: ScheduleDay[];
}

export interface ScheduleException {
  id?: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  isDayOff?: boolean;
  note?: string | null;
}

export interface ScheduleExceptionsResponse {
  barberId: string;
  exceptions: ScheduleException[];
}

export interface AdminUser {
  id: string;
  email: string;
  role: string;
}

export interface ClientUser {
  id: string;
  phone: string;
  name: string;
  telegramUsername?: string | null;
}
