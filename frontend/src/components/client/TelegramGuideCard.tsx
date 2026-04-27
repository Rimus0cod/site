import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { getClientExperienceContent } from "../../lib/clientExperienceContent";
import { SHOP_INFO } from "../../lib/shop";
import { usePreferencesStore } from "../../store/preferencesStore";

export function TelegramGuideCard() {
  const language = usePreferencesStore((state) => state.language);
  const copy = getClientExperienceContent(language).telegramGuide;

  return (
    <Card className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-brand-olive">{copy.badge}</p>
        <h2 className="font-display text-3xl leading-none text-brand-ink">{copy.title}</h2>
        <p className="text-sm font-medium text-brand-ink/74">{copy.text}</p>
      </div>
      <div className="grid gap-2 text-sm font-medium text-brand-ink/78">
        {copy.steps.map((step) => (
          <p key={step}>{step}</p>
        ))}
      </div>
      <p className="text-xs text-brand-ink/62">{copy.note}</p>
      <a href={`https://t.me/${SHOP_INFO.telegram.replace("@", "")}`} rel="noreferrer" target="_blank">
        <Button className="w-full bg-brand-sand">{copy.action}</Button>
      </a>
    </Card>
  );
}
