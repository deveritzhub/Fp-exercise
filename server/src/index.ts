import { serve } from '@hono/node-server';
import { checkMailConfig } from './auth/mailer';
import { config } from './config';
import { createApp } from './app';
import { startReminderScheduler } from './auth/push';

const app = createApp();
checkMailConfig();
serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`FP Flow API listening on http://localhost:${info.port} (${config.env})`);
});

if (process.env.DISABLE_REMINDERS !== '1') startReminderScheduler();
