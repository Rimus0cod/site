import { BadRequestException } from "@nestjs/common";

export function normalizeClientPhone(phone: string) {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "");

  if (!digits) {
    throw new BadRequestException("Phone number is required");
  }

  let normalizedDigits = digits;
  if (normalizedDigits.startsWith("00")) {
    normalizedDigits = normalizedDigits.slice(2);
  }

  if (normalizedDigits.startsWith("380") && normalizedDigits.length === 12) {
    return `+${normalizedDigits}`;
  }

  if (normalizedDigits.startsWith("0") && normalizedDigits.length === 10) {
    return `+38${normalizedDigits}`;
  }

  if (normalizedDigits.length >= 10 && normalizedDigits.length <= 15) {
    return `+${normalizedDigits}`;
  }

  throw new BadRequestException("Use a valid phone number");
}
