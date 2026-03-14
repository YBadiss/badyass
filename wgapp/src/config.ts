import { z } from 'zod';
import dotenv from 'dotenv';

const configSchema = z.object({
  WA_GROUP_JID: z.string().default(''),
  GMAIL_ADDRESS: z.string().email(),
  GMAIL_CLIENT_ID: z.string().min(1),
  GMAIL_CLIENT_SECRET: z.string().min(1),
  GMAIL_REFRESH_TOKEN: z.string().min(1),
  FRIEND_EMAIL: z.string().email(),
  FRIEND_NAME: z.string().min(1),
  EMAIL_SUBJECT: z.string().min(1),
  POLL_INTERVAL_MS: z.coerce.number().int().positive().default(60000),
  WA_OUTBOX_DELAY_MS: z.coerce.number().int().positive().default(30000),
  WA_OUTBOX_MAX_MESSAGES: z.coerce.number().int().positive().default(20),
  STORE_PATH: z.string().default('./store'),
});

export type Config = z.infer<typeof configSchema>;

export function parseConfig(env?: Record<string, string | undefined>): Config {
  if (!env) {
    dotenv.config({ path: process.env.DOTENV_CONFIG_PATH });
    env = process.env as Record<string, string | undefined>;
  }

  const result = configSchema.safeParse(env);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid configuration:\n${issues}`);
  }
  return result.data;
}
