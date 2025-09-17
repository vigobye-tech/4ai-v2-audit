import { log as ipcLog } from './ipc';

type LogLevel = 'info' | 'warn' | 'error' | 'chain' | 'inject';

interface LogEntry {
  time: string;
  level: LogLevel;
  module: string;
  message: string;
  details?: Record<string, unknown>;
}

export const logger = {
  info: (module: string, msg: string, details?: Record<string, unknown>) =>
    log('info', module, msg, details),
  warn: (module: string, msg: string, details?: Record<string, unknown>) =>
    log('warn', module, msg, details),
  error: (module: string, msg: string, details?: Record<string, unknown>) =>
    log('error', module, msg, details),
  chain: (chain: string[], prompt: string) =>
    log('chain', 'chains', `Run ${chain.join('→')}`, { prompt }),
  inject: (service: string, success: boolean) =>
    log('inject', 'injection', success ? 'Success' : 'Failed', { service }),
};

async function log(level: LogLevel, module: string, msg: string, details?: Record<string, unknown>) {
  const entry: LogEntry = {
    time: new Date().toISOString(),
    level,
    module,
    message: msg,
    ...(details && { details }),
  };
  
  // Only console log in dev mode to avoid file writes that trigger rebuilds
  console.log(`[${level.toUpperCase()}] ${module}: ${msg}`, details || '');
  
  // Skip file logging in dev mode to prevent Tauri restarts
  if (typeof window !== 'undefined' && window.location?.hostname !== 'localhost') {
    await ipcLog('logger', JSON.stringify(entry));
  }
}
