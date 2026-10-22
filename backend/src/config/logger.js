const levels = { error: 0, warn: 1, info: 2 };

function write(level, message, details) {
  const output = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(details ? { details } : {}),
  };
  const method = level === "error" ? "error" : level === "warn" ? "warn" : "log";
  console[method](JSON.stringify(output));
}

export const logger = Object.freeze({
  error: (message, details) => write("error", message, details),
  warn: (message, details) => write("warn", message, details),
  info: (message, details) => write("info", message, details),
  levels,
});