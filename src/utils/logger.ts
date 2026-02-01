type LogLevel = "debug" | "info" | "warn" | "error";

const formatTime = () => new Date().toISOString();

const logLine = (level: LogLevel, message: string, meta?: unknown) => {
  const stamp = formatTime();
  const payload = meta ? ` | ${JSON.stringify(meta)}` : "";
  const text = `[${stamp}] [${level.toUpperCase()}] ${message}${payload}`;
  if (level === "error") {
    console.error(text);
  } else if (level === "warn") {
    console.warn(text);
  } else {
    console.log(text);
  }
};

export const logger = {
  debug: (message: string, meta?: unknown) => logLine("debug", message, meta),
  info: (message: string, meta?: unknown) => logLine("info", message, meta),
  warn: (message: string, meta?: unknown) => logLine("warn", message, meta),
  error: (message: string, meta?: unknown) => logLine("error", message, meta),
};
