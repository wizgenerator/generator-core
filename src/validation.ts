import { GeneratorError } from "./errors.js";
import {
  CONTRACT_VERSION,
  type GeneratorDefinition,
  type InputDefinition,
  type JsonValue,
  type ValueSchema,
} from "./types.js";

const SAFE_ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const SAFE_VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const MAX_DEFINITION_BYTES = 65_536;
const MAX_INPUTS = 50;
const MAX_OPTIONS = 200;
const MAX_SCHEMA_DEPTH = 10;
const MAX_OBJECT_PROPERTIES = 100;
const MAX_STRING_LENGTH = 100_000;
const MAX_ARRAY_ITEMS = 10_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasSafeKey(key: string): boolean {
  return key.length > 0 && key.length <= 100 && !FORBIDDEN_KEYS.has(key);
}

function checkAllowedKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
  issues: string[],
): void {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!allowedSet.has(key)) issues.push(`${path} contains unknown property ${key}`);
  }
}

function addNumericRangeIssues(
  issues: string[],
  path: string,
  minimum: unknown,
  maximum: unknown,
): void {
  if (minimum !== undefined && !Number.isFinite(minimum)) {
    issues.push(`${path}.minimum must be a finite number`);
  }
  if (maximum !== undefined && !Number.isFinite(maximum)) {
    issues.push(`${path}.maximum must be a finite number`);
  }
  if (
    typeof minimum === "number" &&
    typeof maximum === "number" &&
    minimum > maximum
  ) {
    issues.push(`${path}.minimum cannot exceed maximum`);
  }
}

function addCountRangeIssues(
  issues: string[],
  path: string,
  minimum: unknown,
  maximum: unknown,
): void {
  if (minimum !== undefined && (!Number.isSafeInteger(minimum) || Number(minimum) < 0)) {
    issues.push(`${path}.minimum must be a non-negative safe integer`);
  }
  if (maximum !== undefined && (!Number.isSafeInteger(maximum) || Number(maximum) < 0)) {
    issues.push(`${path}.maximum must be a non-negative safe integer`);
  }
  if (typeof minimum === "number" && typeof maximum === "number" && minimum > maximum) {
    issues.push(`${path}.minimum cannot exceed maximum`);
  }
}

function validateValueSchema(schema: unknown, path: string, depth: number, issues: string[]): void {
  if (depth > MAX_SCHEMA_DEPTH) {
    issues.push(`${path} exceeds the maximum schema depth of ${MAX_SCHEMA_DEPTH}`);
    return;
  }
  if (!isRecord(schema) || typeof schema["type"] !== "string") {
    issues.push(`${path} must be a value schema object`);
    return;
  }

  switch (schema["type"]) {
    case "string": {
      checkAllowedKeys(schema, ["type", "minLength", "maxLength", "enum"], path, issues);
      addCountRangeIssues(issues, path, schema["minLength"], schema["maxLength"]);
      if (typeof schema["maxLength"] === "number" && schema["maxLength"] > MAX_STRING_LENGTH) {
        issues.push(`${path}.maxLength cannot exceed ${MAX_STRING_LENGTH}`);
      }
      const values = schema["enum"];
      if (values !== undefined && (!Array.isArray(values) || values.length === 0 || values.some((item) => typeof item !== "string"))) {
        issues.push(`${path}.enum must be a non-empty string array`);
      }
      break;
    }
    case "number":
      checkAllowedKeys(schema, ["type", "minimum", "maximum", "integer"], path, issues);
      addNumericRangeIssues(issues, path, schema["minimum"], schema["maximum"]);
      if (schema["integer"] !== undefined && typeof schema["integer"] !== "boolean") {
        issues.push(`${path}.integer must be boolean`);
      }
      break;
    case "boolean":
      checkAllowedKeys(schema, ["type"], path, issues);
      break;
    case "array": {
      checkAllowedKeys(schema, ["type", "items", "minItems", "maxItems"], path, issues);
      addCountRangeIssues(issues, path, schema["minItems"], schema["maxItems"]);
      if (typeof schema["maxItems"] === "number" && schema["maxItems"] > MAX_ARRAY_ITEMS) {
        issues.push(`${path}.maxItems cannot exceed ${MAX_ARRAY_ITEMS}`);
      }
      validateValueSchema(schema["items"], `${path}.items`, depth + 1, issues);
      break;
    }
    case "object": {
      checkAllowedKeys(schema, ["type", "properties", "required", "additionalProperties"], path, issues);
      const properties = schema["properties"];
      if (!isRecord(properties)) {
        issues.push(`${path}.properties must be an object`);
        break;
      }
      const entries = Object.entries(properties);
      if (entries.length > MAX_OBJECT_PROPERTIES) {
        issues.push(`${path}.properties cannot exceed ${MAX_OBJECT_PROPERTIES} entries`);
      }
      for (const [key, child] of entries) {
        if (!hasSafeKey(key)) issues.push(`${path}.properties contains unsafe key ${JSON.stringify(key)}`);
        validateValueSchema(child, `${path}.properties.${key}`, depth + 1, issues);
      }
      const required = schema["required"];
      if (required !== undefined) {
        if (!Array.isArray(required) || required.some((key) => typeof key !== "string")) {
          issues.push(`${path}.required must be a string array`);
        } else {
          for (const key of required) {
            if (!Object.hasOwn(properties, key)) issues.push(`${path}.required contains unknown property ${key}`);
          }
        }
      }
      if (schema["additionalProperties"] !== undefined && typeof schema["additionalProperties"] !== "boolean") {
        issues.push(`${path}.additionalProperties must be boolean`);
      }
      break;
    }
    default:
      issues.push(`${path}.type is not supported`);
  }
}

