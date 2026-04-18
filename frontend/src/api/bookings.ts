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

export function useCreateBooking() {
  return useMutation({
    mutationFn: async (payload: CreateBookingPayload) => {
      const { data } = await apiClient.post<Booking>("/bookings", payload);
      return data;
    },
  });
}

export function useBooking(id?: string) {
  return useQuery({
    queryKey: ["booking", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await apiClient.get<Booking>(`/bookings/${id}`);
      return data;
    },
  });
}

export function useAdminBookings(date?: string) {
  return useQuery({
    queryKey: ["admin", "bookings", date],
    queryFn: async () => {
      const { data } = await apiClient.get<Booking[]>("/admin/bookings", {
        params: date ? { date } : undefined,
      });
      return data;
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
