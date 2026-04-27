import { Link } from "react-router-dom";
import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useCreateBookingHold } from "../../api/bookings";
import { useClientMe } from "../../api/client-auth";
import { getClientExperienceContent } from "../../lib/clientExperienceContent";
import { getContent } from "../../lib/content";
import { formatCurrency } from "../../lib/locale";
import { useBookingStore } from "../../store/bookingStore";
import { useClientSessionStore } from "../../store/clientSessionStore";
import { usePreferencesStore } from "../../store/preferencesStore";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";

const schema = z.object({
  clientName: z.string().min(2),
  clientPhone: z.string().optional().transform((value) => value ?? ""),
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
  onSuccess: (payload: { holdId: string; accessToken: string }) => void;
}

function getDepositAmount(price: string, paymentPolicy?: string, depositValue?: string | null) {
  const numericPrice = Number(price);
  const numericDepositValue = Number(depositValue ?? 0);

  switch (paymentPolicy) {
    case "offline":
      return 0;
    case "full_prepayment":
      return numericPrice;
    case "deposit_fixed":
      return Math.min(numericPrice, numericDepositValue);
    case "deposit_percent":
    default:
      return Math.min(numericPrice, (numericPrice * numericDepositValue) / 100);
  }
}

export function Step4Confirm({ onSuccess }: Props) {
  const language = usePreferencesStore((state) => state.language);
  const copy = getContent(language);
  const extraCopy = getClientExperienceContent(language);
  const selectedBarber = useBookingStore((state) => state.selectedBarber);
  const selectedService = useBookingStore((state) => state.selectedService);
  const selectedSlot = useBookingStore((state) => state.selectedSlot);
  const contact = useBookingStore((state) => state.contact);
  const setContact = useBookingStore((state) => state.setContact);
  const storedClient = useClientSessionStore((state) => state.client);
  const setClient = useClientSessionStore((state) => state.setClient);
  const clearClient = useClientSessionStore((state) => state.clearClient);
  const { data, isError } = useClientMe(!storedClient);
  const createBookingHold = useCreateBookingHold();
  const currentClient = data?.client ?? storedClient ?? null;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      ...contact,
      website: "",
    },
  });

  useEffect(() => {
    if (data?.client) {
      setClient(data.client);
    }
  }, [data, setClient]);

  useEffect(() => {
    if (isError) {
      clearClient();
    }
  }, [clearClient, isError]);

  useEffect(() => {
    if (currentClient) {
      if (!form.getValues("clientName")) {
        form.setValue("clientName", currentClient.name);
      }
      form.setValue("clientPhone", currentClient.phone);

      if (!form.getValues("clientTelegramUsername") && currentClient.telegramUsername) {
        form.setValue("clientTelegramUsername", `@${currentClient.telegramUsername}`);
      }
    }
  }, [currentClient, form]);

  const telegramError =
    form.formState.errors.clientTelegramUsername?.message === "Use a valid Telegram username"
      ? copy.booking.invalidTelegram
      : form.formState.errors.clientTelegramUsername?.message;
  const phoneError = form.formState.errors.clientPhone?.message;
  const depositAmount = selectedService
    ? getDepositAmount(
        selectedService.price,
        selectedService.paymentPolicy,
        selectedService.depositValue ?? null,
      )
    : 0;

  const handleSubmit = form.handleSubmit(async (values) => {
    if (!selectedBarber || !selectedService || !selectedSlot) {
      return;
    }

    if (!currentClient && values.clientPhone.trim().length < 7) {
      form.setError("clientPhone", {
        type: "custom",
        message: language === "uk" ? "Вкажіть номер телефону" : "Enter a phone number",
      });
      return;
    }

    setContact({
      clientName: values.clientName,
      clientPhone: currentClient?.phone ?? values.clientPhone,
      clientTelegramUsername: values.clientTelegramUsername,
      notes: values.notes ?? "",
    });

    const hold = await createBookingHold.mutateAsync({
      barberId: selectedBarber.id,
      serviceId: selectedService.id,
      clientName: values.clientName,
      clientPhone: currentClient?.phone || values.clientPhone || undefined,
      clientTelegramUsername: values.clientTelegramUsername || undefined,
      startTime: selectedSlot,
      notes: values.notes,
      website: values.website,
    });

    onSuccess({
      holdId: hold.id,
      accessToken: hold.accessToken ?? "",
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
        {currentClient ? (
          <div className="rounded-[1.5rem] border border-brand-line/10 bg-brand-sand/35 p-4">
            <p className="text-sm font-extrabold text-brand-ink">{extraCopy.clientAuth.phoneLockedTitle}</p>
            <p className="mt-1 text-sm text-brand-ink/74">{extraCopy.clientAuth.phoneLockedText}</p>
            <p className="mt-3 text-sm font-semibold text-brand-ink">
              {extraCopy.clientAuth.phoneLabel}: {currentClient.phone}
            </p>
          </div>
        ) : (
          <>
            <Input placeholder={copy.booking.placeholderPhone} type="tel" {...form.register("clientPhone")} />
            {phoneError ? <p className="text-sm text-red-600">{phoneError}</p> : null}
            <div className="rounded-[1.5rem] border border-brand-line/10 bg-brand-panel/80 p-4 text-sm text-brand-ink/74">
              <p>{extraCopy.clientAuth.guestPrompt}</p>
              <Link className="mt-3 inline-block" to="/account">
                <Button className="bg-brand-sand" type="button">
                  {extraCopy.clientAuth.openCabinet}
                </Button>
              </Link>
            </div>
          </>
        )}
        <Input placeholder={copy.booking.placeholderTelegram} {...form.register("clientTelegramUsername")} />
        {form.formState.errors.clientTelegramUsername ? (
          <p className="text-sm text-red-600">{telegramError}</p>
        ) : (
          <p className="text-xs text-brand-ink/65">{copy.booking.telegramHint}</p>
        )}
        <Textarea placeholder={copy.booking.placeholderNotes} {...form.register("notes")} />
        <div className="rounded-[1.5rem] border border-brand-line/10 bg-brand-cream/40 p-4">
          <p className="text-xs uppercase tracking-[0.28em] text-brand-olive">{extraCopy.fairUse.badge}</p>
          <p className="mt-2 text-sm font-medium text-brand-ink/74">{extraCopy.fairUse.text}</p>
        </div>
        {selectedService ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.5rem] border border-brand-line/10 bg-brand-panel/80 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-brand-olive">{copy.checkout.depositLabel}</p>
              <p className="mt-2 text-lg font-extrabold text-brand-ink">
                {formatCurrency(depositAmount, language)}
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-brand-line/10 bg-brand-panel/80 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-brand-olive">{copy.checkout.totalLabel}</p>
              <p className="mt-2 text-lg font-extrabold text-brand-ink">
                {formatCurrency(selectedService.price, language)}
              </p>
            </div>
          </div>
        ) : null}
        <p className="text-xs text-brand-ink/60">{copy.booking.managementHint}</p>
        {createBookingHold.isError ? (
          <p className="text-sm text-red-600">{copy.booking.submitError}</p>
        ) : null}
        <Button disabled={createBookingHold.isPending} type="submit">
          {createBookingHold.isPending ? copy.booking.submitting : copy.booking.submit}
        </Button>
      </form>
    </Card>
  );
}
