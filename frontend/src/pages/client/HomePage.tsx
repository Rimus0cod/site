import { Link } from "react-router-dom";
import { useBarbers } from "../../api/barbers";
import { useServices } from "../../api/services";
import { ClientShell } from "../../components/client/ClientShell";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { getContent } from "../../lib/content";
import { formatCurrency } from "../../lib/locale";
import { SHOP_INFO } from "../../lib/shop";
import { usePreferencesStore } from "../../store/preferencesStore";

export function HomePage() {
  const language = usePreferencesStore((state) => state.language);
  const copy = getContent(language);
  const { data } = useServices();
  const { data: barbers } = useBarbers();
  const shopHours = copy.shop.hours;

  return (
    <ClientShell>
      <main className="mx-auto flex min-h-[calc(100vh-88px)] max-w-6xl flex-col gap-10 px-6 py-10">
        <section className="grid gap-8 rounded-[2.8rem] bg-brand-ink px-8 py-12 text-brand-cream shadow-card lg:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-6">
            <span className="inline-flex rounded-full border border-white/20 px-4 py-2 text-xs font-bold uppercase tracking-[0.34em] text-brand-sand">
              {copy.home.badge}
            </span>
            <h1 className="max-w-4xl font-display text-6xl leading-[0.92] md:text-7xl">
              {copy.home.title}
            </h1>
            <p className="max-w-2xl text-lg font-medium text-brand-cream/78">{copy.home.description}</p>
            <div className="flex flex-wrap gap-3">
              <Link to="/booking">
                <Button className="bg-brand-clay">{copy.home.primary}</Button>
              </Link>
              <Link to="/account">
                <Button className="bg-brand-sand">{copy.home.secondary}</Button>
              </Link>
              <a href={`tel:${SHOP_INFO.phone.replace(/\s+/g, "")}`}>
                <Button className="border border-white/15 bg-white/8 text-brand-cream">
                  {copy.home.call} {SHOP_INFO.phone}
                </Button>
              </a>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-brand-cream/86">
              {copy.shop.highlights.map((item) => (
                <span key={item} className="rounded-full border border-white/15 px-4 py-2">
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div className="grid gap-4 rounded-[2rem] border border-white/10 bg-white/6 p-6">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-brand-sand">{copy.home.visitUs}</p>
              <div className="mt-4 grid gap-3 text-sm font-medium text-brand-cream/82">
                <p>{SHOP_INFO.address}</p>
                <p>{SHOP_INFO.phone}</p>
                <p>{SHOP_INFO.telegram}</p>
                <p>{SHOP_INFO.instagram}</p>
              </div>
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-brand-sand">{copy.home.openingHours}</p>
              <div className="mt-4 grid gap-2 text-sm font-medium text-brand-cream/82">
                {shopHours.map((item) => (
                  <p key={item.label}>
                    {item.label}: {item.value}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-brand-olive">{copy.home.servicesLabel}</p>
              <h2 className="font-display text-5xl leading-none text-brand-ink">
                {copy.home.servicesTitle}
              </h2>
            </div>
            <Link to="/booking">
              <Button className="bg-brand-sand">{copy.home.servicesCta}</Button>
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {data?.map((service) => (
              <Card key={service.id} className="space-y-4">
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-olive">
                    {service.durationMin} min
                  </p>
                  <h2 className="font-display text-4xl leading-none text-brand-ink">{service.name}</h2>
                  <p className="text-sm font-medium text-brand-ink/74">
                    {service.description || copy.home.serviceFallback}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-extrabold text-brand-ink">
                    {formatCurrency(service.price, language)}
                  </span>
                  <Link to="/booking">
                    <Button className="bg-brand-sand">{copy.home.select}</Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="space-y-5 bg-brand-sand/42">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-brand-olive">{copy.home.barbersLabel}</p>
              <h2 className="font-display text-5xl leading-none text-brand-ink">{copy.home.barbersTitle}</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {barbers?.map((barber) => (
                <div key={barber.id} className="rounded-[1.75rem] border border-brand-line/10 bg-brand-panel/94 p-4">
                  {barber.photoUrl ? (
                    <img
                      alt={barber.name}
                      className="h-44 w-full rounded-[1.35rem] object-cover"
                      src={barber.photoUrl}
                    />
                  ) : (
                    <div className="flex h-44 items-center justify-center rounded-[1.35rem] bg-brand-ink text-5xl font-bold text-brand-cream">
                      {barber.name.slice(0, 1)}
                    </div>
                  )}
                  <div className="mt-4 space-y-2">
                    <h3 className="font-display text-3xl leading-none text-brand-ink">{barber.name}</h3>
                    <p className="text-sm font-medium text-brand-ink/72">
                      {barber.bio || copy.home.barberFallback}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid gap-4">
            <Card className="space-y-4">
              <p className="text-xs uppercase tracking-[0.3em] text-brand-olive">{copy.home.portalLabel}</p>
              <h2 className="font-display text-4xl leading-none text-brand-ink">{copy.home.portalTitle}</h2>
              <p className="text-sm font-medium text-brand-ink/74">{copy.home.portalText}</p>
              <Link to="/account">
                <Button className="bg-brand-sand">{copy.home.portalButton}</Button>
              </Link>
            </Card>

            <Card className="space-y-4">
              <p className="text-xs uppercase tracking-[0.3em] text-brand-olive">{copy.home.policiesLabel}</p>
              <div className="grid gap-3 text-sm font-medium text-brand-ink/82">
                {copy.shop.policies.map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
            </Card>

            <Card className="space-y-4">
              <p className="text-xs uppercase tracking-[0.3em] text-brand-olive">{copy.home.faqLabel}</p>
              <div className="grid gap-4">
                {copy.shop.faq.map((item) => (
                  <div key={item.question} className="space-y-1">
                    <h3 className="text-base font-extrabold text-brand-ink">{item.question}</h3>
                    <p className="text-sm font-medium text-brand-ink/72">{item.answer}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </section>
      </main>
    </ClientShell>
  );
}
