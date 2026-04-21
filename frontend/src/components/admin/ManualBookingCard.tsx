import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useAdminBarbers } from "../../api/barbers";
import { useAdminCreateBooking, useSlots } from "../../api/bookings";
import { useAdminServices } from "../../api/services";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Textarea } from "../ui/Textarea";

interface FormValues {
  clientName: string;
  clientPhone: string;
  clientTelegramUsername: string;
  barberId: string;
  serviceId: string;
  date: string;
  startTime: string;
  notes: string;
}

const today = new Date().toISOString().slice(0, 10);

export function ManualBookingCard() {
  const { data: barbers } = useAdminBarbers();
  const { data: services } = useAdminServices();
  const createBooking = useAdminCreateBooking();
  const { register, handleSubmit, reset, setValue, watch } = useForm<FormValues>({
    defaultValues: {
      clientName: "",
      clientPhone: "",
      clientTelegramUsername: "",
      barberId: "",
      serviceId: "",
      date: today,
      startTime: "",
      notes: "",
    },
  });

  const barberId = watch("barberId");
  const serviceId = watch("serviceId");
  const date = watch("date");
  const selectedSlot = watch("startTime");
  const { data: slotsData, isLoading: slotsLoading } = useSlots(barberId, date, serviceId);

  useEffect(() => {
    setValue("startTime", "");
  }, [barberId, date, serviceId, setValue]);

  const submit = handleSubmit(async (values) => {
    await createBooking.mutateAsync({
      barberId: values.barberId,
      serviceId: values.serviceId,
      clientName: values.clientName,
      clientPhone: values.clientPhone,
      clientTelegramUsername: values.clientTelegramUsername || undefined,
      startTime: values.startTime,
      notes: values.notes || undefined,
      status: "confirmed",
    });

    reset({
      clientName: "",
      clientPhone: "",
      clientTelegramUsername: "",
      barberId: values.barberId,
      serviceId: values.serviceId,
      date: values.date,
      startTime: "",
      notes: "",
    });
  });

  return (
    <Card className="space-y-5">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-brand-olive">Front Desk</p>
        <h2 className="font-display text-3xl text-brand-ink">Create booking manually</h2>
        <p className="text-sm text-brand-ink/70">
          Use this for walk-ins, phone calls, or when the team books a chair directly.
        </p>
      </div>

      <form className="grid gap-4" onSubmit={submit}>
        <div className="grid gap-3 md:grid-cols-2">
          <Input placeholder="Client name" {...register("clientName", { required: true })} />
          <Input placeholder="Phone number" {...register("clientPhone", { required: true })} />
        </div>

        <Input
          placeholder="Telegram username for reminders, for example @clientname"
          {...register("clientTelegramUsername")}
        />

        <div className="grid gap-3 md:grid-cols-3">
          <Select {...register("barberId", { required: true })}>
            <option value="">Select barber</option>
            {barbers?.map((barber) => (
              <option key={barber.id} value={barber.id}>
                {barber.name}
              </option>
            ))}
          </Select>

          <Select {...register("serviceId", { required: true })}>
            <option value="">Select service</option>
            {services?.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </Select>

          <Input min={today} type="date" {...register("date", { required: true })} />
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold text-brand-ink">Available slots</p>
          {slotsLoading ? <p className="text-sm text-brand-ink/65">Loading slots...</p> : null}
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {slotsData?.slots?.map((slot) => (
              <Button
                key={slot}
                className={selectedSlot === slot ? "bg-brand-olive text-white" : "bg-brand-sand"}
                onClick={() => setValue("startTime", slot, { shouldValidate: true })}
                type="button"
              >
                {slot.slice(11, 16)}
              </Button>
            ))}
          </div>
          {date && slotsData?.slots?.length === 0 ? (
            <p className="text-sm text-brand-ink/65">No slots available for the selected setup.</p>
          ) : null}
        </div>

        <Textarea placeholder="Internal notes or client preferences" {...register("notes")} />

        {createBooking.isError ? (
          <p className="text-sm text-red-600">
            Could not create the booking. Check the slot and required fields.
          </p>
        ) : null}

        <Button
          disabled={createBooking.isPending || !barberId || !serviceId || !selectedSlot}
          type="submit"
        >
          {createBooking.isPending ? "Creating..." : "Create confirmed booking"}
        </Button>
      </form>
    </Card>
  );
}
