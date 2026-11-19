import dotenv from "dotenv";
import fs from "fs";
import path from "path";

const NODE_ENV = (process.env.NODE_ENV || "development") as
  | "development"
  | "staging"
  | "production";

// Load environment-specific file first, then .env as a fallback.
// dotenv never overrides already-set vars, so .env.<NODE_ENV> always wins.
const envFiles = [`.env.${NODE_ENV}`, ".env"];
for (const file of envFiles) {
  const fullPath = path.resolve(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    dotenv.config({ path: fullPath });
  }
}

function env(key: string): string | undefined;
function env(key: string, fallback: string): string;
function env(key: string, fallback?: string): string | undefined {
  return process.env[key] ?? fallback;
}

export type StorageProviderName =
  | "local"
  | "s3"
  | "cloudinary"
  | "firebase";

const STORAGE_PROVIDERS: StorageProviderName[] = [
  "local",
  "s3",
  "cloudinary",
  "firebase",
];

const storageProvider = (env("STORAGE_PROVIDER", "local") ||
  "local") as StorageProviderName;
if (!STORAGE_PROVIDERS.includes(storageProvider)) {
  throw new Error(
    `Invalid STORAGE_PROVIDER "${storageProvider}". Allowed: ${STORAGE_PROVIDERS.join(
      ", "
    )}`
  );
}

const rabbitUrl =
  env("RABBITMQ_URL") ||
  `amqp://${env("RABBITMQ_USERNAME")}:${env("RABBITMQ_PASSWORD")}@${env(
    "RABBITMQ_HOST"
  )}:${env("RABBITMQ_PORT")}`;

const config = {
  NODE_ENV,
  isProduction: NODE_ENV === "production",
  isStaging: NODE_ENV === "staging",

  PORT: Number(env("PORT")),
  BASE_URL: env("BASE_URL"),
  MONGO_URI: env("MONGO_URI"),
  FRONTEND_URL: env("FRONTEND_URL"),

  JWT_SECRET: env("JWT_SECRET"),
  REFRESH_TOKEN_SECRET: env("REFRESH_TOKEN_SECRET"),
  JWT_EXPIRE: env("JWT_EXPIRE", "1h"),

  BCRYPT_ROUNDS: Number(env("BCRYPT_ROUNDS", "12")),

  EMAIL_HOST: env("EMAIL_HOST"),
  EMAIL_PORT: env("EMAIL_PORT"),
  EMAIL_USER: env("EMAIL_USER"),
  EMAIL_PASSWORD: env("EMAIL_PASSWORD"),

  REDIS_HOST: env("REDIS_HOST"),
  REDIS_PORT: env("REDIS_PORT"),
  REDIS_PASSWORD: env("REDIS_PASSWORD"),
  REDIS_USERNAME: env("REDIS_USERNAME"),

  RABBITMQ_URL: rabbitUrl,
  RABBITMQ_HOST: env("RABBITMQ_HOST"),
  RABBITMQ_PORT: env("RABBITMQ_PORT"),
  RABBITMQ_USERNAME: env("RABBITMQ_USERNAME"),
  RABBITMQ_PASSWORD: env("RABBITMQ_PASSWORD"),

  // File upload / storage
  UPLOAD_BASE_DIR: env("UPLOAD_BASE_DIR", "uploads"),
  UPLOAD_MAX_SIZE: Number(env("UPLOAD_MAX_SIZE", "10485760")),
  ALLOWED_FILE_TYPES: (env("ALLOWED_FILE_TYPES", "") || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean),
  STORAGE_PROVIDER: storageProvider,

  AWS_REGION: env("AWS_REGION"),
  AWS_ACCESS_KEY_ID: env("AWS_ACCESS_KEY_ID"),
  AWS_SECRET_ACCESS_KEY: env("AWS_SECRET_ACCESS_KEY"),
  AWS_S3_BUCKET: env("AWS_S3_BUCKET"),
  AWS_S3_ENDPOINT: env("AWS_S3_ENDPOINT"),
  AWS_PUBLIC_URL: env("AWS_PUBLIC_URL"),
  CLOUDINARY_CLOUD_NAME: env("CLOUDINARY_CLOUD_NAME"),
  CLOUDINARY_API_KEY: env("CLOUDINARY_API_KEY"),
  CLOUDINARY_API_SECRET: env("CLOUDINARY_API_SECRET"),
  CLOUDINARY_FOLDER: env("CLOUDINARY_FOLDER"),

  FIREBASE_STORAGE_BUCKET: env("FIREBASE_STORAGE_BUCKET"),

  TWILIO_SID: env("TWILIO_SID"),
  TWILIO_AUTH_TOKEN: env("TWILIO_AUTH_TOKEN"),
  TWILIO_PHONE_NUMBER: env("TWILIO_PHONE_NUMBER"),

  CORS_ORIGIN: (env("CORS_ORIGIN", "") || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  CORS_CREDENTIALS: env("CORS_CREDENTIALS") !== "false",

  LOG_LEVEL: env("LOG_LEVEL", NODE_ENV === "production" ? "info" : "debug"),
  LOG_FILE: env("LOG_FILE", "logs/combined.log"),

  // Hybrid payload encryption (RSA-OAEP wrapped AES-256-GCM session keys).
  // When enabled, requests that send the `isencrypted: true` header get
  // their body decrypted and JSON responses returned as { iv, data }.
  ENCRYPTION_ENABLED: env("ENCRYPTION_ENABLED") === "true",
  ENCRYPTION_PRIVATE_KEY_PATH: env(
    "ENCRYPTION_PRIVATE_KEY_PATH",
    "keys/private.pem"
  ),
  ENCRYPTION_PUBLIC_KEY_PATH: env(
    "ENCRYPTION_PUBLIC_KEY_PATH",
    "keys/public.pem"
  ),
  ENCRYPTION_MAX_AGE_MS: Number(env("ENCRYPTION_MAX_AGE_MS", "300000")),

  // Auto-generated Swagger docs at /api-docs
  SWAGGER_ENABLED: env("SWAGGER_ENABLED") !== "false",
  SWAGGER_TITLE: env("SWAGGER_TITLE", "API Documentation"),

  // Run seeders automatically on server boot
  SEED_ON_BOOT: env("SEED_ON_BOOT") === "true",
};

// Only truly required values are validated here. Provider-specific
// credentials are validated lazily by the selected storage provider.
const requiredFields: (keyof typeof config)[] = [
  "PORT",
  "MONGO_URI",
  "JWT_SECRET",
  "REFRESH_TOKEN_SECRET",
  "FRONTEND_URL",
  "BASE_URL",
];

for (const field of requiredFields) {
  const value = config[field];
  if (value === undefined || value === null || value === "" || (typeof value === "number" && Number.isNaN(value))) {
    throw new Error(
      `Missing required environment configuration: ${field} (NODE_ENV=${NODE_ENV})`
    );
  }
}

if (config.ENCRYPTION_ENABLED && !config.ENCRYPTION_MAX_AGE_MS) {
  throw new Error("ENCRYPTION_MAX_AGE_MS must be a positive number");
}

export { NODE_ENV };
export default config;
