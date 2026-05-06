# Exercise: Task Tracker

## Scenario

You have been given a Node.js project that reads project tasks from a JSON
file, validates them, and generates a per-assignee progress report written to a
JSON output file.

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

`tasks.json` is an array of task objects with the following shape:

| Field      | Type      | Notes                                          |
|------------|-----------|------------------------------------------------|
| `id`       | string    | positive integer encoded as a string           |
| `title`    | string    | must be non-empty                              |
| `status`   | string    | must be `"todo"`, `"in-progress"`, or `"done"` |
| `priority` | string    | must be `"low"`, `"medium"`, or `"high"`       |
| `assignee` | string    | must be non-empty                              |
| `dueDate`  | string    | ISO 8601 date (YYYY-MM-DD)                     |
| `tags`     | unknown   | must be an array where every element is a string |

The file intentionally contains **two malformed entries** that must be handled
gracefully (see error-handling requirements below).

---

## What to implement

Work through the file top-to-bottom; each section builds on the previous one.

### 1. `Task` constructor

Parse and validate every field from the `RawTask` argument:

- `id` — must parse to a positive integer; throw `ValidationError` if not
- `title` — must be non-empty after trimming; throw `ValidationError` if not
- `status` — must be one of the values in `VALID_STATUSES`; throw `ValidationError` if not
- `priority` — must be one of the values in `VALID_PRIORITIES`; throw `ValidationError` if not
- `assignee` — must be non-empty after trimming; throw `ValidationError` if not
- `dueDate` — must parse to a valid `Date`; throw `ValidationError` if not
- `tags` — must be an array where every element is a string; throw `ValidationError` if not
  (`Array.isArray` plus checking each element)

Assign validated values to the corresponding `readonly` fields.

### 2. `Task.isDone` getter

Returns `true` when `status === "done"`.

### 3. `Task.isOverdue` getter

Returns `true` when the task is **not done** and its `dueDate` is **before the
current date and time**.

Note: `new Date("2026-04-30")` creates a Date at midnight UTC. Comparing two
`Date` objects with `<` uses their numeric (millisecond) values, so the
comparison is straightforward.

### 4. `Task.toString()`

Return a readable one-line string. Example:

```
[HIGH] Implement payment flow — Alice (due 2026-04-30)
```

### 5. `readTasks(filePath)`

- Read the file at `filePath` using `readFile` from `node:fs/promises`.
- Throw `FileReadError` (wrapping the original error message) if reading fails.
- Parse the content with `JSON.parse` and return it as `RawTask[]`.
- Throw `FileReadError` if parsing fails.

### 6. `writeReport(report, outputPath)`

Serialize `report` to formatted JSON (2-space indent) and write it to
`outputPath` using `writeFile` from `node:fs/promises`. Throw a descriptive
`Error` if writing fails.

### 7. `parseTasks(rawTasks)`

- Attempt to construct a `Task` for each element of `rawTasks`.
- If construction throws a `ValidationError`, **print a warning to stderr** and
  skip that entry. One bad entry must not prevent the rest from loading.
- Return the array of valid `Task` instances.

### 8. `TaskTracker.groupByAssignee()`

Return an object whose keys are assignee names and whose values are arrays of
all `Task` objects assigned to that person.

### 9. `TaskTracker.generateReport()`

Call `groupByAssignee()` and build one `AssigneeReport` per assignee:

| Field               | Description                                                      |
|---------------------|------------------------------------------------------------------|
| `assignee`          | Assignee name                                                    |
| `totalTasks`        | Total tasks for this assignee                                    |
| `completedTasks`    | Count where `isDone === true`                                    |
| `completionRate`    | `(completedTasks / totalTasks) * 100`, rounded to **2 dp**       |
| `overdueCount`      | Count where `isOverdue === true`                                 |
| `highPriorityCount` | Count where `priority === "high"`                                |

Sort the result **alphabetically by assignee name**.

### 10. `TaskTracker.getOverdueTasks()`

Return all tasks where `isOverdue === true`, sorted by `dueDate` **ascending**
(the most overdue task — the one with the earliest due date — comes first).

### 11. `main()`

Orchestrate the full pipeline:

1. Read the JSON task file.
2. Parse tasks; log how many were loaded and how many were skipped.
3. Instantiate `TaskTracker`.
4. Call `getOverdueTasks()` and print each overdue task using `toString()`.
5. Call `generateReport()` and `writeReport()` to save the result.
6. Print a report table: assignee | total | done | completion rate | overdue | high priority.
7. Handle any thrown error: print its message and exit with `process.exit(1)`.

---

## Expected console output (approximate)

```
Loaded 13 tasks (2 skipped).

Overdue tasks (5):
  [HIGH] Implement payment flow — Alice (due 2026-04-30)
  [HIGH] Write unit tests for auth — Bob (due 2026-05-01)
  [MEDIUM] Optimize database queries — Bob (due 2026-04-28)
  [MEDIUM] Performance testing — Bob (due 2026-05-05)
  [HIGH] Deploy to staging — Carol (due 2026-04-22)

Report written to /path/to/report.json

Assignee Report:
────────────────────────────────────────────────────────────
Alice | total: 5 | done: 3 | rate: 60.00% | overdue: 1 | high: 5
Bob   | total: 4 | done: 1 | rate: 25.00% | overdue: 3 | high: 1
Carol | total: 4 | done: 1 | rate: 25.00% | overdue: 1 | high: 1
```

*(The overdue task list should be sorted earliest due date first.)*

---

## Constraints

- Use only Node.js built-in modules. Do not install any additional runtime packages.
- Do not use `require()` or CommonJS; the project is ESM.
- Do not use `any` as a type.
- All async file I/O must use `async`/`await`.