function validateInputDefinition(input: unknown, index: number, issues: string[]): void {
  const path = `inputs[${index}]`;
  if (!isRecord(input)) {
    issues.push(`${path} must be an object`);
    return;
  }
  if (typeof input["id"] !== "string" || !SAFE_ID.test(input["id"])) {
    issues.push(`${path}.id must use lowercase kebab-case`);
  }
  if (typeof input["label"] !== "string" || input["label"].trim().length === 0 || input["label"].length > 120) {
    issues.push(`${path}.label must be 1-120 characters`);
  }
  if (input["required"] !== undefined && typeof input["required"] !== "boolean") {
    issues.push(`${path}.required must be boolean`);
  }

  switch (input["type"]) {
    case "text":
      checkAllowedKeys(input, ["id", "type", "label", "description", "required", "default", "minLength", "maxLength", "trim"], path, issues);
      addCountRangeIssues(issues, path, input["minLength"], input["maxLength"]);
      if (typeof input["maxLength"] === "number" && input["maxLength"] > MAX_STRING_LENGTH) {
        issues.push(`${path}.maxLength cannot exceed ${MAX_STRING_LENGTH}`);
      }
      if (input["default"] !== undefined && typeof input["default"] !== "string") issues.push(`${path}.default must be a string`);
      else if (typeof input["default"] === "string") {
        const normalizedDefault = input["trim"] === true ? input["default"].trim() : input["default"];
        if (typeof input["minLength"] === "number" && normalizedDefault.length < input["minLength"]) issues.push(`${path}.default is shorter than minLength`);
        if (typeof input["maxLength"] === "number" && normalizedDefault.length > input["maxLength"]) issues.push(`${path}.default is longer than maxLength`);
      }
      if (input["trim"] !== undefined && typeof input["trim"] !== "boolean") issues.push(`${path}.trim must be boolean`);
      break;
    case "number":
      checkAllowedKeys(input, ["id", "type", "label", "description", "required", "default", "minimum", "maximum", "integer"], path, issues);
      addNumericRangeIssues(issues, path, input["minimum"], input["maximum"]);
      if (input["default"] !== undefined && (!Number.isFinite(input["default"]))) issues.push(`${path}.default must be a finite number`);
      else if (typeof input["default"] === "number") {
        if (input["integer"] === true && !Number.isInteger(input["default"])) issues.push(`${path}.default must be an integer`);
        if (typeof input["minimum"] === "number" && input["default"] < input["minimum"]) issues.push(`${path}.default is lower than minimum`);
        if (typeof input["maximum"] === "number" && input["default"] > input["maximum"]) issues.push(`${path}.default is higher than maximum`);
      }
      if (input["integer"] !== undefined && typeof input["integer"] !== "boolean") issues.push(`${path}.integer must be boolean`);
      break;
    case "boolean":
      checkAllowedKeys(input, ["id", "type", "label", "description", "required", "default"], path, issues);
      if (input["default"] !== undefined && typeof input["default"] !== "boolean") issues.push(`${path}.default must be boolean`);
      break;
    case "select": {
      checkAllowedKeys(input, ["id", "type", "label", "description", "required", "default", "options"], path, issues);
      const options = input["options"];
      if (!Array.isArray(options) || options.length === 0 || options.length > MAX_OPTIONS) {
        issues.push(`${path}.options must contain 1-${MAX_OPTIONS} options`);
        break;
      }
      const values = new Set<string>();
      for (const [optionIndex, option] of options.entries()) {
        if (!isRecord(option) || typeof option["label"] !== "string" || typeof option["value"] !== "string") {
          issues.push(`${path}.options[${optionIndex}] must contain string label and value`);
          continue;
        }
        checkAllowedKeys(option, ["label", "value"], `${path}.options[${optionIndex}]`, issues);
        if (option["label"].trim().length === 0 || option["label"].length > 120) issues.push(`${path}.options[${optionIndex}].label must be 1-120 characters`);
        if (option["value"].length > 200) issues.push(`${path}.options[${optionIndex}].value cannot exceed 200 characters`);
        if (values.has(option["value"])) issues.push(`${path}.options contains duplicate value ${option["value"]}`);
        values.add(option["value"]);
      }
      if (input["default"] !== undefined && !values.has(String(input["default"]))) {
        issues.push(`${path}.default must match an option value`);
      }
      break;
    }
    default:
      issues.push(`${path}.type is not supported`);
  }
}

