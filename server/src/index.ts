import { serve } from '@hono/node-server';
import { config } from './config';
import { createApp } from './app';

const app = createApp();
serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`FP Exercise API listening on http://localhost:${info.port} (${config.env})`);
});
