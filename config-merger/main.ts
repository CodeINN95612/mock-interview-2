import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

// ─── Types ───────────────────────────────────────────────────────────────────

type FieldType = "string" | "number" | "boolean";

interface SchemaField {
  key:      string;
  type:     FieldType;
  required: boolean;
  min?:     number;
  max?:     number;
  enum?:    string[];
}

interface Schema {
  fields: SchemaField[];
}

// ─── Custom Errors ───────────────────────────────────────────────────────────

class ConfigLoadError extends Error {
  constructor(
    public readonly filePath: string,
    message: string
  ) {
    super(message);
    this.name = "ConfigLoadError";
  }
}

// Not thrown — instances are collected and reported together.
class ConfigValidationError {
  constructor(
    public readonly key: string,
    public readonly message: string
  ) {}

  toString(): string {
    return `[${this.key}] ${this.message}`;
  }
}

class ValidationFailedError extends Error {
  constructor(public readonly errors: ConfigValidationError[]) {
    super(`Config validation failed with ${errors.length} error(s)`);
    this.name = "ValidationFailedError";
  }
}

// ─── File I/O ─────────────────────────────────────────────────────────────────

async function loadSchema(filePath: string): Promise<Schema> {
  // TODO: Read and JSON-parse the schema file at `filePath`.
  // Throw ConfigLoadError if the file cannot be read or parsed.
  throw new Error("Not implemented");
}

async function loadConfig(filePath: string): Promise<Record<string, unknown>> {
  // TODO: Read and JSON-parse the config file at `filePath`.
  // Throw ConfigLoadError if the file cannot be read or parsed.
  // This is for REQUIRED files — any failure is fatal.
  throw new Error("Not implemented");
}

async function loadOptionalConfig(
  filePath: string
): Promise<Record<string, unknown> | null> {
  // TODO: Same as loadConfig, but return null if the file does not exist (ENOENT).
  // Any other error (permission denied, malformed JSON, etc.) must still
  // throw ConfigLoadError — only a missing file is acceptable.
  // Hint: catch the read error and check
  //   (err as NodeJS.ErrnoException).code === "ENOENT"
  throw new Error("Not implemented");
}

async function writeConfig(
  config: Record<string, unknown>,
  outputPath: string
): Promise<void> {
  // TODO: Write `config` as formatted JSON (2-space indent) to `outputPath`.
  // Throw a descriptive Error if writing fails.
  throw new Error("Not implemented");
}

// ─── Config Processing ────────────────────────────────────────────────────────

function deepMerge(
  base: Record<string, unknown>,
  override: Record<string, unknown>
): Record<string, unknown> {
  // TODO: Return a new object that deep-merges `base` and `override`.
  // Rules:
  //   - `override` values take precedence over `base` values.
  //   - If BOTH sides have a plain object (not null, not an array) at the
  //     same key, recurse into them.
  //   - For everything else (primitives, arrays, null, mismatched types),
  //     the override value replaces the base value entirely.
  // Do NOT mutate `base` or `override`.
  throw new Error("Not implemented");
}

function getNestedValue(obj: Record<string, unknown>, dotPath: string): unknown {
  // TODO: Traverse `obj` following the dot-notation path in `dotPath` and
  // return the value at that location.
  // Example: getNestedValue({ a: { b: 42 } }, "a.b") === 42
  // Return undefined if any segment along the path is missing or if an
  // intermediate value is not a plain object.
  throw new Error("Not implemented");
}

function validateConfig(
  config: Record<string, unknown>,
  schema: Schema
): ConfigValidationError[] {
  // TODO: Validate every field in `schema` against `config`.
  // Collect ALL errors — do not stop at the first failure.
  //
  // For each SchemaField:
  //   1. Retrieve the value with getNestedValue.
  //   2. If value is undefined or null:
  //        - required → add error "Required field is missing"
  //        - optional → skip the remaining checks for this field
  //   3. If typeof value !== field.type:
  //        - add error describing the mismatch, then SKIP to next field
  //          (range and enum checks don't apply to a wrong-typed value)
  //   4. If field.min is set and value < field.min → add error
  //   5. If field.max is set and value > field.max → add error
  //   6. If field.enum is set and value is not in field.enum → add error
  //
  // Return the array of ConfigValidationError instances (empty = all good).
  throw new Error("Not implemented");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const env        = process.argv[2] ?? "development";
  const configsDir = join(import.meta.dirname, "configs");
  const schemaPath = join(import.meta.dirname, "schema.json");
  const outputPath = join(import.meta.dirname, "config.out.json");

  // TODO:
  // 1. Print which environment is active.
  // 2. Load the schema from schemaPath.
  // 3. Load configs/default.json (required — use loadConfig).
  // 4. Load configs/<env>.json (optional — use loadOptionalConfig).
  //    Print a note if the environment file was not found.
  // 5. Deep-merge: start with the default config, then apply the environment
  //    overrides on top (if present).
  // 6. Validate the merged config. If there are any errors:
  //      - Print each error.
  //      - Throw ValidationFailedError so the catch block exits with code 1.
  // 7. Write the merged config to outputPath.
  // 8. Print a success message.
  // Wrap everything in try/catch; on any error print the message and call
  // process.exit(1).
}

main();
