import * as D from "fp-ts/Date";
import { pipe } from "fp-ts/function";
import * as IO from "fp-ts/IO";
import * as O from "fp-ts/Option";
import * as RA from "fp-ts/ReadonlyArray";
import type * as L from "logging-ts/lib/IO";

type Level = "debug" | "info" | "warning" | "error";

const levelPriority: Record<Level, number> = {
  debug: 0,
  info: 1,
  warning: 2,
  error: 3,
};

export type LogLevel = Level | "silent";

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

const formatBrowserLog = (entry: Entry): [string, ...unknown[]] => {
  const withoutTimezone = (data: string) => pipe(data.split("Z"), RA.head);
  const withoutDate = (data: string) => pipe(data.split("T"), RA.lookup(1));

  const formatDate = (date: Date) =>
    pipe(
      O.some(date.toISOString()),
      O.flatMap(withoutTimezone),
      O.flatMap(withoutDate),
    );

  const timestamp = pipe(
    formatDate(entry.time),
    O.getOrElse(() => "unknown time"),
  );

  return [
    `%c${timestamp}%c [hyoga-fp]%c ${entry.section}%c ${entry.message}`,
    browserStyles.timestamp,
    browserStyles.prefix,
    browserStyles.section,
    browserStyles.message,
    ...entry.args,
  ];
};

const consoleLogger: L.LoggerIO<Entry> = (entry) => () => {
  const formatted = formatBrowserLog(entry);

  const logFn = {
    debug: console.debug,
    info: console.info,
    warning: console.warn,
    error: console.error,
  }[entry.level];
  logFn(...formatted);
};

export type Logger = Readonly<{
  debug: (message: string, ...args: unknown[]) => IO.IO<void>;
  info: (message: string, ...args: unknown[]) => IO.IO<void>;
  warn: (message: string, ...args: unknown[]) => IO.IO<void>;
  error: (message: string, ...args: unknown[]) => IO.IO<void>;
}>;

export const createLogger = (
  section: string,
  minLevel: LogLevel = "debug",
): Logger => {
  const shouldLog = (level: Level): boolean =>
    minLevel !== "silent" && levelPriority[level] >= levelPriority[minLevel];

  const noop: IO.IO<void> = () => {};

  const debug = (message: string, ...args: unknown[]): IO.IO<void> =>
    shouldLog("debug")
      ? pipe(
          D.create,
          IO.flatMap((time) =>
            consoleLogger({ level: "debug", message, args, time, section }),
          ),
        )
      : noop;

  const info = (message: string, ...args: unknown[]): IO.IO<void> =>
    shouldLog("info")
      ? pipe(
          D.create,
          IO.flatMap((time) =>
            consoleLogger({ level: "info", message, args, time, section }),
          ),
        )
      : noop;

  const warn = (message: string, ...args: unknown[]): IO.IO<void> =>
    shouldLog("warning")
      ? pipe(
          D.create,
          IO.flatMap((time) =>
            consoleLogger({ level: "warning", message, args, time, section }),
          ),
        )
      : noop;

  const error = (message: string, ...args: unknown[]): IO.IO<void> =>
    shouldLog("error")
      ? pipe(
          D.create,
          IO.flatMap((time) =>
            consoleLogger({ level: "error", message, args, time, section }),
          ),
        )
      : noop;

  return { debug, info, warn, error };
};
