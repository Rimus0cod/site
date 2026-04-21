import assert from "node:assert/strict";
import {
  combineDateAndTime,
  formatDatePart,
  formatDateTime,
  isPositiveRange,
  normalizeTelegramUsername,
  normalizeTime,
} from "./booking-rules";

assert.equal(normalizeTelegramUsername("@Barber_User"), "barber_user");
assert.equal(normalizeTelegramUsername(""), null);

assert.equal(normalizeTime("09:30"), "09:30:00");
assert.equal(normalizeTime("09:30:15"), "09:30:15");

const value = combineDateAndTime("2026-04-21", "14:45");
assert.equal(formatDatePart(value), "2026-04-21");
assert.equal(formatDateTime(value), "2026-04-21T14:45:00");

assert.equal(isPositiveRange("09:00", "18:00"), true);
assert.equal(isPositiveRange("18:00", "09:00"), false);
assert.equal(isPositiveRange(null, "09:00"), false);

console.log("booking-rules tests passed");
