type LogLevel = 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  source: string
  message: string
  meta?: Record<string, unknown>
  timestamp: string
}

function log(level: LogLevel, source: string, message: string, meta?: Record<string, unknown>) {
  const entry: LogEntry = {
    level,
    source,
    message,
    meta,
    timestamp: new Date().toISOString(),
  }
  const output = JSON.stringify(entry)

  if (level === 'error') console.error(output)
  else if (level === 'warn') console.warn(output)
  else console.log(output)
}

export const logger = {
  info: (source: string, message: string, meta?: Record<string, unknown>) =>
    log('info', source, message, meta),
  warn: (source: string, message: string, meta?: Record<string, unknown>) =>
    log('warn', source, message, meta),
  error: (source: string, message: string, meta?: Record<string, unknown>) =>
    log('error', source, message, meta),
}
