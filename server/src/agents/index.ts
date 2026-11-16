import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { agentConfig, twilioConfigured, whatsappConfigured } from './config';
import { voiceRoutes } from './voice';
import { whatsappRoutes } from './whatsapp';

/**
 * WhatsApp and phone assistant for the practice (Claude). Mounted at /agents, outside /api: these
 * endpoints are called by Meta and Twilio, which authenticate with signatures instead of sessions.
 */
export const agentRoutes = new Hono();

agentRoutes.use('*', bodyLimit({ maxSize: 1024 * 1024, onError: (c) => c.json({ error: 'request_too_large' }, 413) }));
agentRoutes.use('*', async (c, next) => {
  await next();
  c.header('Cache-Control', 'no-store');
});

/** Which channels are configured (no secrets). */
agentRoutes.get('/health', (c) =>
  c.json({ claude: agentConfig.anthropicConfigured(), whatsapp: whatsappConfigured(), voice: twilioConfigured() }),
);
agentRoutes.route('/whatsapp', whatsappRoutes);
agentRoutes.route('/voice', voiceRoutes);
agentRoutes.all('*', (c) => c.json({ error: 'not_found' }, 404));