export function validateDefinition(value: unknown): readonly string[] {
  const issues: string[] = [];
  if (!isRecord(value)) return ["definition must be a plain object"];

  try {
    if (Buffer.byteLength(JSON.stringify(value), "utf8") > MAX_DEFINITION_BYTES) {
      issues.push(`definition cannot exceed ${MAX_DEFINITION_BYTES} bytes`);
    }
  } catch {
    return ["definition must be JSON serializable"];
  }

  checkAllowedKeys(value, ["contractVersion", "id", "version", "title", "description", "inputs", "output", "runner", "tags"], "definition", issues);

  if (value["contractVersion"] !== CONTRACT_VERSION) issues.push(`contractVersion must be ${CONTRACT_VERSION}`);
  if (typeof value["id"] !== "string" || !SAFE_ID.test(value["id"])) issues.push("id must use lowercase kebab-case");
  if (typeof value["version"] !== "string" || !SAFE_VERSION.test(value["version"])) issues.push("version must be semantic version format");
  if (typeof value["title"] !== "string" || value["title"].trim().length === 0 || value["title"].length > 120) issues.push("title must be 1-120 characters");
  if (value["description"] !== undefined && (typeof value["description"] !== "string" || value["description"].length > 1_000)) issues.push("description must be a string with at most 1000 characters");

  const inputs = value["inputs"];
  if (!Array.isArray(inputs) || inputs.length > MAX_INPUTS) {
    issues.push(`inputs must be an array with at most ${MAX_INPUTS} entries`);
  } else {
    inputs.forEach((input, index) => validateInputDefinition(input, index, issues));
    const ids = inputs.map((input) => isRecord(input) ? input["id"] : undefined).filter((id): id is string => typeof id === "string");
    if (new Set(ids).size !== ids.length) issues.push("input IDs must be unique");
  }

  validateValueSchema(value["output"], "output", 0, issues);
  const runner = value["runner"];
  if (!isRecord(runner) || typeof runner["id"] !== "string" || !SAFE_ID.test(runner["id"])) {
    issues.push("runner.id must use lowercase kebab-case");
  } else checkAllowedKeys(runner, ["id"], "runner", issues);
  const tags = value["tags"];
  if (tags !== undefined && (!Array.isArray(tags) || tags.length > 30 || tags.some((tag) => typeof tag !== "string" || tag.length === 0 || tag.length > 50) || new Set(tags).size !== tags.length)) {
    issues.push("tags must be a unique array of at most 30 strings, each 1-50 characters");
  }
  return issues;
}

