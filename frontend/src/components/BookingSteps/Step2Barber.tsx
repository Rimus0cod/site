import { useBarbers } from "../../api/barbers";
import { useBookingStore } from "../../store/bookingStore";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { getContent } from "../../lib/content";
import { usePreferencesStore } from "../../store/preferencesStore";

export function Step2Barber() {
  const language = usePreferencesStore((state) => state.language);
  const copy = getContent(language);
  const { data, isLoading } = useBarbers();
  const selectedBarber = useBookingStore((state) => state.selectedBarber);
  const setSelectedBarber = useBookingStore((state) => state.setSelectedBarber);

  if (isLoading) {
    return <Card>{copy.booking.step2Loading}</Card>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {data?.map((barber) => (
        <Card key={barber.id} className="space-y-4">
          <div className="space-y-2">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-sand text-xl font-bold text-brand-ink">
              {barber.name.slice(0, 1)}
            </div>
            <h3 className="font-display text-2xl text-brand-ink">{barber.name}</h3>
            <p className="text-sm text-brand-ink/70">{barber.bio || copy.booking.step2Fallback}</p>
          </div>
          <Button
            className={selectedBarber?.id === barber.id ? "bg-brand-olive text-white" : ""}
            onClick={() => setSelectedBarber(barber)}
            type="button"
          >
            {selectedBarber?.id === barber.id ? copy.booking.step2Selected : copy.booking.step2Choose}
          </Button>
        </Card>
      ))}
    </div>
  );
}
