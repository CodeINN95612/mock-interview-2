# SOLUTION & EVALUATION GUIDE

> **Interviewer only — do not share with the candidate.**

---

## Expected numbers

**19 valid entries, 2 skipped** (entry with `"level": "INVALID"` and entry with
`"timestamp": "not-a-timestamp"`).

Per-service breakdown:

| Service  | Entries | Errors | Warns | Error rate | Avg duration ms | Top error                  |
|----------|---------|--------|-------|------------|-----------------|----------------------------|
| database | 4       | 2      | 2     | 50.00%     | 824.00          | Connection pool exhausted  |
| payments | 6       | 3      | 0     | 50.00%     | 2679.33         | Payment gateway timeout     |
| auth     | 5       | 2      | 0     | 40.00%     | 106.00          | Invalid token               |
| api      | 4       | 0      | 1     | 0.00%      | 41.50           | null                        |

Sorted by errorRate desc, ties broken alphabetically: **database, payments, auth, api**.

**Duration arithmetic to verify:**
- database: (892 + 756) / 2 = **824.00** (two null entries skipped)
- payments: (380 + 5001 + 5003 + 402 + 5000 + 290) / 6 = 16076 / 6 = **2679.33**
- auth: (142 + 138 + 44 + 155 + 51) / 5 = 530 / 5 = **106.00**
- api: (5 + 78) / 2 = **41.50** (two null entries skipped)

---

## Expected `summary.json`

```json
[
  {
    "service": "database",
    "totalEntries": 4,
    "errorCount": 2,
    "warnCount": 2,
    "errorRate": 50,
    "averageDurationMs": 824,
    "mostCommonError": "Connection pool exhausted"
  },
  {
    "service": "payments",
    "totalEntries": 6,
    "errorCount": 3,
    "warnCount": 0,
    "errorRate": 50,
    "averageDurationMs": 2679.33,
    "mostCommonError": "Payment gateway timeout"
  },
  {
    "service": "auth",
    "totalEntries": 5,
    "errorCount": 2,
    "warnCount": 0,
    "errorRate": 40,
    "averageDurationMs": 106,
    "mostCommonError": "Invalid token"
  },
  {
    "service": "api",
    "totalEntries": 4,
    "errorCount": 0,
    "warnCount": 1,
    "errorRate": 0,
    "averageDurationMs": 41.5,
    "mostCommonError": null
  }
]
```

*(Note: `Math.round(x * 100) / 100` will produce `50` not `50.00` in JSON — both are correct.)*

---

## Complete solution

