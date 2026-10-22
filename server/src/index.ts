import { serve } from '@hono/node-server';
import { config } from './config';
import { createApp } from './app';
import { startReminderScheduler } from './auth/push';

const app = createApp();
serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`FP Exercise API listening on http://localhost:${info.port} (${config.env})`);
});

if (process.env.DISABLE_REMINDERS !== '1') startReminderScheduler();
