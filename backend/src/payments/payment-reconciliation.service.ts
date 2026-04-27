import { Injectable, Logger } from "@nestjs/common";
import { PaymentsService } from "./payments.service";

@Injectable()
export class PaymentReconciliationService {
  private readonly logger = new Logger(PaymentReconciliationService.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  async reconcile() {
    try {
      const result = await this.paymentsService.reconcilePendingPayments();
      if (result.updated > 0) {
        this.logger.log(
          `Reconciled ${result.updated} payment(s) out of ${result.checked} pending record(s).`,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown reconciliation error";
      this.logger.warn(`Payment reconciliation failed: ${message}`);
    }
  }
}
