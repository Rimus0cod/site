import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaymentPolicy } from "../common/enums/payment-policy.enum";
import { CreateServiceDto } from "./dto/create-service.dto";
import { UpdateServiceDto } from "./dto/update-service.dto";
import { ServiceEntity } from "./service.entity";

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(ServiceEntity)
    private readonly serviceRepository: Repository<ServiceEntity>,
  ) {}

  listPublic() {
    return this.serviceRepository.find({
      where: { isActive: true },
      order: { createdAt: "ASC" },
    });
  }

  listAdmin() {
    return this.serviceRepository.find({ order: { createdAt: "ASC" } });
  }

  async getOrFail(id: string) {
    const service = await this.serviceRepository.findOne({ where: { id } });
    if (!service) {
      throw new NotFoundException("Service not found");
    }

    return service;
  }

  create(dto: CreateServiceDto) {
    const paymentConfig = this.normalizePaymentConfig(dto.paymentPolicy, dto.depositValue);
    return this.serviceRepository.save(
      this.serviceRepository.create({
        ...dto,
        description: dto.description ?? null,
        price: dto.price.toFixed(2),
        paymentPolicy: paymentConfig.paymentPolicy,
        depositValue: paymentConfig.depositValue,
        isActive: dto.isActive ?? true,
      }),
    );
  }

  async update(id: string, dto: UpdateServiceDto) {
    const service = await this.getOrFail(id);
    const paymentPolicy = dto.paymentPolicy ?? service.paymentPolicy;
    const depositValue =
      dto.depositValue !== undefined ? dto.depositValue : service.depositValue ? Number(service.depositValue) : null;
    const paymentConfig = this.normalizePaymentConfig(paymentPolicy, depositValue);
    Object.assign(service, {
      ...dto,
      price: dto.price !== undefined ? dto.price.toFixed(2) : service.price,
      paymentPolicy: paymentConfig.paymentPolicy,
      depositValue: paymentConfig.depositValue,
    });
    return this.serviceRepository.save(service);
  }

  async remove(id: string) {
    const service = await this.getOrFail(id);
    await this.serviceRepository.remove(service);
    return { success: true };
  }

  private normalizePaymentConfig(
    paymentPolicy?: PaymentPolicy,
    depositValue?: number | null,
  ) {
    const resolvedPolicy = paymentPolicy ?? PaymentPolicy.DepositPercent;
    const normalizedDepositValue = depositValue ?? null;

    if (resolvedPolicy === PaymentPolicy.Offline || resolvedPolicy === PaymentPolicy.FullPrepayment) {
      return {
        paymentPolicy: resolvedPolicy,
        depositValue: resolvedPolicy === PaymentPolicy.FullPrepayment ? null : null,
      };
    }

    if (normalizedDepositValue === null || normalizedDepositValue <= 0) {
      throw new BadRequestException("Deposit value must be greater than zero for the selected payment policy");
    }

    if (resolvedPolicy === PaymentPolicy.DepositPercent && normalizedDepositValue > 100) {
      throw new BadRequestException("Deposit percent cannot be greater than 100");
    }

    return {
      paymentPolicy: resolvedPolicy,
      depositValue: normalizedDepositValue.toFixed(2),
    };
  }
}
