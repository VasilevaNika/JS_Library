// Журнал действий MCP-сервера: кто, когда, какой инструмент, с какими параметрами и чем закончилось.
import { getDb } from './client';
import { now } from './time';

export type AuditEntry = {
  id: number;
  at: number;
  userEmail: string;
  tool: string;
  params: string;
  ok: boolean;
  result: string;
};

export async function logAudit(entry: { userEmail: string; tool: string; params: unknown; ok: boolean; result: string }): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO mcp_audit (at, user_email, tool, params, ok, result) VALUES (?, ?, ?, ?, ?, ?)',
    now(),
    entry.userEmail,
    entry.tool,
    JSON.stringify(entry.params ?? {}),
    entry.ok ? 1 : 0,
    entry.result,
  );
}

export async function listAudit(limit = 50): Promise<AuditEntry[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ id: number; at: number; user_email: string; tool: string; params: string; ok: number; result: string }>(
    'SELECT * FROM mcp_audit ORDER BY id DESC LIMIT ?',
    limit,
  );
  return rows.map((r) => ({ id: r.id, at: r.at, userEmail: r.user_email, tool: r.tool, params: r.params, ok: r.ok === 1, result: r.result }));
}