```typescript
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

type LogLevel = "INFO" | "WARN" | "ERROR";

const VALID_LEVELS: LogLevel[] = ["INFO", "WARN", "ERROR"];

interface RawLogEntry {
  timestamp: string;
  level: string;
  service: string;
  message: string;
  durationMs: number | null;
}

interface ServiceSummary {
  service: string;
  totalEntries: number;
  errorCount: number;
  warnCount: number;
  errorRate: number;
  averageDurationMs: number | null;
  mostCommonError: string | null;
}

class ParseError extends Error {
  constructor(
    public readonly field: string,
    public readonly value: string,
    message: string
  ) {
    super(message);
    this.name = "ParseError";
  }
}

class FileReadError extends Error {
  constructor(
    public readonly filePath: string,
    message: string
  ) {
    super(message);
    this.name = "FileReadError";
  }
}

class LogEntry {
  readonly timestamp: Date;
  readonly level: LogLevel;
  readonly service: string;
  readonly message: string;
  readonly durationMs: number | null;

  constructor(raw: RawLogEntry) {
    const timestamp = new Date(raw.timestamp);
    if (isNaN(timestamp.getTime())) {
      throw new ParseError("timestamp", raw.timestamp, `Invalid timestamp: "${raw.timestamp}"`);
    }

    if (!VALID_LEVELS.includes(raw.level as LogLevel)) {
      throw new ParseError("level", raw.level, `Invalid level: "${raw.level}". Must be one of: ${VALID_LEVELS.join(", ")}`);
    }

    const service = raw.service.trim();
    if (service.length === 0) {
      throw new ParseError("service", raw.service, `Service name cannot be empty`);
    }

    const message = raw.message.trim();
    if (message.length === 0) {
      throw new ParseError("message", raw.message, `Message cannot be empty`);
    }

    if (raw.durationMs !== null && (typeof raw.durationMs !== "number" || raw.durationMs < 0)) {
      throw new ParseError("durationMs", String(raw.durationMs), `durationMs must be a non-negative number or null`);
    }

    this.timestamp = timestamp;
    this.level = raw.level as LogLevel;
    this.service = service;
    this.message = message;
    this.durationMs = raw.durationMs;
  }

  get isError(): boolean {
    return this.level === "ERROR";
  }

  get isWarn(): boolean {
    return this.level === "WARN";
  }

  toString(): string {
    return `[${this.level}] ${this.service}: ${this.message} (${this.timestamp.toISOString()})`;
  }
}

async function readLogs(filePath: string): Promise<RawLogEntry[]> {
  let content: string;
  try {
    content = await readFile(filePath, "utf-8");
  } catch (err) {
    throw new FileReadError(filePath, `Cannot read "${filePath}": ${(err as Error).message}`);
  }
  try {
    return JSON.parse(content) as RawLogEntry[];
  } catch (err) {
    throw new FileReadError(filePath, `Cannot parse "${filePath}" as JSON: ${(err as Error).message}`);
  }
}

async function writeSummary(
  summary: ServiceSummary[],
  outputPath: string
): Promise<void> {
  try {
    await writeFile(outputPath, JSON.stringify(summary, null, 2), "utf-8");
  } catch (err) {
    throw new Error(`Failed to write summary to "${outputPath}": ${(err as Error).message}`);
  }
}

function parseLogs(rawEntries: RawLogEntry[]): LogEntry[] {
  const entries: LogEntry[] = [];
  for (const raw of rawEntries) {
    try {
      entries.push(new LogEntry(raw));
    } catch (err) {
      if (err instanceof ParseError) {
        console.warn(`[WARN] Skipping entry — ${err.message}`);
      } else {
        throw err;
      }
    }
  }
  return entries;
}

class LogAnalyzer {
  private readonly entries: LogEntry[];

  constructor(entries: LogEntry[]) {
    this.entries = entries;
  }

  groupByService(): Record<string, LogEntry[]> {
    const groups: Record<string, LogEntry[]> = {};
    for (const entry of this.entries) {
      if (!groups[entry.service]) {
        groups[entry.service] = [];
      }
      groups[entry.service].push(entry);
    }
    return groups;
  }

  generateSummary(): ServiceSummary[] {
    const groups = this.groupByService();

    return Object.entries(groups)
      .map(([service, entries]) => {
        const errorCount = entries.filter(e => e.isError).length;
        const warnCount = entries.filter(e => e.isWarn).length;
        const errorRate = Math.round((errorCount / entries.length) * 100 * 100) / 100;

        const durationsWithValues = entries
          .map(e => e.durationMs)
          .filter((d): d is number => d !== null);
        const averageDurationMs =
          durationsWithValues.length > 0
            ? Math.round((durationsWithValues.reduce((a, b) => a + b, 0) / durationsWithValues.length) * 100) / 100
            : null;

        const errorMessages = entries.filter(e => e.isError).map(e => e.message);
        let mostCommonError: string | null = null;
        if (errorMessages.length > 0) {
          const counts: Record<string, number> = {};
          for (const msg of errorMessages) {
            counts[msg] = (counts[msg] ?? 0) + 1;
          }
          mostCommonError = Object.entries(counts)
            .sort(([a, ca], [b, cb]) => cb - ca || a.localeCompare(b))
            [0][0];
        }

        return { service, totalEntries: entries.length, errorCount, warnCount, errorRate, averageDurationMs, mostCommonError };
      })
      .sort((a, b) => b.errorRate - a.errorRate || a.service.localeCompare(b.service));
  }
}

async function main(): Promise<void> {
  const logsPath = join(import.meta.dirname, "logs.json");
  const outputPath = join(import.meta.dirname, "summary.json");

  try {
    const rawEntries = await readLogs(logsPath);
    const entries = parseLogs(rawEntries);
    const skipped = rawEntries.length - entries.length;

    console.log(`Loaded ${entries.length} entries (${skipped} skipped).\n`);

    const summary = new LogAnalyzer(entries).generateSummary();
    await writeSummary(summary, outputPath);
    console.log(`Summary written to ${outputPath}\n`);

    console.log("Service Health Report:");
    console.log("─".repeat(76));
    for (const s of summary) {
      const dur = s.averageDurationMs !== null ? `${Math.round(s.averageDurationMs)}ms` : "n/a";
      const topErr = s.mostCommonError ?? "—";
      console.log(
        `${s.service.padEnd(10)}| total: ${String(s.totalEntries).padStart(2)} ` +
        `| errors: ${String(s.errorCount).padStart(1)} ` +
        `| rate: ${String(s.errorRate.toFixed(2)).padStart(6)}% ` +
        `| avg: ${dur.padStart(7)} | ${topErr}`
      );
    }
  } catch (err) {
    console.error(`Error: ${(err as Error).message}`);
    process.exit(1);
  }
}

main();
```

