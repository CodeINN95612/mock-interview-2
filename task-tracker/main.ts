import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

// ─── Types ───────────────────────────────────────────────────────────────────

type Status   = "todo" | "in-progress" | "done";
type Priority = "low"  | "medium"      | "high";

const VALID_STATUSES:   Status[]   = ["todo", "in-progress", "done"];
const VALID_PRIORITIES: Priority[] = ["low", "medium", "high"];

interface RawTask {
  id:       string;
  title:    string;
  status:   string;
  priority: string;
  assignee: string;
  dueDate:  string;
  tags:     unknown; // validated as string[] in the Task constructor
}

interface AssigneeReport {
  assignee:          string;
  totalTasks:        number;
  completedTasks:    number;
  completionRate:    number; // (completedTasks / totalTasks) * 100, rounded to 2 dp
  overdueCount:      number; // tasks where isOverdue === true
  highPriorityCount: number; // tasks where priority === "high"
}

// ─── Custom Errors ───────────────────────────────────────────────────────────

class ValidationError extends Error {
  constructor(
    public readonly field: string,
    public readonly value: string,
    message: string
  ) {
    super(message);
    this.name = "ValidationError";
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

// ─── Task ─────────────────────────────────────────────────────────────────────

class Task {
  readonly id:       number;
  readonly title:    string;
  readonly status:   Status;
  readonly priority: Priority;
  readonly assignee: string;
  readonly dueDate:  Date;
  readonly tags:     string[];

  constructor(raw: RawTask) {
    // TODO: Parse and validate each field from `raw`.
    // Throw ValidationError for any invalid value:
    //   - id must be a positive integer
    //   - title must be non-empty after trimming
    //   - status must be one of the values in VALID_STATUSES
    //   - priority must be one of the values in VALID_PRIORITIES
    //   - assignee must be non-empty after trimming
    //   - dueDate must parse to a valid Date
    //   - tags must be an array where every element is a string
    //     (hint: Array.isArray + every element check)
    // Assign validated values to the class fields.
    throw new Error("Not implemented");
  }

  get isDone(): boolean {
    // TODO: Return true if status === "done".
    throw new Error("Not implemented");
  }

  get isOverdue(): boolean {
    // TODO: Return true if the task is not done AND its dueDate is before now.
    throw new Error("Not implemented");
  }

  toString(): string {
    // TODO: Return a readable string, e.g.:
    //   "[HIGH] Implement payment flow — Alice (due 2026-04-30)"
    throw new Error("Not implemented");
  }
}

// ─── File I/O ─────────────────────────────────────────────────────────────────

async function readTasks(filePath: string): Promise<RawTask[]> {
  // TODO: Read the file at `filePath` with UTF-8 encoding using fs/promises.
  // Throw FileReadError (wrapping the original message) if reading fails.
  // Parse the content as JSON and return it as RawTask[].
  // Throw FileReadError if JSON.parse throws.
  throw new Error("Not implemented");
}

async function writeReport(
  report: AssigneeReport[],
  outputPath: string
): Promise<void> {
  // TODO: Serialize `report` to formatted JSON (2-space indent) and write it
  // to `outputPath` using fs/promises.
  // Throw a descriptive Error if writing fails.
  throw new Error("Not implemented");
}

// ─── Task Parsing ─────────────────────────────────────────────────────────────

function parseTasks(rawTasks: RawTask[]): Task[] {
  // TODO: Attempt to construct a Task for each element of `rawTasks`.
  // If construction throws a ValidationError, print a warning to stderr and
  // skip that entry. One bad entry must never crash the whole import.
  // Return the array of valid Task instances.
  throw new Error("Not implemented");
}

// ─── Task Tracker ─────────────────────────────────────────────────────────────

class TaskTracker {
  private readonly tasks: Task[];

  constructor(tasks: Task[]) {
    this.tasks = tasks;
  }

  groupByAssignee(): Record<string, Task[]> {
    // TODO: Return an object whose keys are assignee names and whose values are
    // the arrays of Task objects assigned to that person.
    throw new Error("Not implemented");
  }

  generateReport(): AssigneeReport[] {
    // TODO: Use groupByAssignee() to build one AssigneeReport per assignee:
    //
    //   totalTasks:        total count of tasks for this assignee
    //   completedTasks:    count where isDone === true
    //   completionRate:    (completedTasks / totalTasks) * 100, rounded to 2 dp
    //   overdueCount:      count where isOverdue === true
    //   highPriorityCount: count where priority === "high"
    //
    // Sort the result alphabetically by assignee name.
    throw new Error("Not implemented");
  }

  getOverdueTasks(): Task[] {
    // TODO: Return all tasks where isOverdue === true, sorted by dueDate
    // ascending (earliest due date first — the most overdue task comes first).
    throw new Error("Not implemented");
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const tasksPath  = join(import.meta.dirname, "tasks.json");
  const outputPath = join(import.meta.dirname, "report.json");

  // TODO:
  // 1. Call readTasks to load the raw entries.
  // 2. Call parseTasks to get valid Task instances.
  // 3. Log how many tasks were loaded and how many entries were skipped.
  // 4. Instantiate TaskTracker.
  // 5. Call getOverdueTasks() and print each overdue task using toString().
  // 6. Call generateReport() and then writeReport() to save the result.
  // 7. Print a report table: assignee | total | done | rate | overdue | high priority
  // Wrap everything in try/catch; on any error print the message and call
  // process.exit(1).
}

main();
