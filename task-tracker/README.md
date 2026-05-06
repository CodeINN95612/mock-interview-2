# Task Tracker

Read project tasks from a JSON file, validate them, and produce a per-assignee
progress report including overdue task detection.

Read [EXERCISE.md](./EXERCISE.md) for the full specification before starting.

## Difficulty

**Mid** — completing all requirements correctly in under one hour indicates
mid-level proficiency (2–4 years). Expect a junior developer to take roughly
1.5–2 hours and likely miss the `tags` validation or get the `isOverdue` logic
subtly wrong (not checking `isDone` first, or computing it at construction time
rather than as a getter).

## Setup

```bash
npm install
```

## Usage

```bash
npm start        # run the program
npm run check    # type-check without running
```

## Files

```
.
├── tasks.json      # input — 15 entries, 2 intentionally malformed
├── main.ts         # skeleton — fill in the function bodies
├── report.json     # generated on first successful run
├── package.json
├── tsconfig.json
└── EXERCISE.md
```

## Notes

- Only `@types/node` and `typescript` are needed — do not install runtime packages.
- Uses ESM (`"type": "module"`). Do not use `require()`.
- On Node 23+ you can run `node main.ts` directly without the `--experimental-strip-types` flag.
