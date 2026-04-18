export type BookingStatus = "pending" | "confirmed" | "canceled" | "completed";

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
  isActive: boolean;
}

export interface Booking {
  id: string;
  barberId: string;
  serviceId: string;
  clientName: string;
  clientPhone: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  notes?: string | null;
  barber?: Barber;
  service?: Service;
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

export interface AdminUser {
  id: string;
  email: string;
  role: string;
}

