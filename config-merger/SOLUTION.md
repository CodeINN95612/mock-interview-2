# SOLUTION & EVALUATION GUIDE

> **Interviewer only — do not share with the candidate.**

---

## Expected merged configs

### `staging` (default + staging)
```json
{
  "server":   { "port": 8080, "host": "staging.internal", "timeout": 30 },
  "database": { "url": "postgres://staging-db:5432/myapp", "poolSize": 20 },
  "logging":  { "level": "info", "format": "text" },
  "features": { "darkMode": false }
}
```

### `production` (default + production) — validation fails
```json
{
  "server":   { "port": "443", "host": "api.example.com", "timeout": 30 },
  "database": { "url": "postgres://prod-db:5432/myapp", "poolSize": 150 },
  "logging":  { "level": "verbose", "format": "text" },
  "features": { "darkMode": false }
}
```

### Validation errors on production
| Field | Error |
|---|---|
| `server.port` | Expected type `"number"`, got `"string"` |
| `database.poolSize` | Value `150` exceeds maximum `100` |
| `logging.level` | `"verbose"` not in enum `["debug","info","warn","error"]` |

### Key merge observation
`server.timeout: 30` and `logging.format: "text"` survive into both merged
configs because both sides have a plain object at `server` / `logging`,
so the merge recurses and only the specified sub-keys are overridden.

---

## Complete solution

