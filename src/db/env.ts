import * as z from "zod/v4";

import { StorageServiceType } from "@/enum/index.enum";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  PORT: z.coerce.number().default(9999),
  DATABASE_URL: z.string(),
  IMAGEKIT_PUBLIC_KEY: z.string({ error: "Invalid ImageKit public key" }),
  IMAGEKIT_PRIVATE_KEY: z.string({ error: "Invalid ImageKit private key" }),
  IMAGEKIT_URL_ENDPOINT: z.url({ error: "Invalid ImageKit URL endpoint" }),
  JWT_SECRET: z.string({ error: "Invalid JWT secret" }),
  VIDEO_STORAGE_TYPE: z.enum(StorageServiceType).default(StorageServiceType.LOCAL),
  THUMBNAIL_STORAGE_TYPE: z.enum(StorageServiceType).default(StorageServiceType.LOCAL),
  AWS_ACCESS_KEY_ID: z.string().min(20).max(100).default(""),
  AWS_SECRET_ACCESS_KEY: z.string().min(40).max(100).default(""),
  AWS_REGION: z.string().min(2).max(100).default("us-east-1"),
  AWS_BUCKET_NAME: z.string().min(2).max(100).default("default-bucket"),
});

const parseData = EnvSchema.safeParse(Bun.env);

if (parseData.error) {
  console.error("❌ Invalid env:");
  const flattened = z.flattenError(parseData.error);
  console.error(JSON.stringify(flattened.fieldErrors, null, 2));
  process.exit(1);
}
const appEnv = parseData.data;
export type envBinding = z.infer<typeof EnvSchema>;
export default appEnv;
