import { Link } from "react-router-dom";
import { useServices } from "../../api/services";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { currency } from "../../lib/utils";

export function HomePage() {
  const { data } = useServices();

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 py-12">
      <section className="grid gap-8 rounded-[2.5rem] bg-brand-ink px-8 py-12 text-brand-cream shadow-card md:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-6">
          <span className="inline-flex rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.3em] text-brand-sand">
            BarberBook
          </span>
          <h1 className="font-display text-5xl leading-tight md:text-6xl">
            Sharp booking flow for a modern barbershop.
          </h1>
          <p className="max-w-2xl text-base text-brand-cream/75">
            Pick a service, choose your barber, lock a time slot, and keep the admin team in control with a lightweight dashboard.
          </p>
          <Link to="/booking">
            <Button className="bg-brand-clay">Book now</Button>
          </Link>
        </div>
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.3em] text-brand-sand">Features</p>
          <ul className="mt-5 grid gap-4 text-sm text-brand-cream/80">
            <li>Guest checkout with name and phone only</li>
            <li>Slot generation based on service duration and working hours</li>
            <li>Admin dashboard for bookings, services, and schedules</li>
          </ul>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {data?.map((service) => (
          <Card key={service.id} className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-brand-olive">{service.durationMin} min</p>
              <h2 className="font-display text-3xl text-brand-ink">{service.name}</h2>
              <p className="text-sm text-brand-ink/70">{service.description || "Premium chair time with calm pacing and clean execution."}</p>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-brand-ink">{currency(service.price)}</span>
              <Link to="/booking">
                <Button className="bg-brand-sand">Select</Button>
              </Link>
            </div>
          </Card>
        ))}
      </section>
    </main>
  );
}

