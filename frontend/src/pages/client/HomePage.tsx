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
      <main className="mx-auto flex min-h-[calc(100vh-120px)] max-w-6xl flex-col gap-8 px-4 py-6 sm:gap-10 sm:px-6 sm:py-10">
        <section className="grid gap-6 rounded-[2rem] bg-brand-ink px-5 py-6 text-brand-cream shadow-card sm:gap-8 sm:rounded-[2.8rem] sm:px-8 sm:py-12 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-6">
            <span className="inline-flex rounded-full border border-white/20 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.24em] text-brand-sand sm:px-4 sm:text-xs sm:tracking-[0.34em]">
              {copy.home.badge}
            </span>
            <h1 className="max-w-4xl font-display text-[2.8rem] leading-[0.92] sm:text-6xl md:text-7xl">
              {copy.home.title}
            </h1>
            <p className="max-w-2xl text-base font-medium text-brand-cream/78 sm:text-lg">{copy.home.description}</p>
            <div className="grid gap-3 sm:flex sm:flex-wrap">
              <Link className="w-full sm:w-auto" to="/booking">
                <Button className="w-full bg-brand-clay sm:w-auto">{copy.home.primary}</Button>
              </Link>
              <Link className="w-full sm:w-auto" to="/account">
                <Button className="w-full bg-brand-sand sm:w-auto">{copy.home.secondary}</Button>
              </Link>
              <a className="w-full sm:w-auto" href={`tel:${SHOP_INFO.phone.replace(/\s+/g, "")}`}>
                <Button className="w-full border border-white/15 bg-white/8 text-brand-cream sm:w-auto">
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
          <div className="grid gap-4 rounded-[1.6rem] border border-white/10 bg-white/6 p-5 sm:rounded-[2rem] sm:p-6">
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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-brand-olive">{copy.home.servicesLabel}</p>
              <h2 className="font-display text-4xl leading-none text-brand-ink sm:text-5xl">
                {copy.home.servicesTitle}
              </h2>
            </div>
            <Link className="w-full sm:w-auto" to="/booking">
              <Button className="w-full bg-brand-sand sm:w-auto">{copy.home.servicesCta}</Button>
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {data?.map((service) => (
              <Card key={service.id} className="space-y-4">
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-olive">
                    {service.durationMin} min
                  </p>
                  <h2 className="font-display text-3xl leading-none text-brand-ink sm:text-4xl">{service.name}</h2>
                  <p className="text-sm font-medium text-brand-ink/74">
                    {service.description || copy.home.serviceFallback}
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-xl font-extrabold text-brand-ink">
                    {formatCurrency(service.price, language)}
                  </span>
                  <Link className="w-full sm:w-auto" to="/booking">
                    <Button className="w-full bg-brand-sand sm:w-auto">{copy.home.select}</Button>
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
              <h2 className="font-display text-4xl leading-none text-brand-ink sm:text-5xl">{copy.home.barbersTitle}</h2>
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
                    <h3 className="font-display text-[1.9rem] leading-none text-brand-ink sm:text-3xl">{barber.name}</h3>
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
              <h2 className="font-display text-3xl leading-none text-brand-ink sm:text-4xl">{copy.home.portalTitle}</h2>
              <p className="text-sm font-medium text-brand-ink/74">{copy.home.portalText}</p>
              <Link className="w-full sm:w-auto" to="/account">
                <Button className="w-full bg-brand-sand sm:w-auto">{copy.home.portalButton}</Button>
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
