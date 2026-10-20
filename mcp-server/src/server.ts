// Сборка MCP-сервера: регистрирует инструменты, проверяет роль, ловит ошибки
// и записывает каждое изменяющее действие в журнал mcp_audit.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { logAudit, type User } from '@/db';
import { RemoteUnavailableError } from '@/db/remote';

import { requireRole, UserError, type Context } from './context';
import { TOOLS, type AnyTool } from './tools';

export const SERVER_INSTRUCTIONS =
  'Сервер библиотеки кампуса. Действует от имени одного пользователя (студента или модератора). ' +
  'Номер книги берите из search_books, код брони — из list_my_bookings или list_journal. ' +
  'Для опасных действий (отмена брони, выдача, возврат, правка и удаление книги, импорт, расхождение) ' +
  'сначала вызывайте без confirm, покажите человеку ответ и передавайте confirm: true только после его согласия.';

async function runTool(tool: AnyTool, args: Record<string, unknown>, ctx: Context): Promise<{ ok: boolean; text: string }> {
  try {
    const user: User | null = tool.role === 'any' ? null : await requireRole(ctx, tool.role);
    return { ok: true, text: await tool.run(args, ctx, user) };
  } catch (e) {
    if (e instanceof UserError) return { ok: false, text: e.message };
    if (e instanceof RemoteUnavailableError) return { ok: false, text: e.message };
    // Неожиданная ошибка — подробности в журнал процесса (stderr), человеку — понятный текст.
    console.error(`[${tool.name}]`, e);
    return { ok: false, text: 'Не удалось выполнить действие из-за внутренней ошибки. Попробуйте ещё раз.' };
  }
}

/** Параметры для журнала: пароль не сохраняется. */
function auditParams(args: Record<string, unknown>): Record<string, unknown> {
  return 'password' in args ? { ...args, password: '***' } : args;
}

export function createServer(ctx: Context): McpServer {
  const server = new McpServer(
    { name: 'campus-library', version: '1.0.0' },
    { instructions: SERVER_INSTRUCTIONS },
  );
  for (const tool of TOOLS) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.input,
        annotations: { readOnlyHint: !tool.mutating },
      },
      async (args: Record<string, unknown>) => {
        const res = await runTool(tool, args, ctx);
        if (tool.mutating) {
          await logAudit({ userEmail: ctx.email, tool: tool.name, params: auditParams(args), ok: res.ok, result: res.text }).catch(
            (e: unknown) => console.error('Не удалось записать mcp_audit:', e),
          );
        }
        return { content: [{ type: 'text' as const, text: res.text }], isError: !res.ok };
      },
    );
  }
  return server;
}
