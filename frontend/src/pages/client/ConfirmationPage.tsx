import dayjs from "dayjs";
import { Link, useParams } from "react-router-dom";
import { useBooking } from "../../api/bookings";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

export function ConfirmationPage() {
  const { id } = useParams();
  const { data, isLoading } = useBooking(id);

  if (isLoading) {
    return <main className="mx-auto max-w-3xl px-6 py-12">Loading booking...</main>;
  }

  if (!data) {
    return <main className="mx-auto max-w-3xl px-6 py-12">Booking not found.</main>;
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Card className="space-y-6">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-brand-olive">Booking confirmed in system</p>
          <h1 className="font-display text-4xl text-brand-ink">Your appointment request is in.</h1>
          <p className="text-brand-ink/70">Status: {data.status}</p>
        </div>
        <div className="grid gap-3 text-sm text-brand-ink/80">
          <p>Client: {data.clientName}</p>
          <p>Phone: {data.clientPhone}</p>
          <p>Barber: {data.barber?.name ?? data.barberId}</p>
          <p>Service: {data.service?.name ?? data.serviceId}</p>
          <p>Start: {dayjs(data.startTime).format("MMMM D, YYYY HH:mm")}</p>
        </div>
        <Link to="/">
          <Button>Back to home</Button>
        </Link>
      </Card>
    </main>
  );
}

