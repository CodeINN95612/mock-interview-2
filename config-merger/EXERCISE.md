# Exercise: Config Merger & Validator

## Scenario

Applications often manage configuration across multiple environments by layering
files: a `default.json` that defines every key with safe baseline values, and
optional per-environment files (`staging.json`, `production.json`) that override
specific values.

Your task is to implement the pipeline that loads these files, deep-merges them,
validates the result against a schema, and writes the final config — or reports
every validation error if something is wrong.

The skeleton in `main.ts` already defines every type, class, and function —
**you only need to fill in the bodies**. Do not change any signature, interface,
or class definition.

---

## Setup

```bash
npm install
```

Run for a specific environment:

```bash
npm start staging       # loads default.json + staging.json  → should succeed
npm start production    # loads default.json + production.json → should fail
npm start               # defaults to "development" (no override file exists) → should succeed
```

Type-check without running:

```bash
npm run check
```

---

## Files

```
configs/
  default.json      ← always loaded (required)
  staging.json      ← valid overrides
  production.json   ← overrides with intentional errors
schema.json         ← defines expected keys, types, and constraints
main.ts             ← skeleton
```

---

## What to implement

Work through the file top-to-bottom.

### 1. `loadSchema(filePath)`

Read and JSON-parse the schema file. Throw `ConfigLoadError` for any failure
(file missing, malformed JSON, etc.).

### 2. `loadConfig(filePath)`

Read and JSON-parse a config file. Throw `ConfigLoadError` for any failure.
Use this for **required** files where absence is always an error.

### 3. `loadOptionalConfig(filePath)`

Same as `loadConfig`, but return `null` when the file does not exist (`ENOENT`).
All other errors — permission denied, malformed JSON, etc. — must still throw
`ConfigLoadError`. Only a missing file is acceptable here.

```typescript
// Hint — how to detect a missing file:
(err as NodeJS.ErrnoException).code === "ENOENT"
```

### 4. `writeConfig(config, outputPath)`

Serialize `config` to formatted JSON (2-space indent) and write it. Throw a
descriptive `Error` if writing fails.

### 5. `deepMerge(base, override)`

Return a **new object** that is the deep merge of `base` and `override`. Rules:

- `override` values always take precedence.
- If **both** sides have a plain object (not `null`, not an array) at the same
  key, recurse into them — merging their sub-keys rather than replacing wholesale.
- For everything else (primitives, arrays, `null`, or mismatched types), the
  override value replaces the base value entirely.
- Do not mutate `base` or `override`.

**Example:**
```
base     = { server: { port: 3000, host: "localhost", timeout: 30 } }
override = { server: { port: 8080 } }
result   = { server: { port: 8080, host: "localhost", timeout: 30 } }
```

### 6. `getNestedValue(obj, dotPath)`

Traverse `obj` following the dot-notation path and return the value found there.

```typescript
getNestedValue({ a: { b: 42 } }, "a.b")  // → 42
getNestedValue({ a: 1 },         "a.b")  // → undefined
getNestedValue({},               "x.y")  // → undefined
```

Return `undefined` if any segment is missing or if an intermediate value is not
a plain object.

### 7. `validateConfig(config, schema)`

Validate every field listed in `schema.fields` against the merged `config`.
**Collect all errors — do not stop at the first failure.**

For each `SchemaField`:

1. Get the value using `getNestedValue`.
2. If the value is `undefined` or `null`:
   - `required: true` → add `ConfigValidationError`: `"Required field is missing"`
   - `required: false` → skip remaining checks for this field
3. If `typeof value !== field.type` → add a type-mismatch error, then **skip to the next field** (range and enum checks are meaningless on a wrong-typed value).
4. If `field.min` is set and `value < field.min` → add an error.
5. If `field.max` is set and `value > field.max` → add an error.
6. If `field.enum` is set and `value` is not in the array → add an error.

Return the collected `ConfigValidationError[]` (empty array means all good).

### 8. `main()`

1. Read the environment from `process.argv[2]`, defaulting to `"development"`.
2. Load the schema.
3. Load `configs/default.json` (required).
4. Load `configs/<env>.json` (optional — note if not found).
5. Deep-merge: default first, environment overrides on top.
6. Validate. If errors exist: print each one and throw `ValidationFailedError`.
7. Write the merged config to `config.out.json`.
8. Print a success message.

Wrap everything in `try/catch`; on any error print its message and call
`process.exit(1)`.

---

## Expected output — `npm start staging`

```
Environment: staging
Loading default config ... ok
Loading staging config ... ok

Merged config is valid.
Config written to config.out.json
```

## Expected output — `npm start production`

```
Environment: production
Loading default config ... ok
Loading production config ... ok

Config validation failed with 3 error(s):
  [server.port]       Expected type "number", got "string"
  [database.poolSize] Value 150 exceeds maximum 100
  [logging.level]     "verbose" is not one of: debug, info, warn, error
```

## Expected output — `npm start` (no env file)

```
Environment: development
Loading default config ... ok
Loading development config ... not found, using defaults only

Merged config is valid.
Config written to config.out.json
```

---

## Constraints

- Use only Node.js built-in modules. Do not install any additional runtime packages.
- Do not use `require()` or CommonJS; the project is ESM.
- Do not use `any` as a type.
- All async file I/O must use `async`/`await`.
