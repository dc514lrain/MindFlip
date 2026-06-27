// 决策大师 (MindFlip) — 统一日志工具
// 职责: 开发/生产环境统一的日志输出，分级控制

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

declare const __DEV__: boolean | undefined;

const isDev = typeof __DEV__ !== 'undefined' && __DEV__;

function formatMessage(level: LogLevel, msg: string, data?: unknown): string {
  const prefix = `[MindFlip:${level.toUpperCase()}]`;
  return data !== undefined
    ? `${prefix} ${msg} ${JSON.stringify(data)}`
    : `${prefix} ${msg}`;
}

function shouldLog(level: LogLevel): boolean {
  if (isDev) return true;
  // 生产环境只记录 error
  return level === 'error';
}

export const Logger = {
  debug(msg: string, data?: unknown): void {
    if (!shouldLog('debug')) return;
    console.log(formatMessage('debug', msg, data));
  },

  info(msg: string, data?: unknown): void {
    if (!shouldLog('info')) return;
    console.log(formatMessage('info', msg, data));
  },

  warn(msg: string, data?: unknown): void {
    if (!shouldLog('warn')) return;
    console.warn(formatMessage('warn', msg, data));
  },

  error(msg: string, err?: unknown): void {
    if (!shouldLog('error')) return;
    if (err instanceof Error) {
      console.error(formatMessage('error', `${msg} — ${err.message}`), err.stack);
    } else {
      console.error(formatMessage('error', msg, err));
    }
  },
};
