# Config Merger & Validator

Load layered JSON config files (a required default plus an optional
environment override), deep-merge them, validate the result against a schema,
and write the final config — or report every validation error if something
is wrong.

Read [EXERCISE.md](./EXERCISE.md) for the full specification before starting.

## Difficulty

**Senior** — completing all requirements correctly in under one hour indicates
senior-level proficiency (5+ years). The distinguishing challenges are the
recursive `deepMerge` edge cases (null, arrays, mismatched types), silencing
only `ENOENT` in `loadOptionalConfig`, collecting every validation error rather
than stopping at the first, and skipping range/enum checks when a type mismatch
is already found.

| Completion time | Suggested level |
|-----------------|-----------------|
| Under 1 hour    | Senior (5+ yrs) |
| 1–2 hours       | Mid             |
| Over 2 hours    | Junior          |

## Setup

```bash
npm install
```

## Usage

```bash
npm start staging       # valid merge → writes config.out.json
npm start production    # 3 validation errors → exits with code 1
npm start               # defaults to "development" (no file) → valid
npm run check           # type-check only
```

## Files

```
.
├── configs/
│   ├── default.json      # required base config
│   ├── staging.json      # valid overrides
│   └── production.json   # overrides with intentional errors
├── schema.json           # field definitions with types and constraints
├── main.ts               # skeleton — fill in the function bodies
├── config.out.json       # generated on a successful run
├── package.json
└── tsconfig.json
```

## Notes

- Only `@types/node` and `typescript` are needed — do not install runtime packages.
- Uses ESM (`"type": "module"`). Do not use `require()`.
- On Node 23+ you can run `node main.ts staging` directly without the `--experimental-strip-types` flag.
