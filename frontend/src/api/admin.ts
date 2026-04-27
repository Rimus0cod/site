import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, prepareAdminCsrfToken } from "../lib/api-client";
import { normalizeTimeValue } from "../lib/utils";
import type {
  AdminAuditLogsResponse,
  AdminUser,
  ScheduleException,
  ScheduleExceptionsResponse,
  ScheduleResponse,
} from "../lib/types";

interface LoginResponse {
  admin: AdminUser;
}

interface MeResponse {
  admin: AdminUser;
}

export function useLogin() {
  return useMutation({
    mutationFn: async (payload: { email: string; password: string }) => {
      await prepareAdminCsrfToken();
      const { data } = await apiClient.post<LoginResponse>("/auth/login", payload);
      return data;
    },
  });
}

export function useMe(enabled = true) {
  return useQuery({
    queryKey: ["auth", "me"],
    enabled,
    retry: false,
    queryFn: async () => {
      const { data } = await apiClient.get<MeResponse>("/auth/me");
      return data;
    },
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      await prepareAdminCsrfToken();
      const { data } = await apiClient.post<{ success: true }>("/auth/logout");
      return data;
    },
  });
}

export function useAdminAuditLogs(filters?: { page?: number; limit?: number; resource?: string }) {
  return useQuery({
    queryKey: ["admin", "audit-logs", filters],
    queryFn: async () => {
      const { data } = await apiClient.get<AdminAuditLogsResponse>("/admin/audit-logs", {
        params: {
          page: filters?.page ?? 1,
          limit: filters?.limit ?? 10,
          resource: filters?.resource || undefined,
        },
      });
      return data;
    },
  });
}

export function useSchedule(barberId?: string) {
  return useQuery({
    queryKey: ["admin", "schedule", barberId],
    enabled: Boolean(barberId),
    queryFn: async () => {
      const { data } = await apiClient.get<ScheduleResponse>(`/admin/barbers/${barberId}/schedule`);
      return data;
    },
  });
}

export function useScheduleExceptions(barberId?: string) {
  return useQuery({
    queryKey: ["admin", "schedule-exceptions", barberId],
    enabled: Boolean(barberId),
    queryFn: async () => {
      const { data } = await apiClient.get<ScheduleExceptionsResponse>(
        `/admin/barbers/${barberId}/schedule/exceptions`,
      );
      return data;
    },
  });
}

export function useSaveSchedule(barberId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { days: ScheduleResponse["days"] }) => {
      const normalizedPayload = {
        days: payload.days.map((day) => ({
          dayOfWeek: day.dayOfWeek,
          startTime: day.isDayOff ? undefined : normalizeTimeValue(day.startTime) ?? undefined,
          endTime: day.isDayOff ? undefined : normalizeTimeValue(day.endTime) ?? undefined,
          isDayOff: Boolean(day.isDayOff),
        })),
      };

      const { data } = await apiClient.put<ScheduleResponse>(
        `/admin/barbers/${barberId}/schedule`,
        normalizedPayload,
      );
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "schedule", barberId] });
    },
  });
}

export function useSaveScheduleExceptions(barberId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { exceptions: ScheduleException[] }) => {
      const normalizedPayload = {
        exceptions: payload.exceptions.map((exception) => ({
          date: exception.date,
          startTime: exception.isDayOff ? undefined : normalizeTimeValue(exception.startTime) ?? undefined,
          endTime: exception.isDayOff ? undefined : normalizeTimeValue(exception.endTime) ?? undefined,
          isDayOff: Boolean(exception.isDayOff),
          note: exception.note?.trim() || undefined,
        })),
      };

      const { data } = await apiClient.put<ScheduleExceptionsResponse>(
        `/admin/barbers/${barberId}/schedule/exceptions`,
        normalizedPayload,
      );
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["admin", "schedule-exceptions", barberId],
      });
    },
  });
}
