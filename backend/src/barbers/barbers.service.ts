import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CreateBarberDto } from "./dto/create-barber.dto";
import { UpdateBarberDto } from "./dto/update-barber.dto";
import { BarberEntity } from "./barber.entity";

@Injectable()
export class BarbersService {
  constructor(
    @InjectRepository(BarberEntity)
    private readonly barberRepository: Repository<BarberEntity>,
  ) {}

  listPublic() {
    return this.barberRepository.find({
      where: { isActive: true },
      order: { createdAt: "ASC" },
    });
  }

  listAdmin() {
    return this.barberRepository.find({ order: { createdAt: "ASC" } });
  }

  async getOrFail(id: string) {
    const barber = await this.barberRepository.findOne({ where: { id } });
    if (!barber) {
      throw new NotFoundException("Barber not found");
    }

    return barber;
  }

  async create(dto: CreateBarberDto) {
    const barber = this.barberRepository.create({
      name: dto.name,
      bio: dto.bio ?? null,
      photoUrl: dto.photoUrl ?? null,
      isActive: dto.isActive ?? true,
    });

    return this.barberRepository.save(barber);
  }

  async update(id: string, dto: UpdateBarberDto) {
    const barber = await this.getOrFail(id);
    Object.assign(barber, dto);
    return this.barberRepository.save(barber);
  }

  async remove(id: string) {
    const barber = await this.getOrFail(id);
    await this.barberRepository.remove(barber);
    return { success: true };
  }
}

