import { useServices } from "../../api/services";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { getContent } from "../../lib/content";
import { formatCurrency } from "../../lib/locale";
import { useBookingStore } from "../../store/bookingStore";
import { usePreferencesStore } from "../../store/preferencesStore";

export function Step1Services() {
  const language = usePreferencesStore((state) => state.language);
  const copy = getContent(language);
  const { data, isError, isLoading } = useServices();
  const selectedService = useBookingStore((state) => state.selectedService);
  const setSelectedService = useBookingStore((state) => state.setSelectedService);

  if (isLoading) {
    return <Card>{copy.booking.step1Loading}</Card>;
  }

  if (isError) {
    return <Card>Unable to load services right now. Please refresh the page or try again later.</Card>;
  }

  if (!data?.length) {
    return <Card>No services are available yet. Please contact the shop or add services in the admin panel.</Card>;
  }

  return (
    <div className="grid gap-4">
      {data?.map((service) => (
        <Card key={service.id} className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <h3 className="font-display text-2xl text-brand-ink">{service.name}</h3>
            <p className="text-sm text-brand-ink/70">
              {service.description || copy.booking.step1DescriptionFallback}
            </p>
            <div className="flex gap-3 text-sm text-brand-olive">
              <span>{formatCurrency(service.price, language)}</span>
              <span>{service.durationMin} min</span>
            </div>
          </div>
          <Button
            className={selectedService?.id === service.id ? "bg-brand-olive text-white" : ""}
            onClick={() => setSelectedService(service)}
            type="button"
          >
            {selectedService?.id === service.id ? copy.booking.step1Selected : copy.booking.step1Choose}
          </Button>
        </Card>
      ))}
    </div>
  );
}
