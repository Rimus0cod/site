import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/api-client";
import type { Barber } from "../lib/types";

export function useBarbers() {
  return useQuery({
    queryKey: ["barbers"],
    queryFn: async () => {
      const { data } = await apiClient.get<Barber[]>("/barbers");
      return data;
    },
  });
}

export function useAdminBarbers() {
  return useQuery({
    queryKey: ["admin", "barbers"],
    queryFn: async () => {
      const { data } = await apiClient.get<Barber[]>("/admin/barbers");
      return data;
    },
  });
}

export function useCreateBarber() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Barber>) => {
      const { data } = await apiClient.post<Barber>("/admin/barbers", payload);
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "barbers"] });
      await queryClient.invalidateQueries({ queryKey: ["barbers"] });
    },
  });
}

export function useUpdateBarber() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Barber> & { id: string }) => {
      const { id, ...body } = payload;
      const { data } = await apiClient.patch<Barber>(`/admin/barbers/${id}`, body);
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "barbers"] });
      await queryClient.invalidateQueries({ queryKey: ["barbers"] });
    },
  });
}