export function assertDefinition(value: unknown): asserts value is GeneratorDefinition {
  const issues = validateDefinition(value);
  if (issues.length > 0) throw new GeneratorError("INVALID_DEFINITION", "Generator definition is invalid", issues);
}

function validateInputValue(definition: InputDefinition, value: unknown, path: string, issues: string[]): JsonValue | undefined {
  switch (definition.type) {
    case "text": {
      if (typeof value !== "string") {
        issues.push(`${path} must be a string`);
        return undefined;
      }
      const normalized = definition.trim ? value.trim() : value;
      if (definition.minLength !== undefined && normalized.length < definition.minLength) issues.push(`${path} is shorter than ${definition.minLength}`);
      if (definition.maxLength !== undefined && normalized.length > definition.maxLength) issues.push(`${path} is longer than ${definition.maxLength}`);
      return normalized;
    }
    case "number":
      if (typeof value !== "number" || !Number.isFinite(value)) {
        issues.push(`${path} must be a finite number`);
        return undefined;
      }
      if (definition.integer && !Number.isInteger(value)) issues.push(`${path} must be an integer`);
      if (definition.minimum !== undefined && value < definition.minimum) issues.push(`${path} must be at least ${definition.minimum}`);
      if (definition.maximum !== undefined && value > definition.maximum) issues.push(`${path} must be at most ${definition.maximum}`);
      return value;
    case "boolean":
      if (typeof value !== "boolean") {
        issues.push(`${path} must be boolean`);
        return undefined;
      }
      return value;
    case "select":
      if (typeof value !== "string" || !definition.options.some((option) => option.value === value)) {
        issues.push(`${path} must match an allowed option`);
        return undefined;
      }
      return value;
  }
}

export function normalizeInput(definition: GeneratorDefinition, raw: unknown): Readonly<Record<string, JsonValue>> {
  if (!isRecord(raw)) throw new GeneratorError("INVALID_INPUT", "Generator input must be a plain object");
  const issues: string[] = [];
  const allowed = new Set(definition.inputs.map((input) => input.id));
  for (const key of Object.keys(raw)) {
    if (!hasSafeKey(key)) issues.push(`input contains unsafe key ${JSON.stringify(key)}`);
    else if (!allowed.has(key)) issues.push(`input contains unknown field ${key}`);
  }

  const normalized: Record<string, JsonValue> = Object.create(null) as Record<string, JsonValue>;
  for (const input of definition.inputs) {
    const supplied = Object.hasOwn(raw, input.id);
    const value = supplied ? raw[input.id] : input.default;
    if (value === undefined) {
      if (input.required) issues.push(`input.${input.id} is required`);
      continue;
    }
    const checked = validateInputValue(input, value, `input.${input.id}`, issues);
    if (checked !== undefined) normalized[input.id] = checked;
  }
  if (issues.length > 0) throw new GeneratorError("INVALID_INPUT", "Generator input is invalid", issues);
  return Object.freeze(normalized);
}

