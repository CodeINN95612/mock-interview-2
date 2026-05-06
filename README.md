# Node.js / TypeScript Interview Exercises

A collection of practical coding exercises for interviewing Node.js developers.
Each exercise is self-contained, requires no external services, and can be
completed with only a Node.js installation.

Every exercise covers the same core skill set:

- **Async / Await** — file I/O with `node:fs/promises`
- **Classes** — constructors, getters, custom errors
- **TypeScript** — union types, `readonly`, no `any`
- **Error handling** — custom error classes, selective catching, re-throwing
- **Filesystem** — reading and writing JSON files

---

## Exercises

### [task-tracker](./task-tracker/) — Mid

Read project tasks from a JSON file, validate them (including an `unknown`-typed
`tags` field), detect overdue tasks, and produce a per-assignee progress report.

Distinguishing challenges: `isOverdue` getter that composes `isDone` and a live
date comparison, `Array.isArray` + element-type validation, `getOverdueTasks()`
sorted by due date.

| Completion time | Suggested level |
|-----------------|-----------------|
| Under 1 hour    | Mid (2–4 yrs)   |
| 1–2 hours       | Junior-Mid      |
| Over 2 hours    | Junior          |

---

### [log-analyzer](./log-analyzer/) — Senior

Read structured log entries from a JSON file and produce a per-service health
summary (error rate, average response time, most common error message).

Distinguishing challenges: null-skipping average with a type predicate,
alphabetical tie-breaking in `mostCommonError`, two-key sort, and wrapping
JSON parse failures in a typed `FileReadError`.

| Completion time | Suggested level |
|-----------------|-----------------|
| Under 1 hour    | Senior (5+ yrs) |
| 1–2 hours       | Mid             |
| Over 2 hours    | Junior          |

---

### [config-merger](./config-merger/) — Senior

Load layered JSON config files (default + environment override), deep-merge
them, validate the result against a schema, and write the final config — or
report every validation error if something is wrong.

Distinguishing challenges: recursive `deepMerge` with null/array/type-mismatch
edge cases, silencing only `ENOENT` in optional file loading, collecting all
validation errors without stopping at the first, and skipping range/enum checks
after a type mismatch.

| Completion time | Suggested level |
|-----------------|-----------------|
| Under 1 hour    | Senior (5+ yrs) |
| 1–2 hours       | Mid             |
| Over 2 hours    | Junior          |

---

## Running an exercise

```bash
cd task-tracker     # or log-analyzer / config-merger
npm install
npm start           # run (config-merger: npm start staging / production)
npm run check       # type-check only
```

Node 23+ supports `node main.ts` directly without flags.

## Interviewer notes

- Each folder has an `EXERCISE.md` for the candidate and a `SOLUTION.md`
  (complete solution, expected output, rubric, and follow-up questions) for you.
- The data files contain intentional errors — how the candidate handles them
  without prompting is a key part of the evaluation.
- Candidates need no internet access; `npm install` only pulls `@types/node`
  and `typescript`.
