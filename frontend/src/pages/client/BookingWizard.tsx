import { useNavigate } from "react-router-dom";
import { Step1Services } from "../../components/BookingSteps/Step1Services";
import { Step2Barber } from "../../components/BookingSteps/Step2Barber";
import { Step3DateTime } from "../../components/BookingSteps/Step3DateTime";
import { Step4Confirm } from "../../components/BookingSteps/Step4Confirm";
import { ClientShell } from "../../components/client/ClientShell";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { getContent } from "../../lib/content";
import { useBookingStore } from "../../store/bookingStore";
import { useClientPortalStore } from "../../store/clientPortalStore";
import { usePreferencesStore } from "../../store/preferencesStore";

export function BookingWizard() {
  const navigate = useNavigate();
  const language = usePreferencesStore((state) => state.language);
  const saveAccess = useClientPortalStore((state) => state.saveAccess);
  const copy = getContent(language);
  const selectedService = useBookingStore((state) => state.selectedService);
  const selectedBarber = useBookingStore((state) => state.selectedBarber);
  const selectedSlot = useBookingStore((state) => state.selectedSlot);
  const reset = useBookingStore((state) => state.reset);

  return (
    <ClientShell>
      <main className="mx-auto flex min-h-[calc(100vh-120px)] max-w-5xl flex-col gap-5 px-4 py-6 sm:gap-6 sm:px-6 sm:py-10">
        <Card className="flex flex-col gap-4 bg-brand-ink text-brand-cream sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-brand-sand">{copy.booking.badge}</p>
            <h1 className="font-display text-4xl leading-none sm:text-5xl">{copy.booking.title}</h1>
          </div>
          <Button className="w-full bg-brand-sand sm:w-auto" onClick={reset} type="button">
            {copy.booking.reset}
          </Button>
        </Card>

        <Step1Services />
        {selectedService ? <Step2Barber /> : null}
        {selectedService && selectedBarber ? <Step3DateTime /> : null}
        {selectedService && selectedBarber && selectedSlot ? (
          <Step4Confirm
            onSuccess={({ bookingId, managementToken }) => {
              saveAccess({ bookingId, token: managementToken });
              navigate(`/booking/confirm/${bookingId}?token=${encodeURIComponent(managementToken)}`);
            }}
          />
        ) : null}
      </main>
    </ClientShell>
  );
}
