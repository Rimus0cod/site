import "reflect-metadata";
import { DataSource } from "typeorm";
import configuration from "../config/configuration";
import { DATABASE_ENTITIES } from "./entities";
import { DATABASE_MIGRATIONS } from "./migrations";

const config = configuration();

const AppDataSource = new DataSource({
  type: "postgres",
  host: config.database.host,
  port: config.database.port,
  username: config.database.user,
  password: config.database.password,
  database: config.database.name,
  entities: DATABASE_ENTITIES,
  migrations: DATABASE_MIGRATIONS,
  synchronize: false,
});

export default AppDataSource;
