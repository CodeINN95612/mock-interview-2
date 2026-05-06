# SOLUTION & EVALUATION GUIDE

> **Interviewer only — do not share with the candidate.**

---

## Expected numbers

**19 valid entries, 2 skipped** (entry with `"level": "INVALID"` and entry with
`"timestamp": "not-a-timestamp"`).

Per-service breakdown:

| Service  | Entries | Errors | Warns | Error rate | Avg duration ms | Top error                 |
|----------|---------|--------|-------|------------|-----------------|---------------------------|
| database | 4       | 2      | 2     | 50.00%     | 824.00          | Connection pool exhausted |
| payments | 6       | 3      | 0     | 50.00%     | 2679.33         | Payment gateway timeout   |
| auth     | 5       | 2      | 0     | 40.00%     | 106.00          | Invalid token             |
| api      | 4       | 0      | 1     | 0.00%      | 41.50           | null                      |

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

*(Note: `Math.round(x * 100) / 100` produces `50` not `50.00` in JSON — both are correct.)*

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
  constructor(public readonly field: string, public readonly value: string, message: string) {
    super(message);
    this.name = "ParseError";
  }
}

class FileReadError extends Error {
  constructor(public readonly filePath: string, message: string) {
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
    if (isNaN(timestamp.getTime()))
      throw new ParseError("timestamp", raw.timestamp, `Invalid timestamp: "${raw.timestamp}"`);

    if (!VALID_LEVELS.includes(raw.level as LogLevel))
      throw new ParseError("level", raw.level, `Invalid level: "${raw.level}". Must be one of: ${VALID_LEVELS.join(", ")}`);

    const service = raw.service.trim();
    if (service.length === 0)
      throw new ParseError("service", raw.service, `Service name cannot be empty`);

    const message = raw.message.trim();
    if (message.length === 0)
      throw new ParseError("message", raw.message, `Message cannot be empty`);

    if (raw.durationMs !== null && (typeof raw.durationMs !== "number" || raw.durationMs < 0))
      throw new ParseError("durationMs", String(raw.durationMs), `durationMs must be a non-negative number or null`);

    this.timestamp = timestamp;
    this.level = raw.level as LogLevel;
    this.service = service;
    this.message = message;
    this.durationMs = raw.durationMs;
  }

  get isError(): boolean { return this.level === "ERROR"; }
  get isWarn(): boolean  { return this.level === "WARN"; }

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

async function writeSummary(summary: ServiceSummary[], outputPath: string): Promise<void> {
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
  constructor(entries: LogEntry[]) { this.entries = entries; }

  groupByService(): Record<string, LogEntry[]> {
    const groups: Record<string, LogEntry[]> = {};
    for (const entry of this.entries) {
      (groups[entry.service] ??= []).push(entry);
    }
    return groups;
  }

  generateSummary(): ServiceSummary[] {
    const groups = this.groupByService();
    return Object.entries(groups)
      .map(([service, entries]) => {
        const errorCount = entries.filter(e => e.isError).length;
        const warnCount  = entries.filter(e => e.isWarn).length;
        const errorRate  = Math.round((errorCount / entries.length) * 100 * 100) / 100;

        const durations = entries.map(e => e.durationMs).filter((d): d is number => d !== null);
        const averageDurationMs = durations.length > 0
          ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 100) / 100
          : null;

        const errorMessages = entries.filter(e => e.isError).map(e => e.message);
        let mostCommonError: string | null = null;
        if (errorMessages.length > 0) {
          const counts: Record<string, number> = {};
          for (const msg of errorMessages) counts[msg] = (counts[msg] ?? 0) + 1;
          mostCommonError = Object.entries(counts)
            .sort(([a, ca], [b, cb]) => cb - ca || a.localeCompare(b))[0][0];
        }

        return { service, totalEntries: entries.length, errorCount, warnCount, errorRate, averageDurationMs, mostCommonError };
      })
      .sort((a, b) => b.errorRate - a.errorRate || a.service.localeCompare(b.service));
  }
}

