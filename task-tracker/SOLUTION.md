# SOLUTION & EVALUATION GUIDE

> **Interviewer only — do not share with the candidate.**

---

## Expected numbers (reference date: 2026-05-06)

**13 valid tasks, 2 skipped:**
- Entry 11: empty `title` → `ValidationError`
- Entry 15: `status` is `"UNKNOWN"` → `ValidationError`

**Overdue tasks** (not done, dueDate < 2026-05-06), sorted by dueDate ascending:

| # | Task                      | Assignee | Due        |
|---|---------------------------|----------|------------|
| 1 | Deploy to staging         | Carol    | 2026-04-22 |
| 2 | Optimize database queries | Bob      | 2026-04-28 |
| 3 | Implement payment flow    | Alice    | 2026-04-30 |
| 4 | Write unit tests for auth | Bob      | 2026-05-01 |
| 5 | Performance testing       | Bob      | 2026-05-05 |

**Per-assignee breakdown:**

| Assignee | Total | Done | Rate   | Overdue | High priority |
|----------|-------|------|--------|---------|---------------|
| Alice    | 5     | 3    | 60.00% | 1       | 5             |
| Bob      | 4     | 1    | 25.00% | 3       | 1             |
| Carol    | 4     | 1    | 25.00% | 1       | 1             |

**Alice tasks:** 1(done,high), 3(done,high), 6(in-progress,high,overdue), 10(in-progress,high), 14(done,high)
- completionRate: 3/5 × 100 = **60.00**
- overdueCount: task 6 only (task 10 due 2026-05-10 is in the future) = **1**
- highPriorityCount: all five = **5**

**Bob tasks:** 2(in-progress,high,overdue), 4(done,medium), 8(todo,medium,overdue), 13(in-progress,medium,overdue)
- completionRate: 1/4 × 100 = **25.00**
- overdueCount: tasks 2, 8, 13 = **3**
- highPriorityCount: task 2 only = **1**

**Carol tasks:** 5(todo,low), 7(done,medium), 9(todo,high,overdue), 12(todo,low)
- completionRate: 1/4 × 100 = **25.00**
- overdueCount: task 9 only = **1**
- highPriorityCount: task 9 only = **1**

---

## Expected `report.json`

```json
[
  {
    "assignee": "Alice",
    "totalTasks": 5,
    "completedTasks": 3,
    "completionRate": 60,
    "overdueCount": 1,
    "highPriorityCount": 5
  },
  {
    "assignee": "Bob",
    "totalTasks": 4,
    "completedTasks": 1,
    "completionRate": 25,
    "overdueCount": 3,
    "highPriorityCount": 1
  },
  {
    "assignee": "Carol",
    "totalTasks": 4,
    "completedTasks": 1,
    "completionRate": 25,
    "overdueCount": 1,
    "highPriorityCount": 1
  }
]
```

---

## Complete solution

