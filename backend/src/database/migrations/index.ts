import { InitialSchema1713810000000 } from "./1713810000000-InitialSchema";
import { BackfillBookingManageTokens1713811000000 } from "./1713811000000-BackfillBookingManageTokens";
import { HashBookingManageTokens1713812000000 } from "./1713812000000-HashBookingManageTokens";
import { ClientAccountsAndPhoneLimits1713813000000 } from "./1713813000000-ClientAccountsAndPhoneLimits";
import { BookingPaymentsMvp1713814000000 } from "./1713814000000-BookingPaymentsMvp";
import { PaymentRefundsAndLifecycle1713815000000 } from "./1713815000000-PaymentRefundsAndLifecycle";
import { AdminAuditLogs1713816000000 } from "./1713816000000-AdminAuditLogs";

export const DATABASE_MIGRATIONS = [
  InitialSchema1713810000000,
  BackfillBookingManageTokens1713811000000,
  HashBookingManageTokens1713812000000,
  ClientAccountsAndPhoneLimits1713813000000,
  BookingPaymentsMvp1713814000000,
  PaymentRefundsAndLifecycle1713815000000,
  AdminAuditLogs1713816000000,
];
