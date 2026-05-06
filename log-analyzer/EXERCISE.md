# Exercise: Server Log Analyzer

## Scenario

You have been given a Node.js project that reads structured log entries from a
JSON file, validates them, and generates a per-service health summary written
to a JSON output file.

The skeleton in `main.ts` already defines every type, class, and function —
**you only need to fill in the bodies**. Do not change any signature, interface,
or class definition.

---

## Setup

```bash
npm install
```

Run the program:

```bash
npm start
# Node 23+ can also use:  node main.ts
```

Type-check without running:

```bash
npm run check
```

---

## Data

`logs.json` is an array of log entry objects with the following shape:

| Field        | Type             | Notes                                    |
|--------------|------------------|------------------------------------------|
| `timestamp`  | string           | ISO 8601 date-time                       |
| `level`      | string           | must be `"INFO"`, `"WARN"`, or `"ERROR"` |
| `service`    | string           | e.g. `"auth"`, `"payments"`              |
| `message`    | string           | human-readable log message               |
| `durationMs` | number \| null   | response time in ms; null for non-request logs |

The file intentionally contains **two malformed entries** that must be handled
gracefully (see error-handling requirements below).

---

## What to implement

Work through the file top-to-bottom; each section builds on the previous one.

### 1. `LogEntry` constructor

Parse and validate every field from the `RawLogEntry` argument:

- `timestamp` — must parse to a valid `Date`; throw `ParseError` if not
- `level` — must be one of the values in `VALID_LEVELS`; throw `ParseError` if not
- `service` — must be non-empty after trimming; throw `ParseError` if not
- `message` — must be non-empty after trimming; throw `ParseError` if not
- `durationMs` — may be `null`; if it is a number it must be `>= 0`; throw `ParseError` if not

Assign validated values to the corresponding `readonly` fields.

### 2. `LogEntry.isError` and `LogEntry.isWarn` getters

- `isError` returns `true` when `level === "ERROR"`
- `isWarn` returns `true` when `level === "WARN"`

### 3. `LogEntry.toString()`

Return a readable one-line string. Example:

```
[ERROR] payments: Payment gateway timeout (2026-05-04T08:02:10.000Z)
```

### 4. `readLogs(filePath)`

- Read the file at `filePath` using `readFile` from `node:fs/promises`.
- Throw `FileReadError` (wrapping the original error message) if reading fails.
- Parse the content with `JSON.parse` and return it as `RawLogEntry[]`.
- Throw `FileReadError` if parsing fails.

### 5. `writeSummary(summary, outputPath)`

Serialize `summary` to formatted JSON (2-space indent) and write it to
`outputPath` using `writeFile` from `node:fs/promises`. Throw a descriptive
`Error` if writing fails.

### 6. `parseLogs(rawEntries)`

- Attempt to construct a `LogEntry` for each element of `rawEntries`.
- If construction throws a `ParseError`, **print a warning to stderr** and
  skip that entry. One bad entry must not prevent the rest from loading.
- Return the array of valid `LogEntry` instances.

### 7. `LogAnalyzer.groupByService()`

Return an object whose keys are service names and whose values are arrays of
all `LogEntry` objects for that service.

### 8. `LogAnalyzer.generateSummary()`

Call `groupByService()` and build one `ServiceSummary` per service:

| Field              | Description                                                                    |
|--------------------|--------------------------------------------------------------------------------|
| `service`          | Service name                                                                   |
| `totalEntries`     | Total log entries for this service                                             |
| `errorCount`       | Number of `ERROR`-level entries                                                |
| `warnCount`        | Number of `WARN`-level entries                                                 |
| `errorRate`        | `(errorCount / totalEntries) * 100`, rounded to **2 decimal places**           |
| `averageDurationMs`| Mean of all non-`null` `durationMs` values, rounded to **2 dp**; `null` if none exist |
| `mostCommonError`  | Message of the most frequent `ERROR` entry; break ties alphabetically; `null` if no errors |

Sort the result by `errorRate` **descending**. Break ties alphabetically by
service name (ascending).

### 9. `main()`

Orchestrate the full pipeline:

1. Read the JSON log file.
2. Parse entries; log how many were loaded and how many were skipped.
3. Generate the summary.
4. Write `summary.json`.
5. Print a table to the console for each service:
   service name, total entries, error count, error rate, avg duration, top error.
6. Handle any thrown error: print its message and exit with `process.exit(1)`.

---

## Expected console output (approximate)

```
Loaded 19 entries (2 skipped).

Summary written to /path/to/summary.json

Service Health Report:
────────────────────────────────────────────────────────────────────────────
database  | total:  4 | errors: 2 | rate: 50.00% | avg:   824ms | Connection pool exhausted
payments  | total:  6 | errors: 3 | rate: 50.00% | avg:  2679ms | Payment gateway timeout
auth      | total:  5 | errors: 2 | rate: 40.00% | avg:   106ms | Invalid token
api       | total:  4 | errors: 0 | rate:  0.00% | avg:    42ms | —
```

---

## Constraints

- Use only Node.js built-in modules. Do not install any additional runtime packages.
- Do not use `require()` or CommonJS; the project is ESM.
- Do not use `any` as a type.
- All async file I/O must use `async`/`await`.