```typescript
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

type Status   = "todo" | "in-progress" | "done";
type Priority = "low"  | "medium"      | "high";

const VALID_STATUSES:   Status[]   = ["todo", "in-progress", "done"];
const VALID_PRIORITIES: Priority[] = ["low", "medium", "high"];

interface RawTask {
  id: string; title: string; status: string; priority: string;
  assignee: string; dueDate: string; tags: unknown;
}

interface AssigneeReport {
  assignee: string; totalTasks: number; completedTasks: number;
  completionRate: number; overdueCount: number; highPriorityCount: number;
}

class ValidationError extends Error {
  constructor(public readonly field: string, public readonly value: string, message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

class FileReadError extends Error {
  constructor(public readonly filePath: string, message: string) {
    super(message);
    this.name = "FileReadError";
  }
}

class Task {
  readonly id: number; readonly title: string; readonly status: Status;
  readonly priority: Priority; readonly assignee: string;
  readonly dueDate: Date; readonly tags: string[];

  constructor(raw: RawTask) {
    const id = parseInt(raw.id, 10);
    if (isNaN(id) || id <= 0)
      throw new ValidationError("id", raw.id, `Invalid id: "${raw.id}"`);

    const title = raw.title.trim();
    if (title.length === 0)
      throw new ValidationError("title", raw.title, `Title cannot be empty`);

    if (!VALID_STATUSES.includes(raw.status as Status))
      throw new ValidationError("status", raw.status,
        `Invalid status: "${raw.status}". Must be one of: ${VALID_STATUSES.join(", ")}`);

    if (!VALID_PRIORITIES.includes(raw.priority as Priority))
      throw new ValidationError("priority", raw.priority,
        `Invalid priority: "${raw.priority}". Must be one of: ${VALID_PRIORITIES.join(", ")}`);

    const assignee = raw.assignee.trim();
    if (assignee.length === 0)
      throw new ValidationError("assignee", raw.assignee, `Assignee cannot be empty`);

    const dueDate = new Date(raw.dueDate);
    if (isNaN(dueDate.getTime()))
      throw new ValidationError("dueDate", raw.dueDate, `Invalid date: "${raw.dueDate}"`);

    if (!Array.isArray(raw.tags) || !raw.tags.every(t => typeof t === "string"))
      throw new ValidationError("tags", JSON.stringify(raw.tags),
        `tags must be an array of strings`);

    this.id       = id;
    this.title    = title;
    this.status   = raw.status as Status;
    this.priority = raw.priority as Priority;
    this.assignee = assignee;
    this.dueDate  = dueDate;
    this.tags     = raw.tags as string[];
  }

  get isDone(): boolean    { return this.status === "done"; }
  get isOverdue(): boolean { return !this.isDone && this.dueDate < new Date(); }

  toString(): string {
    return `[${this.priority.toUpperCase()}] ${this.title} — ${this.assignee} (due ${this.dueDate.toISOString().slice(0, 10)})`;
  }
}

async function readTasks(filePath: string): Promise<RawTask[]> {
  let content: string;
  try {
    content = await readFile(filePath, "utf-8");
  } catch (err) {
    throw new FileReadError(filePath, `Cannot read "${filePath}": ${(err as Error).message}`);
  }
  try {
    return JSON.parse(content) as RawTask[];
  } catch (err) {
    throw new FileReadError(filePath, `Cannot parse "${filePath}" as JSON: ${(err as Error).message}`);
  }
}

async function writeReport(report: AssigneeReport[], outputPath: string): Promise<void> {
  try {
    await writeFile(outputPath, JSON.stringify(report, null, 2), "utf-8");
  } catch (err) {
    throw new Error(`Failed to write report to "${outputPath}": ${(err as Error).message}`);
  }
}

function parseTasks(rawTasks: RawTask[]): Task[] {
  const tasks: Task[] = [];
  for (const raw of rawTasks) {
    try {
      tasks.push(new Task(raw));
    } catch (err) {
      if (err instanceof ValidationError) {
        console.warn(`[WARN] Skipping task — ${err.message}`);
      } else {
        throw err;
      }
    }
  }
  return tasks;
}

class TaskTracker {
  private readonly tasks: Task[];
  constructor(tasks: Task[]) { this.tasks = tasks; }

  groupByAssignee(): Record<string, Task[]> {
    const groups: Record<string, Task[]> = {};
    for (const task of this.tasks) {
      (groups[task.assignee] ??= []).push(task);
    }
    return groups;
  }

  generateReport(): AssigneeReport[] {
    const groups = this.groupByAssignee();
    return Object.entries(groups)
      .map(([assignee, tasks]) => ({
        assignee,
        totalTasks:        tasks.length,
        completedTasks:    tasks.filter(t => t.isDone).length,
        completionRate:    Math.round((tasks.filter(t => t.isDone).length / tasks.length) * 100 * 100) / 100,
        overdueCount:      tasks.filter(t => t.isOverdue).length,
        highPriorityCount: tasks.filter(t => t.priority === "high").length,
      }))
      .sort((a, b) => a.assignee.localeCompare(b.assignee));
  }

  getOverdueTasks(): Task[] {
    return this.tasks
      .filter(t => t.isOverdue)
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }
}

async function main(): Promise<void> {
  const tasksPath  = join(import.meta.dirname, "tasks.json");
  const outputPath = join(import.meta.dirname, "report.json");
  try {
    const rawTasks = await readTasks(tasksPath);
    const tasks    = parseTasks(rawTasks);
    console.log(`Loaded ${tasks.length} tasks (${rawTasks.length - tasks.length} skipped).\n`);

    const tracker     = new TaskTracker(tasks);
    const overdue     = tracker.getOverdueTasks();
    console.log(`Overdue tasks (${overdue.length}):`);
    for (const t of overdue) console.log(`  ${t}`);

    const report = tracker.generateReport();
    await writeReport(report, outputPath);
    console.log(`\nReport written to ${outputPath}\n`);

    console.log("Assignee Report:");
    console.log("─".repeat(60));
    for (const r of report) {
      console.log(
        `${r.assignee.padEnd(6)}| total: ${r.totalTasks} | done: ${r.completedTasks} ` +
        `| rate: ${r.completionRate.toFixed(2)}% | overdue: ${r.overdueCount} | high: ${r.highPriorityCount}`
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
| `Status` and `Priority` union types used as field types; cast after validation | 6 | Using `string` for both fields is –4 |
| `tags: unknown` in `RawTask` treated correctly; cast only after validation | 6 | Casting `raw.tags as string[]` without checking is –4 |
| `readonly` on all class fields | 4 | |
| No `any` anywhere | 4 | |

### Classes — 25 pts

| Criterion | Points | What to look for |
|-----------|--------|------------------|
| Constructor validates all seven fields with correctly typed `ValidationError` | 12 | Missing tags check is –4; generic `Error` throughout is –4 |
| `isDone` is a simple equality check | 4 | |
| `isOverdue` uses `isDone` and a correct Date comparison | 5 | `!this.isDone` reuse is a green flag; comparing strings instead of Dates is –3 |
| `toString` includes priority, title, assignee, due date | 4 | |

### Async / Await — 15 pts

| Criterion | Points | What to look for |
|-----------|--------|------------------|
| `readTasks` awaits `readFile` and wraps both errors | 6 | |
| `writeReport` awaits `writeFile` with error wrapping | 5 | |
| `main` is `async` with top-level `try/catch` | 4 | |

### Error handling — 20 pts

| Criterion | Points | What to look for |
|-----------|--------|------------------|
| `ValidationError` preserves `field` and `value` | 4 | |
| `FileReadError` wraps file errors *and* JSON parse errors | 6 | |
| Bad tasks skipped with warning; other errors re-thrown | 10 | The `else { throw err }` branch is the key signal |

### Filesystem — 10 pts

| Criterion | Points | What to look for |
|-----------|--------|------------------|
| `node:fs/promises` with `node:` prefix | 2 | |
| Missing file handled gracefully | 4 | |
| Corrupt JSON handled gracefully | 4 | |

### Data transformation — 10 pts

| Criterion | Points | What to look for |
|-----------|--------|------------------|
| `groupByAssignee` correct | 3 | |
| `generateReport` fields all correct, sorted alphabetically | 4 | |
| `getOverdueTasks` sorted by dueDate ascending (not descending) | 3 | A common off-by-one: sorting descending or forgetting to sort at all |

---

## Common mistakes specific to this exercise

- **`isOverdue` false positive**: comparing `this.dueDate < new Date()` without first checking `!this.isDone` — done tasks are incorrectly flagged as overdue.
- **Tags not validated**: casting `raw.tags as string[]` without `Array.isArray`. Works on valid data but silently accepts `null` or a number.
- **`isOverdue` computed at construction time**: storing `new Date()` in the constructor instead of using a getter means the value is frozen at startup and wrong for long-running programs.
- **Date comparison using strings**: `this.dueDate.toISOString() < new Date().toISOString()` — works for UTC dates but is fragile and shows a misunderstanding.

---

## Follow-up questions

**Easy**
- "What is the difference between a `get` accessor and a regular method? When would you prefer one over the other?"
- "Why do we use `parseInt(raw.id, 10)` with the radix `10` explicitly?"

**Medium**
- "Your `isOverdue` getter calls `new Date()` on every access. Is that a problem? When could it be?"
- "The `tags` field is typed `unknown` in `RawTask`. Why not type it `string[]` directly since that's what we expect?"
- "How would you write a unit test for `TaskTracker.generateReport()` without reading any files?"

**Hard**
- "How would you extend this to support filtering the report by tag?"
- "`Array.isArray(raw.tags) && raw.tags.every(t => typeof t === 'string')` returns `boolean`. TypeScript still types `raw.tags` as `unknown` after this check. How would you write a type guard function to narrow it to `string[]`?"

---

## Green flags
- Reads the full skeleton before touching any code.
- Spots both malformed entries before running the program.
- Uses `isOverdue` inside `generateReport` rather than re-implementing the logic.
- Validates `tags` with `Array.isArray` without being prompted.
- Implements `isOverdue` as a getter rather than a computed field set in the constructor.

## Red flags
- Skips `tags` validation ("arrays from JSON are always valid").
- Hard-codes `new Date("2026-05-06")` instead of using `new Date()`.
- Checks `status !== "done"` manually inside `generateReport` instead of using `isOverdue`.
- Silently swallows all errors in `parseTasks`.
