import { ConfigService } from "@nestjs/config";

export function createTypeOrmOptions(configService: ConfigService) {
  return {
    type: "postgres" as const,
    host: configService.get<string>("database.host"),
    port: configService.get<number>("database.port"),
    username: configService.get<string>("database.user"),
    password: configService.get<string>("database.password"),
    database: configService.get<string>("database.name"),
    autoLoadEntities: false,
    synchronize: configService.get<boolean>("database.synchronize") ?? false,
  };
}
