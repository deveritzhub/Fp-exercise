import { appPool, type Tx } from '../db';
import { agentConfig } from './config';

export type Channel = 'whatsapp' | 'voice';
export type ConversationStatus = 'active' | 'handoff' | 'closed';

export interface Conversation {
  id: number;
  status: ConversationStatus;
  messages: unknown[];
}

/** A WhatsApp customer starts a fresh conversation after this much silence. History stays append-only. */
const IDLE_HOURS = 24;

/** Runs `fn` in a transaction where RLS allows access to the agent tables (and nothing else is set). */
async function withAgent<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  const client = await appPool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.agent', 'on', true)");
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

export function getOrCreateConversation(channel: Channel, sessionKey: string, phone: string): Promise<Conversation> {
  return withAgent(async (tx) => {
    const { rows } = await tx.query(
      `SELECT id, status, messages, updated_at < now() - make_interval(hours => $3) AS idle
         FROM agent_conversations
        WHERE channel = $1 AND session_key = $2 AND status <> 'closed'
        ORDER BY id DESC LIMIT 1`,
      [channel, sessionKey, IDLE_HOURS],
    );
    const row = rows[0];
    if (row && !row.idle) return { id: Number(row.id), status: row.status, messages: row.messages };
    if (row) await tx.query("UPDATE agent_conversations SET status = 'closed' WHERE id = $1", [row.id]);
    const created = await tx.query(
      'INSERT INTO agent_conversations (channel, session_key, customer_phone) VALUES ($1, $2, $3) RETURNING id',
      [channel, sessionKey, phone],
    );
    return { id: Number(created.rows[0].id), status: 'active', messages: [] };
  });
}

export function saveMessages(id: number, messages: unknown[]): Promise<void> {
  return withAgent(async (tx) => {
    await tx.query('UPDATE agent_conversations SET messages = $2::jsonb, updated_at = now() WHERE id = $1', [
      id,
      JSON.stringify(messages),
    ]);
  });
}

export function setStatus(id: number, status: ConversationStatus): Promise<void> {
  return withAgent(async (tx) => {
    await tx.query('UPDATE agent_conversations SET status = $2 WHERE id = $1', [id, status]);
  });
}

export function createCallbackRequest(r: {
  customerName: string;
  customerPhone: string;
  reason: string;
  preference: string;
  channel: Channel;
}): Promise<number> {
  return withAgent(async (tx) => {
    const { rows } = await tx.query(
      `INSERT INTO agent_callback_requests (customer_name, customer_phone, reason, preference, channel)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [r.customerName.slice(0, 200), r.customerPhone, r.reason.slice(0, 1000), r.preference.slice(0, 500), r.channel],
    );
    return Number(rows[0].id);
  });
}

/** True if this webhook message id is new; Meta sometimes delivers a message twice. */
export function markProcessed(messageId: string): Promise<boolean> {
  return withAgent(async (tx) => {
    const { rowCount } = await tx.query(
      'INSERT INTO agent_processed_messages (message_id) VALUES ($1) ON CONFLICT DO NOTHING',
      [messageId.slice(0, 200)],
    );
    return rowCount === 1;
  });
}

/** Deletes assistant data older than the retention period (AVG: keep no longer than needed). */
export function purgeOld(): Promise<void> {
  const days = Number.isFinite(agentConfig.retentionDays) && agentConfig.retentionDays > 0 ? agentConfig.retentionDays : 90;
  return withAgent(async (tx) => {
    await tx.query('DELETE FROM agent_conversations WHERE updated_at < now() - make_interval(days => $1)', [days]);
    await tx.query('DELETE FROM agent_callback_requests WHERE created_at < now() - make_interval(days => $1)', [days]);
    await tx.query("DELETE FROM agent_processed_messages WHERE created_at < now() - interval '7 days'");
  });
}
