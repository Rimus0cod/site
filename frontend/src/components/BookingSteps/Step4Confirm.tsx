import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useCreateBooking } from "../../api/bookings";
import { getContent } from "../../lib/content";
import { useBookingStore } from "../../store/bookingStore";
import { usePreferencesStore } from "../../store/preferencesStore";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";

const schema = z.object({
  clientName: z.string().min(2),
  clientPhone: z.string().min(7),
  clientTelegramUsername: z
    .string()
    .trim()
    .optional()
    .transform((value) => value ?? "")
    .refine((value) => value === "" || /^@?[A-Za-z0-9_]{5,32}$/.test(value), {
      message: "Use a valid Telegram username",
    }),
  notes: z.string().optional(),
  website: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  onSuccess: (payload: { bookingId: string; managementToken: string }) => void;
}

export function Step4Confirm({ onSuccess }: Props) {
  const language = usePreferencesStore((state) => state.language);
  const copy = getContent(language);
  const selectedBarber = useBookingStore((state) => state.selectedBarber);
  const selectedService = useBookingStore((state) => state.selectedService);
  const selectedSlot = useBookingStore((state) => state.selectedSlot);
  const contact = useBookingStore((state) => state.contact);
  const setContact = useBookingStore((state) => state.setContact);
  const createBooking = useCreateBooking();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      ...contact,
      website: "",
    },
  });

  const telegramError =
    form.formState.errors.clientTelegramUsername?.message === "Use a valid Telegram username"
      ? copy.booking.invalidTelegram
      : form.formState.errors.clientTelegramUsername?.message;

  const handleSubmit = form.handleSubmit(async (values) => {
    if (!selectedBarber || !selectedService || !selectedSlot) {
      return;
    }

    setContact({
      clientName: values.clientName,
      clientPhone: values.clientPhone,
      clientTelegramUsername: values.clientTelegramUsername,
      notes: values.notes ?? "",
    });

    const booking = await createBooking.mutateAsync({
      barberId: selectedBarber.id,
      serviceId: selectedService.id,
      clientName: values.clientName,
      clientPhone: values.clientPhone,
      clientTelegramUsername: values.clientTelegramUsername || undefined,
      startTime: selectedSlot,
      notes: values.notes,
      website: values.website,
    });

    onSuccess({
      bookingId: booking.id,
      managementToken: booking.managementToken ?? "",
    });
  });

  return (
    <Card className="space-y-5">
      <div className="space-y-2">
        <h3 className="font-display text-2xl text-brand-ink">{copy.booking.contactTitle}</h3>
        <p className="text-sm text-brand-ink/70">{copy.booking.contactDescription}</p>
      </div>
      <form className="grid gap-4" onSubmit={handleSubmit}>
        <div className="absolute left-[-9999px] top-auto h-0 w-0 overflow-hidden" aria-hidden="true">
          <Input
            autoComplete="off"
            tabIndex={-1}
            placeholder="Leave this field empty"
            {...form.register("website")}
          />
        </div>
        <Input placeholder={copy.booking.placeholderName} {...form.register("clientName")} />
        <Input placeholder={copy.booking.placeholderPhone} {...form.register("clientPhone")} />
        <Input placeholder={copy.booking.placeholderTelegram} {...form.register("clientTelegramUsername")} />
        {form.formState.errors.clientTelegramUsername ? (
          <p className="text-sm text-red-600">{telegramError}</p>
        ) : (
          <p className="text-xs text-brand-ink/65">{copy.booking.telegramHint}</p>
        )}
        <Textarea placeholder={copy.booking.placeholderNotes} {...form.register("notes")} />
        <p className="text-xs text-brand-ink/60">{copy.booking.managementHint}</p>
        {createBooking.isError ? (
          <p className="text-sm text-red-600">{copy.booking.submitError}</p>
        ) : null}
        <Button disabled={createBooking.isPending} type="submit">
          {createBooking.isPending ? copy.booking.submitting : copy.booking.submit}
        </Button>
      </form>
    </Card>
  );
}
