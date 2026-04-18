import { useNavigate } from "react-router-dom";
import { Step1Services } from "../../components/BookingSteps/Step1Services";
import { Step2Barber } from "../../components/BookingSteps/Step2Barber";
import { Step3DateTime } from "../../components/BookingSteps/Step3DateTime";
import { Step4Confirm } from "../../components/BookingSteps/Step4Confirm";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { useBookingStore } from "../../store/bookingStore";

export function BookingWizard() {
  const navigate = useNavigate();
  const selectedService = useBookingStore((state) => state.selectedService);
  const selectedBarber = useBookingStore((state) => state.selectedBarber);
  const selectedSlot = useBookingStore((state) => state.selectedSlot);
  const reset = useBookingStore((state) => state.reset);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-12">
      <Card className="flex flex-wrap items-center justify-between gap-4 bg-brand-ink text-brand-cream">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-brand-sand">Booking wizard</p>
          <h1 className="font-display text-4xl">Build the appointment in four steps</h1>
        </div>
        <Button className="bg-brand-sand" onClick={reset} type="button">
          Clear selections
        </Button>
      </Card>

      <Step1Services />
      {selectedService ? <Step2Barber /> : null}
      {selectedService && selectedBarber ? <Step3DateTime /> : null}
      {selectedService && selectedBarber && selectedSlot ? (
        <Step4Confirm onSuccess={(bookingId) => navigate(`/booking/confirm/${bookingId}`)} />
      ) : null}
    </main>
  );
}

