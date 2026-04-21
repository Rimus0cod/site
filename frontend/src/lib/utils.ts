export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function normalizeTimeValue(value?: string | null) {
  if (!value) {
    return null;
  }

  return value.slice(0, 5);
}

export function currency(value: string | number, locale = "uk-UA") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "UAH",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export function dayLabel(dayOfWeek: number) {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dayOfWeek] ?? "Day";
}
