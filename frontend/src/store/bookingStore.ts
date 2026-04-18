import { create } from "zustand";
import type { Barber, Service } from "../lib/types";

interface ContactData {
  clientName: string;
  clientPhone: string;
  notes: string;
}

interface BookingStoreState {
  selectedService: Service | null;
  selectedBarber: Barber | null;
  selectedDate: string;
  selectedSlot: string;
  contact: ContactData;
  setSelectedService: (service: Service) => void;
  setSelectedBarber: (barber: Barber) => void;
  setSelectedDate: (date: string) => void;
  setSelectedSlot: (slot: string) => void;
  setContact: (contact: ContactData) => void;
  reset: () => void;
}

const initialContact = { clientName: "", clientPhone: "", notes: "" };

export const useBookingStore = create<BookingStoreState>((set) => ({
  selectedService: null,
  selectedBarber: null,
  selectedDate: "",
  selectedSlot: "",
  contact: initialContact,
  setSelectedService: (selectedService) => set({ selectedService }),
  setSelectedBarber: (selectedBarber) => set({ selectedBarber }),
  setSelectedDate: (selectedDate) => set({ selectedDate, selectedSlot: "" }),
  setSelectedSlot: (selectedSlot) => set({ selectedSlot }),
  setContact: (contact) => set({ contact }),
  reset: () =>
    set({
      selectedService: null,
      selectedBarber: null,
      selectedDate: "",
      selectedSlot: "",
      contact: initialContact,
    }),
}));

