import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/api-client";
import type { AdminUser, ScheduleResponse } from "../lib/types";

interface LoginResponse {
  accessToken: string;
  admin: AdminUser;
}

export function useLogin() {
  return useMutation({
    mutationFn: async (payload: { email: string; password: string }) => {
      const { data } = await apiClient.post<LoginResponse>("/auth/login", payload);
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

export function useSaveSchedule(barberId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { days: ScheduleResponse["days"] }) => {
      const { data } = await apiClient.put<ScheduleResponse>(
        `/admin/barbers/${barberId}/schedule`,
        payload,
      );
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "schedule", barberId] });
    },
  });
}

