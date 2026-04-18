import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useCreateBooking } from "../../api/bookings";
import { useBookingStore } from "../../store/bookingStore";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";

const schema = z.object({
  clientName: z.string().min(2),
  clientPhone: z.string().min(7),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  onSuccess: (bookingId: string) => void;
}

export function Step4Confirm({ onSuccess }: Props) {
  const selectedBarber = useBookingStore((state) => state.selectedBarber);
  const selectedService = useBookingStore((state) => state.selectedService);
  const selectedSlot = useBookingStore((state) => state.selectedSlot);
  const contact = useBookingStore((state) => state.contact);
  const setContact = useBookingStore((state) => state.setContact);
  const createBooking = useCreateBooking();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: contact,
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    if (!selectedBarber || !selectedService || !selectedSlot) {
      return;
    }

    setContact({
      clientName: values.clientName,
      clientPhone: values.clientPhone,
      notes: values.notes ?? "",
    });

    const booking = await createBooking.mutateAsync({
      barberId: selectedBarber.id,
      serviceId: selectedService.id,
      clientName: values.clientName,
      clientPhone: values.clientPhone,
      startTime: selectedSlot,
      notes: values.notes,
    });

    onSuccess(booking.id);
  });

  return (
    <Card className="space-y-5">
      <div className="space-y-2">
        <h3 className="font-display text-2xl text-brand-ink">Contact details</h3>
        <p className="text-sm text-brand-ink/70">We only need the essentials to confirm your booking.</p>
      </div>
      <form className="grid gap-4" onSubmit={handleSubmit}>
        <Input placeholder="Client name" {...form.register("clientName")} />
        <Input placeholder="Phone number" {...form.register("clientPhone")} />
        <Textarea placeholder="Optional notes" {...form.register("notes")} />
        {createBooking.isError ? (
          <p className="text-sm text-red-600">Unable to create booking. Try another time slot.</p>
        ) : null}
        <Button disabled={createBooking.isPending} type="submit">
          {createBooking.isPending ? "Creating..." : "Confirm booking"}
        </Button>
      </form>
    </Card>
  );
}

