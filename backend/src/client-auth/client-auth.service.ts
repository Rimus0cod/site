import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcrypt";
import { Repository } from "typeorm";
import { normalizeTelegramUsername } from "../bookings/booking-rules";
import { ClientAccountEntity } from "./client-account.entity";
import { normalizeClientPhone } from "./client-phone";
import { LoginClientDto } from "./dto/login-client.dto";
import { RegisterClientDto } from "./dto/register-client.dto";

const DUMMY_PIN_HASH = "$2b$12$sl2fL6NLEQJzY8x8W6byb.9NwV7YjDdyCjTiMQuYzfoalGexiBo1u";

@Injectable()
export class ClientAuthService {
  constructor(
    @InjectRepository(ClientAccountEntity)
    private readonly clientAccountRepository: Repository<ClientAccountEntity>,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterClientDto) {
    const phone = normalizeClientPhone(dto.phone);
    const existing = await this.clientAccountRepository.findOne({ where: { phone } });

    if (existing) {
      throw new ConflictException("An account with this phone number already exists");
    }

    const pinHash = await bcrypt.hash(dto.pin, 12);
    const entity = this.clientAccountRepository.create({
      phone,
      name: dto.name.trim(),
      pinHash,
      telegramUsername: normalizeTelegramUsername(dto.telegramUsername),
    });

    const saved = await this.clientAccountRepository.save(entity);
    return {
      accessToken: await this.signClientToken(saved),
      client: this.serializeClient(saved),
    };
  }

  async login(dto: LoginClientDto) {
    const phone = normalizeClientPhone(dto.phone);
    const client = await this.clientAccountRepository.findOne({ where: { phone } });
    const pinHash = client?.pinHash ?? DUMMY_PIN_HASH;
    const pinValid = await bcrypt.compare(dto.pin, pinHash);

    if (!client || !pinValid) {
      throw new UnauthorizedException("Invalid phone or PIN");
    }

    return {
      accessToken: await this.signClientToken(client),
      client: this.serializeClient(client),
    };
  }

  async getClientProfile(id: string) {
    const client = await this.clientAccountRepository.findOne({ where: { id } });
    if (!client) {
      throw new UnauthorizedException("Client session is invalid");
    }

    return this.serializeClient(client);
  }

  async updateTelegramUsername(id: string, telegramUsername?: string | null) {
    const normalized = normalizeTelegramUsername(telegramUsername);
    const client = await this.clientAccountRepository.findOne({ where: { id } });
    if (!client) {
      return null;
    }

    if (client.telegramUsername === normalized) {
      return client;
    }

    client.telegramUsername = normalized;
    return this.clientAccountRepository.save(client);
  }

  private async signClientToken(client: ClientAccountEntity) {
    return this.jwtService.signAsync({
      sub: client.id,
      scope: "client",
      phone: client.phone,
      name: client.name,
      telegramUsername: client.telegramUsername,
    });
  }

  private serializeClient(client: ClientAccountEntity) {
    return {
      id: client.id,
      phone: client.phone,
      name: client.name,
      telegramUsername: client.telegramUsername,
    };
  }
}
