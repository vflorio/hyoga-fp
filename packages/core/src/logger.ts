import * as D from "fp-ts/Date";
import { pipe } from "fp-ts/function";
import * as IO from "fp-ts/IO";
import type * as L from "logging-ts/lib/IO";

type Level = "debug" | "info" | "warning" | "error";

interface Entry {
  message: string;
  args: unknown[];
  time: Date;
  level: Level;
  section: string;
}

const browserStyles = {
  timestamp: "color: #6272a4;",
  prefix: "color: #bd93f9; font-weight: bold;",
  section: "color: #50fa7b; font-weight: bold;",
  message: "color: #8be9fd;",
} as const;

const serializeArg = (arg: unknown): unknown => {
  if (arg === null || arg === undefined) return arg;
  if (typeof arg === "object") {
    try {
      return JSON.stringify(arg, null, 2);
    } catch {
      return String(arg);
    }
  }
  return arg;
};

const formatBackgroundScriptLog = (entry: Entry): [string, ...unknown[]] => {
  const timestamp = entry.time.toISOString().split("T")[1].split("Z")[0];
  const prefix = `${timestamp} [hbbtv-emu] ${entry.section} ${entry.message}`;
  return [prefix, ...entry.args.map(serializeArg)];
};

const formatBrowserLog = (entry: Entry): [string, ...unknown[]] => {
  const timestamp = entry.time.toISOString().split("T")[1].split("Z")[0];
  return [
    `%c${timestamp}%c [hbbtv-emu]%c ${entry.section}%c ${entry.message}`,
    browserStyles.timestamp,
    browserStyles.prefix,
    browserStyles.section,
    browserStyles.message,
    ...entry.args,
  ];
};

const isBackgroundScript: IO.IO<boolean> = () => typeof self !== "undefined" && "WorkerGlobalScope" in self;

const consoleLogger: L.LoggerIO<Entry> = (entry) =>
  pipe(
    isBackgroundScript,
    IO.flatMap((isBg) => () => {
      const formatted = isBg ? formatBackgroundScriptLog(entry) : formatBrowserLog(entry);
      const logFn = {
        debug: console.debug,
        info: console.info,
        warning: console.warn,
        error: console.error,
      }[entry.level];
      logFn(...formatted);
    }),
  );

export type Logger = Readonly<{
  debug: (message: string, ...args: unknown[]) => IO.IO<void>;
  info: (message: string, ...args: unknown[]) => IO.IO<void>;
  warn: (message: string, ...args: unknown[]) => IO.IO<void>;
  error: (message: string, ...args: unknown[]) => IO.IO<void>;
}>;

export const createLogger = (section: string): Logger => {
  const debug = (message: string, ...args: unknown[]): IO.IO<void> =>
    pipe(
      D.create,
      IO.flatMap((time) => consoleLogger({ level: "debug", message, args, time, section })),
    );

  const info = (message: string, ...args: unknown[]): IO.IO<void> =>
    pipe(
      D.create,
      IO.flatMap((time) => consoleLogger({ level: "info", message, args, time, section })),
    );

  const warn = (message: string, ...args: unknown[]): IO.IO<void> =>
    pipe(
      D.create,
      IO.flatMap((time) => consoleLogger({ level: "warning", message, args, time, section })),
    );

  const error = (message: string, ...args: unknown[]): IO.IO<void> =>
    pipe(
      D.create,
      IO.flatMap((time) => consoleLogger({ level: "error", message, args, time, section })),
    );

  return { debug, info, warn, error };
};
