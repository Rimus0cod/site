import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcrypt";
import { Repository } from "typeorm";
import { AdminEntity } from "../common/entities/admin.entity";
import { LoginDto } from "./dto/login.dto";

const DUMMY_PASSWORD_HASH = "$2b$12$sl2fL6NLEQJzY8x8W6byb.9NwV7YjDdyCjTiMQuYzfoalGexiBo1u";

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(AdminEntity)
    private readonly adminRepository: Repository<AdminEntity>,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const admin = await this.adminRepository
      .createQueryBuilder("admin")
      .where("LOWER(admin.email) = :email", { email: dto.email })
      .getOne();
    const passwordHash = admin?.passwordHash ?? DUMMY_PASSWORD_HASH;
    const passwordValid = await bcrypt.compare(dto.password, passwordHash);

    if (!admin || !passwordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const accessToken = await this.jwtService.signAsync({
      sub: admin.id,
      role: admin.role,
      email: admin.email,
    });

    return {
      accessToken,
      admin: {
        id: admin.id,
        email: admin.email,
        role: admin.role,
      },
    };
  }

  async getAdminProfile(id: string) {
    const admin = await this.adminRepository.findOne({ where: { id } });
    if (!admin) {
      throw new UnauthorizedException("Admin session is invalid");
    }

    return {
      id: admin.id,
      email: admin.email,
      role: admin.role,
    };
  }
}
