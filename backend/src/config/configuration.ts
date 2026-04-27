import * as Joi from "joi";

const PRODUCTION_PLACEHOLDER_VALUES = [
  "secret",
  "ChangeMe123!",
  "change-me-to-a-very-long-secret",
  "REPLACE_WITH_STRONG_DB_PASSWORD",
  "REPLACE_WITH_LONG_RANDOM_JWT_SECRET",
  "REPLACE_WITH_ADMIN_PASSWORD",
] as const;

const PRODUCTION_PLACEHOLDER_PREFIX = /^REPLACE_WITH_/;

function isProductionNodeEnv(env: NodeJS.ProcessEnv | Record<string, unknown>) {
  return String(env.NODE_ENV ?? "development") === "production";
}

function withNonProductionDefault(value: string | undefined, fallback: string) {
  return isProductionNodeEnv(process.env) ? (value ?? "") : (value ?? fallback);
}

function rejectProductionPlaceholders(label: string) {
  return (value: string, helpers: Joi.CustomHelpers) => {
    const root = (helpers.state.ancestors[0] ?? process.env) as Record<string, unknown>;
    const isProduction = isProductionNodeEnv(root);
    const isPlaceholder =
      PRODUCTION_PLACEHOLDER_VALUES.includes(value as (typeof PRODUCTION_PLACEHOLDER_VALUES)[number]) ||
      PRODUCTION_PLACEHOLDER_PREFIX.test(value);

    if (isProduction && isPlaceholder) {
      return helpers.error("any.invalid", { label });
    }

    return value;
  };
}

function secureUrlSchema(label: string) {
  return Joi.alternatives().conditional("NODE_ENV", {
    is: "production",
    then: Joi.string().uri({ scheme: ["https"] }).required().messages({
      "string.uri": `${label} must be a valid HTTPS URL in production`,
    }),
    otherwise: Joi.string().uri().required(),
  });
}

