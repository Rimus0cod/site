import { useSlots } from "../../api/bookings";
import { useBookingStore } from "../../store/bookingStore";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";

export function Step3DateTime() {
  const selectedBarber = useBookingStore((state) => state.selectedBarber);
  const selectedService = useBookingStore((state) => state.selectedService);
  const selectedDate = useBookingStore((state) => state.selectedDate);
  const selectedSlot = useBookingStore((state) => state.selectedSlot);
  const setSelectedDate = useBookingStore((state) => state.setSelectedDate);
  const setSelectedSlot = useBookingStore((state) => state.setSelectedSlot);

  const { data, isLoading } = useSlots(selectedBarber?.id, selectedDate, selectedService?.id);

  return (
    <div className="grid gap-4">
      <Card className="space-y-3">
        <label className="block text-sm font-semibold text-brand-ink">Date</label>
        <Input
          min={new Date().toISOString().slice(0, 10)}
          type="date"
          className="font-semibold text-brand-ink"
          value={selectedDate}
          onChange={(event) => setSelectedDate(event.target.value)}
        />
      </Card>

      <Card className="space-y-4">
        <div>
          <h3 className="font-display text-2xl text-brand-ink">Available slots</h3>
          <p className="text-sm font-medium text-brand-ink/85">
            Select a time that fits both the service duration and the barber schedule.
          </p>
        </div>
        {isLoading ? <p className="text-sm font-medium text-brand-ink/85">Loading slots...</p> : null}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {data?.slots?.map((slot) => (
            <Button
              key={slot}
              className={selectedSlot === slot ? "bg-brand-olive text-white" : "bg-brand-sand"}
              onClick={() => setSelectedSlot(slot)}
              type="button"
            >
              {slot.slice(11, 16)}
            </Button>
          ))}
        </div>
        {selectedDate && data?.slots?.length === 0 ? (
          <p className="text-sm font-medium text-brand-ink/85">
            No slots available for the selected date. If you picked today, the working hours may already be over.
          </p>
        ) : null}
      </Card>
    </div>
  );
}