function validateOutputValue(schema: ValueSchema, value: unknown, path: string, depth: number, issues: string[]): void {
  if (depth > MAX_SCHEMA_DEPTH) {
    issues.push(`${path} exceeds the maximum output depth`);
    return;
  }
  switch (schema.type) {
    case "string":
      if (typeof value !== "string") issues.push(`${path} must be a string`);
      else {
        if (value.length > MAX_STRING_LENGTH) issues.push(`${path} exceeds the global string limit`);
        if (schema.minLength !== undefined && value.length < schema.minLength) issues.push(`${path} is shorter than ${schema.minLength}`);
        if (schema.maxLength !== undefined && value.length > schema.maxLength) issues.push(`${path} is longer than ${schema.maxLength}`);
        if (schema.enum && !schema.enum.includes(value)) issues.push(`${path} is not an allowed value`);
      }
      break;
    case "number":
      if (typeof value !== "number" || !Number.isFinite(value)) issues.push(`${path} must be a finite number`);
      else {
        if (schema.integer && !Number.isInteger(value)) issues.push(`${path} must be an integer`);
        if (schema.minimum !== undefined && value < schema.minimum) issues.push(`${path} must be at least ${schema.minimum}`);
        if (schema.maximum !== undefined && value > schema.maximum) issues.push(`${path} must be at most ${schema.maximum}`);
      }
      break;
    case "boolean":
      if (typeof value !== "boolean") issues.push(`${path} must be boolean`);
      break;
    case "array":
      if (!Array.isArray(value)) issues.push(`${path} must be an array`);
      else {
        if (value.length > MAX_ARRAY_ITEMS) issues.push(`${path} exceeds the global item limit`);
        if (schema.minItems !== undefined && value.length < schema.minItems) issues.push(`${path} has fewer than ${schema.minItems} items`);
        if (schema.maxItems !== undefined && value.length > schema.maxItems) issues.push(`${path} has more than ${schema.maxItems} items`);
        for (let index = 0; index < value.length; index += 1) {
          validateOutputValue(schema.items, value[index], `${path}[${index}]`, depth + 1, issues);
        }
      }
      break;
    case "object":
      if (!isRecord(value)) issues.push(`${path} must be a plain object`);
      else {
        const required = new Set(schema.required ?? []);
        for (const key of required) if (!Object.hasOwn(value, key)) issues.push(`${path}.${key} is required`);
        for (const [key, child] of Object.entries(value)) {
          if (!hasSafeKey(key)) {
            issues.push(`${path} contains unsafe key ${JSON.stringify(key)}`);
            continue;
          }
          const childSchema = schema.properties[key];
          if (!childSchema) {
            if (schema.additionalProperties !== true) issues.push(`${path}.${key} is not allowed`);
            else validateJsonValue(child, `${path}.${key}`, depth + 1, issues);
            continue;
          }
          validateOutputValue(childSchema, child, `${path}.${key}`, depth + 1, issues);
        }
      }
      break;
  }
}

function validateJsonValue(value: unknown, path: string, depth: number, issues: string[]): void {
  if (depth > MAX_SCHEMA_DEPTH) {
    issues.push(`${path} exceeds the maximum output depth`);
    return;
  }
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    if (typeof value === "string" && value.length > MAX_STRING_LENGTH) issues.push(`${path} exceeds the global string limit`);
    return;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) issues.push(`${path} must be a finite number`);
    return;
  }
  if (Array.isArray(value)) {
    if (value.length > MAX_ARRAY_ITEMS) issues.push(`${path} exceeds the global item limit`);
    for (let index = 0; index < value.length; index += 1) {
      validateJsonValue(value[index], `${path}[${index}]`, depth + 1, issues);
    }
    return;
  }
  if (isRecord(value)) {
    const entries = Object.entries(value);
    if (entries.length > MAX_OBJECT_PROPERTIES) issues.push(`${path} exceeds the global property limit`);
    for (const [key, child] of entries) {
      if (!hasSafeKey(key)) issues.push(`${path} contains unsafe key ${JSON.stringify(key)}`);
      else validateJsonValue(child, `${path}.${key}`, depth + 1, issues);
    }
    return;
  }
  issues.push(`${path} must be JSON-compatible`);
}

export function assertOutput(schema: ValueSchema, value: unknown): asserts value is JsonValue {
  const issues: string[] = [];
  validateOutputValue(schema, value, "output", 0, issues);
  if (issues.length > 0) throw new GeneratorError("INVALID_OUTPUT", "Runner output does not match the contract", issues);
}