export default () => ({
  app: {
    nodeEnv: process.env.NODE_ENV ?? "development",
    port: Number(process.env.PORT ?? 3001),
    frontendUrl: withNonProductionDefault(process.env.FRONTEND_URL, "http://localhost:3000"),
    backendPublicUrl: withNonProductionDefault(
      process.env.BACKEND_PUBLIC_URL,
      `http://localhost:${Number(process.env.PORT ?? 3001)}`,
    ),
  },
  database: {
    host: process.env.DB_HOST ?? "postgres",
    port: Number(process.env.DB_PORT ?? 5432),
    name: process.env.DB_NAME ?? "barbershop",
    user: process.env.DB_USER ?? "barber",
    password: withNonProductionDefault(process.env.DB_PASSWORD, "secret"),
    synchronize: process.env.DB_SYNCHRONIZE === "true",
  },
  redis: {
    host: process.env.REDIS_HOST ?? "redis",
    port: Number(process.env.REDIS_PORT ?? 6379),
  },
  backup: {
    statusFile: process.env.BACKUP_STATUS_FILE ?? "/var/lib/barberbook/backup-state/last-success.json",
    maxAgeHours: Number(process.env.BACKUP_MAX_AGE_HOURS ?? 24),
  },
  jwt: {
    secret: withNonProductionDefault(process.env.JWT_SECRET, "change-me-to-a-very-long-secret"),
    expiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  },
  admin: {
    email: process.env.ADMIN_EMAIL ?? "admin@example.com",
    password: withNonProductionDefault(process.env.ADMIN_PASSWORD, "ChangeMe123!"),
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
    adminChatId: process.env.TELEGRAM_ADMIN_CHAT_ID ?? "",
    mode:
      process.env.TELEGRAM_MODE ??
      (process.env.NODE_ENV === "test"
        ? "disabled"
        : process.env.NODE_ENV === "production"
          ? "outbound"
          : "polling"),
  },
  payments: {
    defaultProvider: isProductionNodeEnv(process.env)
      ? (process.env.PAYMENT_PROVIDER ?? "")
      : (process.env.PAYMENT_PROVIDER ?? "mock"),
    reconciliationIntervalMs: Number(process.env.PAYMENT_RECONCILIATION_INTERVAL_MS ?? 300000),
    liqpay: {
      publicKey: process.env.LIQPAY_PUBLIC_KEY ?? "",
      privateKey: process.env.LIQPAY_PRIVATE_KEY ?? "",
      sandbox: process.env.LIQPAY_SANDBOX === "true",
    },
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY ?? "",
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? "",
    },
  },
});

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid("development", "test", "production").default("development"),
  PORT: Joi.number().default(3001),
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_NAME: Joi.string().required(),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.alternatives().conditional("NODE_ENV", {
    is: "production",
    then: Joi.string().min(12).custom(rejectProductionPlaceholders("DB_PASSWORD")).required().messages({
      "string.min": "DB_PASSWORD must be at least 12 characters in production",
      "any.invalid": "DB_PASSWORD contains a placeholder value that is not allowed in production",
    }),
    otherwise: Joi.string().min(1).required(),
  }),
  DB_SYNCHRONIZE: Joi.boolean().truthy("true").falsy("false").optional(),
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().default(6379),
  BACKUP_STATUS_FILE: Joi.string().optional(),
  BACKUP_MAX_AGE_HOURS: Joi.number().positive().default(24),
  JWT_SECRET: Joi.alternatives().conditional("NODE_ENV", {
    is: "production",
    then: Joi.string().min(32).custom(rejectProductionPlaceholders("JWT_SECRET")).required().messages({
      "string.min": "JWT_SECRET must be at least 32 characters in production",
      "any.invalid": "JWT_SECRET contains a placeholder value that is not allowed in production",
    }),
    otherwise: Joi.string().min(16).required(),
  }),
  JWT_EXPIRES_IN: Joi.string().default("7d"),
  ADMIN_EMAIL: Joi.string().email().required(),
  ADMIN_PASSWORD: Joi.alternatives().conditional("NODE_ENV", {
    is: "production",
    then: Joi.string().min(12).custom(rejectProductionPlaceholders("ADMIN_PASSWORD")).required().messages({
      "string.min": "ADMIN_PASSWORD must be at least 12 characters in production",
      "any.invalid": "ADMIN_PASSWORD contains a placeholder value that is not allowed in production",
    }),
    otherwise: Joi.string().min(8).required(),
  }),
  TELEGRAM_BOT_TOKEN: Joi.string().allow(""),
  TELEGRAM_ADMIN_CHAT_ID: Joi.string().allow(""),
  TELEGRAM_MODE: Joi.string().valid("disabled", "outbound", "polling").optional(),
  FRONTEND_URL: secureUrlSchema("FRONTEND_URL"),
  BACKEND_PUBLIC_URL: Joi.alternatives().conditional("NODE_ENV", {
    is: "production",
    then: Joi.string().uri({ scheme: ["https"] }).required().messages({
      "string.uri": "BACKEND_PUBLIC_URL must be a valid HTTPS URL in production",
    }),
    otherwise: Joi.string().uri().optional(),
  }),
  PAYMENT_PROVIDER: Joi.alternatives().conditional("NODE_ENV", {
    is: "production",
    then: Joi.string().valid("liqpay", "stripe").required().messages({
      "any.only": "PAYMENT_PROVIDER=mock is not allowed in production",
    }),
    otherwise: Joi.string().valid("mock", "liqpay", "stripe").default("mock"),
  }),
  PAYMENT_RECONCILIATION_INTERVAL_MS: Joi.number().integer().positive().default(300000),
  LIQPAY_PUBLIC_KEY: Joi.when("PAYMENT_PROVIDER", {
    is: "liqpay",
    then: Joi.string().min(1).required(),
    otherwise: Joi.string().allow(""),
  }),
  LIQPAY_PRIVATE_KEY: Joi.when("PAYMENT_PROVIDER", {
    is: "liqpay",
    then: Joi.string().min(1).required(),
    otherwise: Joi.string().allow(""),
  }),
  LIQPAY_SANDBOX: Joi.boolean().truthy("true").falsy("false").optional(),
  STRIPE_SECRET_KEY: Joi.when("PAYMENT_PROVIDER", {
    is: "stripe",
    then: Joi.string().min(1).required(),
    otherwise: Joi.string().allow(""),
  }),
  STRIPE_WEBHOOK_SECRET: Joi.when("PAYMENT_PROVIDER", {
    is: "stripe",
    then: Joi.string().min(1).required(),
    otherwise: Joi.string().allow(""),
  }),
  STRIPE_PUBLISHABLE_KEY: Joi.when("PAYMENT_PROVIDER", {
    is: "stripe",
    then: Joi.string().min(1).required(),
    otherwise: Joi.string().allow(""),
  }),
}).unknown(true);

export function validateEnvironment(env: NodeJS.ProcessEnv = process.env) {
  const { error, value } = envValidationSchema.validate(env, {
    abortEarly: false,
    allowUnknown: true,
  });

  if (error) {
    const details = error.details
      .map((entry) => `${entry.path.join(".")}: ${entry.message}`)
      .join("; ");

    throw new Error(`Environment validation failed: ${details}`);
  }

  return value;
}
