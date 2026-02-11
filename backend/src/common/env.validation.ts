import { z } from 'zod';

export const envSchema = z.object({
  PORT: z.string().transform(Number).optional().default('3001'),
  MONGO_URI: z.string().url(),
  CLIENT_URL: z.string().url().optional(),
  JWT_SECRET: z.string().min(5),
});

export type Env = z.infer<typeof envSchema>;

export const validate = (config: Record<string, unknown>) => {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Config validation error: ${result.error.toString()}`);
  }
  return result.data;
};
