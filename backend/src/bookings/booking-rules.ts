export function normalizeTelegramUsername(username?: string | null) {
  if (!username) {
    return null;
  }

  const normalized = username.trim().replace(/^@+/, "").toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

export function normalizeTime(value: string) {
  const trimmed = value.trim();
  if (/^\d{2}:\d{2}$/.test(trimmed)) {
    return `${trimmed}:00`;
  }

  if (/^\d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  throw new Error(`Invalid time format: ${value}`);
}

export function formatDatePart(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDateTime(date: Date) {
  const datePart = formatDatePart(date);
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${datePart}T${hours}:${minutes}:00`;
}

export function combineDateAndTime(date: string, time: string) {
  return new Date(`${date}T${normalizeTime(time)}`);
}

export function isPositiveRange(startTime?: string | null, endTime?: string | null) {
  if (!startTime || !endTime) {
    return false;
  }

  return normalizeTime(startTime) < normalizeTime(endTime);
}
