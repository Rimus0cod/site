import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/api-client";
import type { Booking, BookingStatus, SlotsResponse } from "../lib/types";

export interface CreateBookingPayload {
  barberId: string;
  serviceId: string;
  clientName: string;
  clientPhone: string;
  clientTelegramUsername?: string;
  startTime: string;
  notes?: string;
  website?: string;
}

export function useSlots(barberId?: string, date?: string, serviceId?: string) {
  return useQuery({
    queryKey: ["slots", barberId, date, serviceId],
    enabled: Boolean(barberId && date && serviceId),
    queryFn: async () => {
      const { data } = await apiClient.get<SlotsResponse>(`/barbers/${barberId}/slots`, {
        params: { date, serviceId },
      });
      return data;
    },
  });
}

interface BookingLookupFilters {
  date?: string;
  barberId?: string;
  status?: BookingStatus | "";
  search?: string;
}

export function useCreateBooking() {
  return useMutation({
    mutationFn: async (payload: CreateBookingPayload) => {
      const { data } = await apiClient.post<Booking>("/bookings", payload);
      return data;
    },
  });
}

export function useBooking(id?: string, token?: string) {
  return useQuery({
    queryKey: ["booking", id, token],
    enabled: Boolean(id && token),
    queryFn: async () => {
      const { data } = await apiClient.get<Booking>(`/bookings/${id}`, {
        params: { token },
      });
      return data;
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; token: string; reason?: string }) => {
      const { data } = await apiClient.post<Booking>(`/bookings/${payload.id}/cancel`, {
        token: payload.token,
        reason: payload.reason,
      });
      return data;
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["booking", data.id] });
    },
  });
}

export function useRescheduleBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; token: string; startTime: string }) => {
      const { data } = await apiClient.patch<Booking>(`/bookings/${payload.id}/reschedule`, payload);
      return data;
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["booking", data.id] });
    },
  });
}

export function useAdminBookings(filters?: BookingLookupFilters) {
  return useQuery({
    queryKey: ["admin", "bookings", filters],
    queryFn: async () => {
      const { data } = await apiClient.get<Booking[]>("/admin/bookings", {
        params: {
          date: filters?.date || undefined,
          barberId: filters?.barberId || undefined,
          status: filters?.status || undefined,
          search: filters?.search || undefined,
        },
      });
      return data;
    },
  });
}

export function useAdminCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateBookingPayload & { status?: BookingStatus }) => {
      const { data } = await apiClient.post<Booking>("/admin/bookings", payload);
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "bookings"] });
    },
  });
}

export function useUpdateBookingStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; status: BookingStatus }) => {
      const { data } = await apiClient.patch<Booking>(`/admin/bookings/${payload.id}/status`, {
        status: payload.status,
      });
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "bookings"] });
    },
  });
}