async function main(): Promise<void> {
  const logsPath  = join(import.meta.dirname, "logs.json");
  const outputPath = join(import.meta.dirname, "summary.json");
  try {
    const rawEntries = await readLogs(logsPath);
    const entries    = parseLogs(rawEntries);
    console.log(`Loaded ${entries.length} entries (${rawEntries.length - entries.length} skipped).\n`);

    const summary = new LogAnalyzer(entries).generateSummary();
    await writeSummary(summary, outputPath);
    console.log(`Summary written to ${outputPath}\n`);

    console.log("Service Health Report:");
    console.log("─".repeat(76));
    for (const s of summary) {
      const dur    = s.averageDurationMs !== null ? `${Math.round(s.averageDurationMs)}ms` : "n/a";
      const topErr = s.mostCommonError ?? "—";
      console.log(
        `${s.service.padEnd(10)}| total: ${String(s.totalEntries).padStart(2)} ` +
        `| errors: ${s.errorCount} | rate: ${s.errorRate.toFixed(2).padStart(6)}% ` +
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
| `LogLevel` union type used correctly; cast after validation (`raw.level as LogLevel`) | 5 | Using `string` for the field type is –3 |
| All parameters and return types annotated, no `any` | 5 | `(d): d is number` type predicate is a strong green flag |
| `readonly` on class fields | 5 | |
| Interfaces used correctly, not reinvented as classes | 5 | |

### Classes — 20 pts

| Criterion | Points | What to look for |
|-----------|--------|------------------|
| Constructor validates all five fields with correctly typed `ParseError` | 12 | Generic `Error` throughout is –4 |
| `isError` / `isWarn` are getters (not methods) | 4 | Ask why regardless |
| `toString` includes level, service, message, timestamp | 4 | |

### Async / Await — 20 pts

| Criterion | Points | What to look for |
|-----------|--------|------------------|
| `readLogs` awaits `readFile` inside `async` function | 8 | Not `readFileSync`, not `.then()` |
| `writeSummary` awaits `writeFile` | 6 | |
| `main` is `async` with top-level `try/catch` and `process.exit(1)` | 6 | |

### Error handling — 20 pts

| Criterion | Points | What to look for |
|-----------|--------|------------------|
| `ParseError` preserves `field` and `value` properties | 4 | |
| `FileReadError` wraps both the read failure *and* the JSON parse failure | 6 | Most candidates miss the JSON parse case |
| Bad entries skipped with warning; unknown errors re-thrown | 10 | The `else { throw err }` branch is critical |

### Filesystem — 10 pts

| Criterion | Points | What to look for |
|-----------|--------|------------------|
| `node:fs/promises` with `node:` prefix | 3 | |
| Missing file handled gracefully (rename `logs.json` to test) | 4 | |
| Corrupt JSON handled gracefully (manually break `logs.json` to test) | 3 | |

### Data transformation — 10 pts

| Criterion | Points | What to look for |
|-----------|--------|------------------|
| `groupByService` correct | 3 | |
| `averageDurationMs` skips nulls rather than treating them as 0 | 4 | Most commonly missed detail |
| `mostCommonError` tie-breaks alphabetically | 3 | "First one wins" fails this |

---

## Follow-up questions

**Easy**
- "Why call `super(message)` in the custom error constructors?"
- "What is the difference between `null` and `undefined`? When would you use each?"

**Medium**
- "`parseLogs` only catches `ParseError`. What happens if the constructor has a bug that throws a `TypeError`?"
- "How would you test `generateSummary` without touching the filesystem?"
- "The `mostCommonError` logic iterates error messages twice. Can you do it in one pass?"

**Hard**
- "What changes if `logs.json` is several gigabytes and cannot fit in memory?"
- "How would you make `readLogs` generic so it can read any typed JSON file?"
- "What does the `(d): d is number` predicate actually do? What happens if you remove it?"

---

## Green flags
- Reads the whole skeleton before writing any code.
- Spots both malformed entries in the data before running.
- Uses `instanceof ParseError` rather than `err.name === "ParseError"`.
- Catches JSON parse failure inside `readLogs` without being prompted.

## Red flags
- `JSON.parse` without a `try/catch`.
- `any` to silence TypeScript errors.
- Silently swallowing all errors in `parseLogs`.
- Averaging `durationMs` including nulls (as 0).
- `fs.readFileSync` to "keep it simple."
