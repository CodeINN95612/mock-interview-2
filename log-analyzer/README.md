# Server Log Analyzer

Read structured log entries from a JSON file, validate them, and produce a
per-service health summary.

Read [EXERCISE.md](./EXERCISE.md) for the full specification before starting.

## Difficulty

**Senior** — completing all requirements correctly in under one hour indicates
senior-level proficiency (5+ years). Expect a mid-level developer to take
roughly 1.5–2 hours and may miss edge cases such as the alphabetical
tie-breaking in `mostCommonError` or wrapping JSON parse errors in
`FileReadError`.

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
├── logs.json       # input — 21 entries, 2 intentionally malformed
├── main.ts         # skeleton — fill in the function bodies
├── summary.json    # generated on first successful run
├── package.json
├── tsconfig.json
└── EXERCISE.md
```

## Notes

- Only `@types/node` and `typescript` are needed — do not install runtime packages.
- Uses ESM (`"type": "module"`). Do not use `require()`.
- On Node 23+ you can run `node main.ts` directly without the `--experimental-strip-types` flag.