---

## Evaluation rubric (100 points)

### TypeScript — 20 pts

| Criterion | Points | What to look for |
|-----------|--------|------------------|
| `LogLevel` union type used as the field type (not just `string`) | 5 | The cast `raw.level as LogLevel` after validation is the correct pattern |
| All parameters and return types annotated, no `any` | 5 | `(d): d is number` type predicate in filter is a green flag |
| `readonly` on class fields | 5 | Shows immutability awareness |
| Interfaces used correctly, not reinvented | 5 | They should not rewrite `RawLogEntry` or `ServiceSummary` as classes |

---

### Classes — 20 pts

| Criterion | Points | What to look for |
|-----------|--------|------------------|
| Constructor validates all five fields and throws correctly typed `ParseError` | 12 | Each field gets its own check; generic `Error` throughout is –4 |
| `isError` / `isWarn` getters are simple comparisons | 4 | Using a method instead of a getter is acceptable but ask why |
| `toString` includes level, service, message, and timestamp | 4 | Format doesn't need to match exactly |

**Probe:** "Why getters rather than methods here?" (No arguments, reads like a property, computed from state — canonical getter use case.)

---

### Async / Await — 20 pts

| Criterion | Points | What to look for |
|-----------|--------|------------------|
| `readLogs` uses `await readFile(...)` inside an `async` function | 8 | Not `readFileSync`, not `.then()` chaining |
| `writeSummary` uses `await writeFile(...)` | 6 | |
| `main` is `async` and wraps everything in `try/catch` with `process.exit(1)` | 6 | |

**Red flag:** importing from `node:fs` instead of `node:fs/promises` and mixing callbacks with async.

---

### Error Handling — 20 pts

| Criterion | Points | What to look for |
|-----------|--------|------------------|
| `ParseError` carries `field` and `value` properties | 4 | They should not remove or ignore those constructor args |
| `FileReadError` wraps both file I/O errors *and* JSON parse errors | 6 | Many candidates only handle the file-read case |
| Bad entries are skipped with a warning; unknown errors re-thrown | 10 | The `else { throw err }` in `parseLogs` is critical — silently swallowing all errors hides real bugs |

---

### Filesystem — 10 pts

| Criterion | Points | What to look for |
|-----------|--------|------------------|
| Uses `node:fs/promises` with the `node:` prefix | 3 | Minor, shows familiarity with modern Node conventions |
| Handles missing file gracefully via `FileReadError` (test by renaming `logs.json`) | 4 | |
| JSON parse failure also produces a `FileReadError` (test by corrupting the JSON) | 3 | Often missed |

---

### Data transformation — 10 pts

| Criterion | Points | What to look for |
|-----------|--------|------------------|
| `groupByService` produces correct groupings | 3 | |
| `averageDurationMs` skips nulls (not treats them as 0) | 4 | This is the most commonly missed detail |
| `mostCommonError` tie-breaks alphabetically | 3 | A "first one wins" approach fails this; look for an explicit sort |

---

## Follow-up questions

**Easy**
- "Why do we call `super(message)` inside the custom error constructors?"
- "What is the difference between `null` and `undefined` in TypeScript? When would you use each?"

**Medium**
- "Your `parseLogs` catches only `ParseError`. What happens if `new LogEntry(raw)` throws a `TypeError` instead — a bug in your constructor code?"
- "How would you test `LogAnalyzer.generateSummary()` without touching the filesystem at all?"
- "The `mostCommonError` logic iterates the error messages twice (once to count, once to sort). Can you do it in one pass?"

**Hard**
- "What would need to change if `logs.json` could be several gigabytes and can't fit in memory?"
- "How would you make `readLogs` generic so it could read any well-typed JSON file, not just log entries?"
- "`(d): d is number` is a type predicate. What happens if you remove it and just use `d !== null`? Does TypeScript complain?"

---

## Green flags

- Reads the whole file before touching any function.
- Spots the two malformed entries in `logs.json` before running the program.
- Uses `instanceof ParseError` rather than checking `err.name`.
- Writes and manually tests `readLogs` first, then builds upward.
- Handles the JSON parse failure inside `readLogs` without being prompted.

## Red flags

- Reaches for `JSON.parse` without a try/catch.
- Uses `any` to work around type errors instead of fixing them.
- Silently swallows all exceptions in `parseLogs`.
- Averages `durationMs` including nulls (treating them as 0).
- Uses `fs.readFileSync` to "keep it simple."
