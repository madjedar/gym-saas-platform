/**
 * GymOS Structured Logger
 *
 * Outputs machine-readable JSON log entries to stdout. In Vercel, these
 * will appear in the Function Logs tab, fully searchable and filterable.
 *
 * Log Levels:
 *  - info     : Normal business events (member added, plan assigned)
 *  - warn     : Non-critical anomalies
 *  - error    : Unexpected errors that require attention
 *  - security : Security events (rate limit hits, unauthorized access attempts)
 */

type LogLevel = 'info' | 'warn' | 'error' | 'security';

interface LogEntry {
  level: LogLevel;
  event: string;
  ts: string;
  [key: string]: unknown;
}

function log(level: LogLevel, event: string, context: Record<string, unknown> = {}): void {
  const entry: LogEntry = {
    level,
    event,
    ts: new Date().toISOString(),
    ...context,
  };

  // Output as a single-line JSON object for easy parsing in Vercel/log aggregators
  const output = JSON.stringify(entry);

  if (level === 'error' || level === 'security') {
    console.error(output);
  } else {
    console.log(output);
  }
}

export const logger = {
  /**
   * Normal business events — member added, plan assigned, etc.
   */
  info(event: string, context?: Record<string, unknown>): void {
    log('info', event, context);
  },

  /**
   * Non-critical anomalies that should be investigated.
   */
  warn(event: string, context?: Record<string, unknown>): void {
    log('warn', event, context);
  },

  /**
   * Unexpected errors that break functionality.
   * @param error - The raw Error or unknown thrown value.
   */
  error(event: string, error?: unknown, context?: Record<string, unknown>): void {
    const errorContext: Record<string, unknown> = { ...context };

    if (error instanceof Error) {
      errorContext.message = error.message;
      errorContext.name = error.name;
      // Only include stack in development to avoid leaking internals in production
      if (process.env.NODE_ENV !== 'production') {
        errorContext.stack = error.stack;
      }
    } else if (error !== undefined) {
      errorContext.rawError = String(error);
    }

    log('error', event, errorContext);
  },

  /**
   * Security events — attacks, unauthorized access, rate limit hits.
   * These should always be monitored.
   */
  security(event: string, context?: Record<string, unknown>): void {
    log('security', event, context);
  },
};
