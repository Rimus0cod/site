import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
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
    return this.serviceRepository.save(
      this.serviceRepository.create({
        ...dto,
        description: dto.description ?? null,
        price: dto.price.toFixed(2),
        isActive: dto.isActive ?? true,
      }),
    );
  }

  async update(id: string, dto: UpdateServiceDto) {
    const service = await this.getOrFail(id);
    Object.assign(service, {
      ...dto,
      price: dto.price !== undefined ? dto.price.toFixed(2) : service.price,
    });
    return this.serviceRepository.save(service);
  }

  async remove(id: string) {
    const service = await this.getOrFail(id);
    await this.serviceRepository.remove(service);
    return { success: true };
  }
}