```typescript
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

type FieldType = "string" | "number" | "boolean";

interface SchemaField {
  key: string; type: FieldType; required: boolean;
  min?: number; max?: number; enum?: string[];
}

interface Schema { fields: SchemaField[]; }

class ConfigLoadError extends Error {
  constructor(public readonly filePath: string, message: string) {
    super(message);
    this.name = "ConfigLoadError";
  }
}

class ConfigValidationError {
  constructor(public readonly key: string, public readonly message: string) {}
  toString(): string { return `[${this.key}] ${this.message}`; }
}

class ValidationFailedError extends Error {
  constructor(public readonly errors: ConfigValidationError[]) {
    super(`Config validation failed with ${errors.length} error(s)`);
    this.name = "ValidationFailedError";
  }
}

async function loadSchema(filePath: string): Promise<Schema> {
  let content: string;
  try {
    content = await readFile(filePath, "utf-8");
  } catch (err) {
    throw new ConfigLoadError(filePath, `Cannot read schema: ${(err as Error).message}`);
  }
  try {
    return JSON.parse(content) as Schema;
  } catch (err) {
    throw new ConfigLoadError(filePath, `Cannot parse schema as JSON: ${(err as Error).message}`);
  }
}

async function loadConfig(filePath: string): Promise<Record<string, unknown>> {
  let content: string;
  try {
    content = await readFile(filePath, "utf-8");
  } catch (err) {
    throw new ConfigLoadError(filePath, `Cannot read config: ${(err as Error).message}`);
  }
  try {
    return JSON.parse(content) as Record<string, unknown>;
  } catch (err) {
    throw new ConfigLoadError(filePath, `Cannot parse config as JSON: ${(err as Error).message}`);
  }
}

async function loadOptionalConfig(
  filePath: string
): Promise<Record<string, unknown> | null> {
  let content: string;
  try {
    content = await readFile(filePath, "utf-8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw new ConfigLoadError(filePath, `Cannot read config: ${(err as Error).message}`);
  }
  try {
    return JSON.parse(content) as Record<string, unknown>;
  } catch (err) {
    throw new ConfigLoadError(filePath, `Cannot parse config as JSON: ${(err as Error).message}`);
  }
}

async function writeConfig(
  config: Record<string, unknown>,
  outputPath: string
): Promise<void> {
  try {
    await writeFile(outputPath, JSON.stringify(config, null, 2), "utf-8");
  } catch (err) {
    throw new Error(`Failed to write config to "${outputPath}": ${(err as Error).message}`);
  }
}

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null && !Array.isArray(val);
}

function deepMerge(
  base: Record<string, unknown>,
  override: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (isPlainObject(value) && isPlainObject(result[key])) {
      result[key] = deepMerge(
        result[key] as Record<string, unknown>,
        value
      );
    } else {
      result[key] = value;
    }
  }
  return result;
}

function getNestedValue(obj: Record<string, unknown>, dotPath: string): unknown {
  return dotPath.split(".").reduce<unknown>((current, key) => {
    if (isPlainObject(current)) return current[key];
    return undefined;
  }, obj);
}

function validateConfig(
  config: Record<string, unknown>,
  schema: Schema
): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];

  for (const field of schema.fields) {
    const value = getNestedValue(config, field.key);

    if (value === undefined || value === null) {
      if (field.required) {
        errors.push(new ConfigValidationError(field.key, "Required field is missing"));
      }
      continue;
    }

    if (typeof value !== field.type) {
      errors.push(new ConfigValidationError(
        field.key,
        `Expected type "${field.type}", got "${typeof value}"`
      ));
      continue;
    }

    if (field.type === "number") {
      if (field.min !== undefined && (value as number) < field.min) {
        errors.push(new ConfigValidationError(
          field.key, `Value ${value} is below minimum ${field.min}`
        ));
      }
      if (field.max !== undefined && (value as number) > field.max) {
        errors.push(new ConfigValidationError(
          field.key, `Value ${value} exceeds maximum ${field.max}`
        ));
      }
    }

    if (field.enum !== undefined && !field.enum.includes(value as string)) {
      errors.push(new ConfigValidationError(
        field.key,
        `"${value}" is not one of: ${field.enum.join(", ")}`
      ));
    }
  }

  return errors;
}

async function main(): Promise<void> {
  const env        = process.argv[2] ?? "development";
  const configsDir = join(import.meta.dirname, "configs");
  const schemaPath = join(import.meta.dirname, "schema.json");
  const outputPath = join(import.meta.dirname, "config.out.json");

  try {
    console.log(`Environment: ${env}`);

    const schema = await loadSchema(schemaPath);

    process.stdout.write("Loading default config ... ");
    const defaultConfig = await loadConfig(join(configsDir, "default.json"));
    console.log("ok");

    process.stdout.write(`Loading ${env} config ... `);
    const envConfig = await loadOptionalConfig(join(configsDir, `${env}.json`));
    if (envConfig === null) {
      console.log("not found, using defaults only");
    } else {
      console.log("ok");
    }

    const merged = envConfig ? deepMerge(defaultConfig, envConfig) : defaultConfig;

    const errors = validateConfig(merged, schema);
    if (errors.length > 0) {
      console.log(`\nConfig validation failed with ${errors.length} error(s):`);
      for (const err of errors) console.log(`  ${err}`);
      throw new ValidationFailedError(errors);
    }

    console.log("\nMerged config is valid.");
    await writeConfig(merged, outputPath);
    console.log(`Config written to ${outputPath}`);
  } catch (err) {
    if (!(err instanceof ValidationFailedError)) {
      console.error(`\nError: ${(err as Error).message}`);
    }
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
| `FieldType` union used correctly; no `any` anywhere | 6 | Casting `value as number` / `value as string` after a `typeof` guard is fine |
| `isPlainObject` (or equivalent) written as a type guard returning `val is Record<string, unknown>` | 6 | Inline check without a type guard that doesn't narrow properly is –3 |
| `Record<string, unknown>` used throughout instead of `object` or `any` | 4 | |
| `NodeJS.ErrnoException` used to check `.code` | 4 | Using `(err as any).code` is –2 |

### `deepMerge` — 25 pts

This is the core senior challenge. Award partial credit carefully.

| Criterion | Points | What to look for |
|-----------|--------|------------------|
| Returns a new object (no mutation of `base` or `override`) | 5 | `base[key] = ...` is an automatic –5 |
| Recursion triggered only when BOTH sides are plain objects | 8 | Missing the null check or array check is –4 each |
| Primitive / array / null values on the override side replace entirely | 6 | |
| Handles mismatched types correctly (e.g. base has object, override has string) | 6 | Often missed — the override should win, not throw |

**Common mistakes:**
- `{ ...base, ...override }` — shallow merge only, fails for nested objects
- Recursing when only one side is an object — corrupts data
- Mutating `base` in place

### `getNestedValue` — 10 pts

| Criterion | Points | What to look for |
|-----------|--------|------------------|
| Splits on `"."` and reduces correctly | 5 | |
| Returns `undefined` (not throws) when a segment is missing | 3 | |
| Does not crash when an intermediate value is a primitive | 2 | `(null as any).x` or similar would throw at runtime |

### `validateConfig` — 20 pts

| Criterion | Points | What to look for |
|-----------|--------|------------------|
| Collects ALL errors rather than stopping at first | 8 | Throwing on first error is the most common mistake here |
| Skips range/enum checks after a type mismatch | 5 | Without this, a string port would also generate a bogus "below minimum 1" error |
| All six check types implemented (missing-required, type, min, max, enum, missing-optional-skip) | 7 | |

### `loadOptionalConfig` / error handling — 15 pts

| Criterion | Points | What to look for |
|-----------|--------|------------------|
| `ENOENT` is the only silently-handled error; all others re-throw | 8 | Catching all errors and returning null is –6 |
| Both file-read failure and JSON parse failure throw `ConfigLoadError` | 4 | |
| `ValidationFailedError` not double-printed in `main` catch block | 3 | The catch block should not re-print a `ValidationFailedError` since its errors were already printed |

### Async / Await & Filesystem — 10 pts

| Criterion | Points | What to look for |
|-----------|--------|------------------|
| All file I/O uses `await` with `node:fs/promises` | 5 | |
| `main` is `async` with `try/catch` and `process.exit(1)` | 5 | |

---

## Key distinguishing challenges (what separates senior from mid)

1. **`deepMerge` edge cases** — the null-check and array-check inside `isPlainObject` are easy to forget. A shallow spread works on the surface but fails the `server.timeout` test case.
2. **`ENOENT`-only silence** — a mid developer will often catch all errors and return null, silently hiding permission issues or malformed JSON.
3. **Not double-printing `ValidationFailedError`** — the candidate must detect that this error was already reported and skip re-printing in the catch block.
4. **Type narrowing with `Record<string, unknown>`** — every cast must be guarded by a runtime check first.
5. **Skip-on-type-mismatch in `validateConfig`** — without this, a wrong-typed field generates spurious additional errors.

---

## Follow-up questions

**Medium**
- "Your `deepMerge` doesn't handle arrays specially — if `base` has `tags: ["a"]` and override has `tags: ["b", "c"]`, what happens? Is that the right behavior?"
- "What would happen if `schema.json` itself is malformed? Where does that error surface?"
- "Why does `getNestedValue` return `undefined` instead of throwing when a path segment is missing?"

**Hard**
- "How would you make `validateConfig` return typed errors — i.e., different error subclasses for type errors vs range errors vs missing-required — so callers could handle them differently?"
- "Right now `deepMerge` is not generic — it always returns `Record<string, unknown>`. How would you add a generic type parameter so callers get a typed result back?"
- "If you needed to support an `array-merge` mode (concatenate arrays instead of replace), how would you thread that option through without changing every call site?"

---

## Green flags
- Writes `isPlainObject` as a proper type guard before touching `deepMerge`.
- Tests `deepMerge` mentally with the `server.timeout` scenario before coding `main`.
- Catches the `ValidationFailedError` separately to avoid double-printing.
- Notices that `loadOptionalConfig` must still throw on malformed JSON.

## Red flags
- Shallow merge with `{ ...base, ...override }` — misses recursion entirely.
- Catches all errors in `loadOptionalConfig` (silences non-ENOENT errors).
- Stops validation at first error (`return` instead of `continue`).
- Uses `any` to work around `Record<string, unknown>` narrowing.
