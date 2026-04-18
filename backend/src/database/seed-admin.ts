import * as bcrypt from "bcrypt";
import { DataSource } from "typeorm";
import configuration from "../config/configuration";
import { AdminEntity } from "../common/entities/admin.entity";

async function seedAdmin() {
  const config = configuration();
  const dataSource = new DataSource({
    type: "postgres",
    host: config.database.host,
    port: config.database.port,
    username: config.database.user,
    password: config.database.password,
    database: config.database.name,
    entities: [AdminEntity],
  });

  await dataSource.initialize();
  const repository = dataSource.getRepository(AdminEntity);

  const existing = await repository.findOne({
    where: { email: config.admin.email },
  });

  if (existing) {
    await dataSource.destroy();
    return;
  }

  const passwordHash = await bcrypt.hash(config.admin.password, 10);
  await repository.save(
    repository.create({
      email: config.admin.email,
      passwordHash,
      role: "admin",
    }),
  );

  await dataSource.destroy();
}

seedAdmin().catch((error) => {
  console.error(error);
  process.exit(1);
});
