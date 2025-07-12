import * as z from "zod/v4";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  PORT: z.coerce.number().default(9999),
  DATABASE_URL: z.string(),
  IMAGEKIT_PUBLIC_KEY: z.string({ error: "Invalid ImageKit public key" }),
  IMAGEKIT_PRIVATE_KEY: z.string({ error: "Invalid ImageKit private key" }),
  IMAGEKIT_URL_ENDPOINT: z.url({ error: "Invalid ImageKit URL endpoint" }),
  JWT_SECRET: z.string({ error: "Invalid JWT secret" }),
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
