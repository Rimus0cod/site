import type { ScheduleException } from "../../lib/types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";

interface Props {
  exceptions: ScheduleException[];
  onChange: (exceptions: ScheduleException[]) => void;
}

const today = new Date().toISOString().slice(0, 10);

export function ScheduleExceptionsEditor({ exceptions, onChange }: Props) {
  const updateException = (index: number, patch: Partial<ScheduleException>) => {
    const next = [...exceptions];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const removeException = (index: number) => {
    onChange(exceptions.filter((_, currentIndex) => currentIndex !== index));
  };

  const addException = () => {
    onChange([
      ...exceptions,
      {
        date: today,
        startTime: "09:00",
        endTime: "18:00",
        isDayOff: false,
        note: "",
      },
    ]);
  };

  return (
    <div className="grid gap-4">
      {exceptions.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-brand-ink/20 bg-white/60 p-5 text-sm text-brand-ink/65">
          No date-specific overrides yet. Add vacation days, holidays, shortened shifts, or one-off extended hours here.
        </div>
      ) : null}

      {exceptions.map((exception, index) => (
        <div
          key={`${exception.date}-${index}`}
          className="grid gap-3 rounded-3xl border border-brand-ink/10 bg-white/90 p-4"
        >
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
            <Input
              min={today}
              type="date"
              value={exception.date}
              onChange={(event) => updateException(index, { date: event.target.value })}
            />
            <Input
              disabled={exception.isDayOff}
              type="time"
              value={exception.startTime ?? ""}
              onChange={(event) => updateException(index, { startTime: event.target.value })}
            />
            <Input
              disabled={exception.isDayOff}
              type="time"
              value={exception.endTime ?? ""}
              onChange={(event) => updateException(index, { endTime: event.target.value })}
            />
            <Button className="bg-brand-sand" onClick={() => removeException(index)} type="button">
              Remove
            </Button>
          </div>

          <label className="flex items-center gap-3 text-sm font-medium text-brand-ink/80">
            <input
              className="h-4 w-4 accent-brand-olive"
              checked={Boolean(exception.isDayOff)}
              type="checkbox"
              onChange={(event) =>
                updateException(index, {
                  isDayOff: event.target.checked,
                  startTime: event.target.checked ? null : exception.startTime ?? "09:00",
                  endTime: event.target.checked ? null : exception.endTime ?? "18:00",
                })
              }
            />
            Full day off
          </label>

          <Textarea
            className="min-h-20"
            placeholder="Optional note, for example holiday hours or private training day"
            value={exception.note ?? ""}
            onChange={(event) => updateException(index, { note: event.target.value })}
          />
        </div>
      ))}

      <Button className="w-fit bg-brand-sand" onClick={addException} type="button">
        Add exception date
      </Button>
    </div>
  );
}
