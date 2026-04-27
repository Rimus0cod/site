import "reflect-metadata";
import * as bcrypt from "bcrypt";
import { AdminEntity } from "../common/entities/admin.entity";
import AppDataSource from "./data-source";

async function seedAdmin() {
  await AppDataSource.initialize();
  await AppDataSource.runMigrations();
  const repository = AppDataSource.getRepository(AdminEntity);
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "ChangeMe123!";

  const existing = await repository.findOne({
    where: { email: adminEmail },
  });

  if (existing) {
    await AppDataSource.destroy();
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);
  await repository.save(
    repository.create({
      email: adminEmail,
      passwordHash,
      role: "admin",
    }),
  );

  await AppDataSource.destroy();
}

seedAdmin().catch((error) => {
  console.error(error);
  process.exit(1);
});
