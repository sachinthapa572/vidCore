import * as z from "zod/v4";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  PORT: z.coerce.number().default(9999),
  DATABASE_URL: z.string(),
});

const parseData = EnvSchema.safeParse(Bun.env);

if (parseData.error) {
  // biome-ignore lint/suspicious/noConsole: for debugging purposes
  console.error("❌ Invalid env:");
  const flattened = z.flattenError(parseData.error);
  // biome-ignore lint/suspicious/noConsole: for debugging purposes
  console.error(JSON.stringify(flattened.fieldErrors, null, 2));
  process.exit(1);
}
const appEnv = parseData.data;
export type envBinding = z.infer<typeof EnvSchema>;
export default appEnv;
