import { useServices } from "../../api/services";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { currency } from "../../lib/utils";
import { useBookingStore } from "../../store/bookingStore";

export function Step1Services() {
  const { data, isLoading } = useServices();
  const selectedService = useBookingStore((state) => state.selectedService);
  const setSelectedService = useBookingStore((state) => state.setSelectedService);

  if (isLoading) {
    return <Card>Loading services...</Card>;
  }

  return (
    <div className="grid gap-4">
      {data?.map((service) => (
        <Card key={service.id} className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <h3 className="font-display text-2xl text-brand-ink">{service.name}</h3>
            <p className="text-sm text-brand-ink/70">{service.description || "Classic grooming service."}</p>
            <div className="flex gap-3 text-sm text-brand-olive">
              <span>{currency(service.price)}</span>
              <span>{service.durationMin} min</span>
            </div>
          </div>
          <Button
            className={selectedService?.id === service.id ? "bg-brand-olive text-white" : ""}
            onClick={() => setSelectedService(service)}
            type="button"
          >
            {selectedService?.id === service.id ? "Selected" : "Choose service"}
          </Button>
        </Card>
      ))}
    </div>
  );
}

