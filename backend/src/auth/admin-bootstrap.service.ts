import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcrypt";
import { Repository } from "typeorm";
import { AdminEntity } from "../common/entities/admin.entity";

@Injectable()
export class AdminBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminBootstrapService.name);

  constructor(
    @InjectRepository(AdminEntity)
    private readonly adminRepository: Repository<AdminEntity>,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    const email = this.configService.get<string>("admin.email");
    const password = this.configService.get<string>("admin.password");

    if (!email || !password) {
      return;
    }

    const existing = await this.adminRepository
      .createQueryBuilder("admin")
      .where("LOWER(admin.email) = LOWER(:email)", { email })
      .getOne();

    if (existing) {
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    try {
      await this.adminRepository.save(
        this.adminRepository.create({
          email,
          passwordHash,
          role: "admin",
        }),
      );
      this.logger.log(`Bootstrap admin created for ${email}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (message.includes("duplicate key")) {
        this.logger.warn(`Bootstrap admin for ${email} was created by another process.`);
        return;
      }

      throw error;
    }
  }
}
