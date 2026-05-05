# Server Log Analyzer

A Node.js/TypeScript exercise. Read the full specification in [EXERCISE.md](./EXERCISE.md) before starting.

## Prerequisites

- Node.js 22 or later
- npm

## Installation

```bash
npm install
```

## Usage

Run the program:

```bash
npm start
```

Type-check without running:

```bash
npm run check
```

## Project structure

```
.
├── logs.json       # input data
├── main.ts         # entry point — fill in the function bodies
├── summary.json    # generated on first successful run
├── package.json
├── tsconfig.json
└── EXERCISE.md     # full specification and requirements
```

## Notes

- Do not install additional runtime packages — only `@types/node` and `typescript` are needed.
- The project uses ESM (`"type": "module"`). Do not use `require()`.
- On Node 23+ you can run `node main.ts` directly without the `--experimental-strip-types` flag.
