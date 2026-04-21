import * as Joi from "joi";

export default () => ({
  app: {
    nodeEnv: process.env.NODE_ENV ?? "development",
    port: Number(process.env.PORT ?? 3001),
    frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3000",
  },
  database: {
    host: process.env.DB_HOST ?? "postgres",
    port: Number(process.env.DB_PORT ?? 5432),
    name: process.env.DB_NAME ?? "barbershop",
    user: process.env.DB_USER ?? "barber",
    password: process.env.DB_PASSWORD ?? "secret",
    synchronize: process.env.DB_SYNCHRONIZE === "true",
  },
  redis: {
    host: process.env.REDIS_HOST ?? "redis",
    port: Number(process.env.REDIS_PORT ?? 6379),
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? "change-me-to-a-very-long-secret",
    expiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  },
  admin: {
    email: process.env.ADMIN_EMAIL ?? "admin@barberbook.local",
    password: process.env.ADMIN_PASSWORD ?? "ChangeMe123!",
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
    adminChatId: process.env.TELEGRAM_ADMIN_CHAT_ID ?? "",
  },
});

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid("development", "test", "production").default("development"),
  PORT: Joi.number().default(3001),
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_NAME: Joi.string().required(),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().allow("").required(),
  DB_SYNCHRONIZE: Joi.boolean().truthy("true").falsy("false").optional(),
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().default(6379),
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default("7d"),
  ADMIN_EMAIL: Joi.string().email().required(),
  ADMIN_PASSWORD: Joi.string().min(8).required(),
  TELEGRAM_BOT_TOKEN: Joi.string().allow(""),
  TELEGRAM_ADMIN_CHAT_ID: Joi.string().allow(""),
  FRONTEND_URL: Joi.string().uri().required(),
});
