/**
 * =============================================================================
 * Generic Data Loader — JSON-driven test data with dynamic resolution
 * =============================================================================
 *
 * Reads a JSON data file from a designated directory and resolves each field
 * according to these rules:
 *
 *   empty string ("")  →  default fallback value (via config.defaults)
 *   "DYNAMIC"          →  auto-generated random value (via config.dynamic)
 *   "{{template}}"     →  resolved template placeholder (via config.templates)
 *   anything else      →  used as-is (static hardcoded value)
 *
 * Typical usage:
 *
 *   import { createDataLoader } from './data.loader';
 *   import type { MyData } from '../data/my.data';
 *
 *   const loadMyData = createDataLoader<MyData>({
 *     name: 'MyData',
 *     dataDir: path.resolve(__dirname, '..', 'data', 'my-files'),
 *     defaults: { name: () => 'Default Name', ... },
 *     dynamic: { name: () => faker.person.firstName(), ... },
 *     templates: { random_name: () => faker.person.firstName(), ... },
 *   });
 *
 *   const data = loadMyData('my-test.data.json');
 *
 * JSON file structure (flat object or wrapped in "_fields"):
 *
 *   {
 *     "_description": "...",
 *     "_fields": {
 *       "fieldA": "{{random_first_name}}",
 *       "fieldB": "+966500000000",
 *       "fieldC": "DYNAMIC",
 *       "fieldD": ""
 *     }
 *   }
 */

import * as fs from 'fs';
import * as path from 'path';

// =========================================================================
// Types
// =========================================================================

export interface DataLoaderConfig {
  /** Human-readable name for log messages (e.g. "PatientData", "Appointment") */
  name: string;

  /** Absolute directory path where JSON data files are stored */
  dataDir: string;

  /** Maps each field key to a factory that produces its default fallback value */
  defaults: Record<string, () => string | undefined>;

  /**
   * Maps each field key to a factory that produces a *random* value
   * (used when the JSON field is "DYNAMIC").
   */
  dynamic: Record<string, () => string>;

  /**
   * Maps template names to resolver factories.
   * A JSON value like "{{random_name}}" extracts "random_name" and looks
   * it up in this map.
   */
  templates: Record<string, () => string>;
}

// =========================================================================
// Resolution logic
// =========================================================================

/**
 * Resolve a single raw value from the JSON file into its final string value.
 *
 * | Input                       | Behaviour                                |
 * |-----------------------------|------------------------------------------|
 * | `""` / `null` / `undefined` | Falls back to `config.defaults[key]`     |
 * | `"DYNAMIC"`                 | Calls `config.dynamic[key]()`            |
 * | `"{{template}}"`            | Looks up `config.templates[template]()`  |
 * | anything else               | Used verbatim as a static value          |
 */
function resolveField(
  key: string,
  raw: unknown,
  config: DataLoaderConfig,
): string | undefined {
  const { defaults, dynamic, templates, name } = config;

  // Nullish / empty → default
  if (raw === null || raw === undefined || raw === '') {
    return defaults[key]?.();
  }

  // Ensure we have a string from here on
  const str = String(raw);

  // Dynamic flag → generate on the fly
  if (str === 'DYNAMIC') {
    const fn = dynamic[key];
    if (fn) {
      const value = fn();
      // Guard: if the generator returned undefined (e.g. optional fields),
      // fall through so no field is silently null.
      if (value !== undefined) return value;
    }
    const defaultFn = defaults[key];
    if (defaultFn) {
      const fallback = defaultFn();
      if (fallback !== undefined) return fallback;
    }
    // Last-resort fallback: return a short random string instead of
    // the literal "DYNAMIC" so tests fail obviously if a field is missed.
    return `__UNRESOLVED_DYNAMIC__${key}__`;
  }

  // Template placeholder → extract name and resolve
  const templateMatch = str.match(/^\{\{(.+)\}\}$/);
  if (templateMatch) {
    const templateName = templateMatch[1].trim();
    const resolver = templates[templateName];
    if (resolver) return resolver();
    console.warn(`[${name}Loader] Unknown template "{{${templateName}}}" — using raw value`);
    return str;
  }

  // Static value — use as-is
  return str;
}

// =========================================================================
// Factory
// =========================================================================

/**
 * Create a data loader function for a specific data type.
 *
 * @param config  Configuration specifying defaults, dynamic generators,
 *                template resolvers, and the data file directory.
 * @returns A function that reads a JSON file and returns a fully resolved
 *          data object.
 *
 * @example
 *   const loadPatient = createDataLoader<PatientData>({
 *     name: 'PatientData',
 *     dataDir: 'src/data/patient-files',
 *     defaults: { firstNameAr: () => fakerAr.person.firstName() },
 *     dynamic: { firstNameAr: () => fakerAr.person.firstName() },
 *     templates: { random_first_name: () => sanitizeName(fakerEn.person.firstName()) },
 *   });
 *
 *   const patient = loadPatient('minimal-patient.data.json');
 */
export function createDataLoader<T extends Record<string, any>>(
  config: DataLoaderConfig,
): (fileName: string, overrides?: Partial<T>) => T {
  const { dataDir, name } = config;

  return function loadData(
    fileName: string,
    overrides?: Partial<T>,
  ): T {
    const filePath = path.resolve(dataDir, fileName);

    if (!fs.existsSync(filePath)) {
      throw new Error(
        `[${name}Loader] File not found: ${filePath}\n` +
        `Expected data files in: ${dataDir}`,
      );
    }

    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // Support both flat JSON and "_fields"-wrapped JSON (allows metadata keys
    // like _description, _version, etc. to coexist without conflicts)
    const fields: Record<string, unknown> = raw._fields ?? {};

    // If the JSON is flat (no _fields wrapper), merge all non-underscore keys
    if (!raw._fields) {
      for (const [key, value] of Object.entries(raw)) {
        if (!key.startsWith('_')) {
          fields[key] = value;
        }
      }
    }

    // Resolve every field
    const resolved: Record<string, string | undefined> = {};
    for (const [key, rawValue] of Object.entries(fields)) {
      resolved[key] = resolveField(key, rawValue, config);
    }

    // Apply runtime overrides last
    return { ...resolved, ...overrides } as T;
  };
}
