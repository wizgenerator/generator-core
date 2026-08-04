export const CONTRACT_VERSION = "1.0" as const;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export interface StringValueSchema {
  type: "string";
  minLength?: number;
  maxLength?: number;
  enum?: readonly string[];
}

export interface NumberValueSchema {
  type: "number";
  minimum?: number;
  maximum?: number;
  integer?: boolean;
}

export interface BooleanValueSchema {
  type: "boolean";
}

export interface ArrayValueSchema {
  type: "array";
  items: ValueSchema;
  minItems?: number;
  maxItems?: number;
}

export interface ObjectValueSchema {
  type: "object";
  properties: Readonly<Record<string, ValueSchema>>;
  required?: readonly string[];
  additionalProperties?: boolean;
}

export type ValueSchema =
  | StringValueSchema
  | NumberValueSchema
  | BooleanValueSchema
  | ArrayValueSchema
  | ObjectValueSchema;

interface InputBase {
  id: string;
  label: string;
  description?: string;
  required?: boolean;
}

export interface TextInput extends InputBase {
  type: "text";
  default?: string;
  minLength?: number;
  maxLength?: number;
  trim?: boolean;
}

export interface NumberInput extends InputBase {
  type: "number";
  default?: number;
  minimum?: number;
  maximum?: number;
  integer?: boolean;
}

export interface BooleanInput extends InputBase {
  type: "boolean";
  default?: boolean;
}

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectInput extends InputBase {
  type: "select";
  default?: string;
  options: readonly SelectOption[];
}

export type InputDefinition = TextInput | NumberInput | BooleanInput | SelectInput;

export interface GeneratorDefinition {
  contractVersion: typeof CONTRACT_VERSION;
  id: string;
  version: string;
  title: string;
  description?: string;
  inputs: readonly InputDefinition[];
  output: ValueSchema;
  runner: {
    id: string;
  };
  tags?: readonly string[];
}

export interface RunnerContext {
  definition: GeneratorDefinition;
  input: Readonly<Record<string, JsonValue>>;
  signal?: AbortSignal;
  seed?: string | number;
}

export type GeneratorRunner = (context: RunnerContext) => JsonValue | Promise<JsonValue>;

export interface RunOptions {
  signal?: AbortSignal;
  seed?: string | number;
}

export interface RuntimeOptions {
  runners?: Readonly<Record<string, GeneratorRunner>>;
}

export interface RunResult<T extends JsonValue = JsonValue> {
  generatorId: string;
  generatorVersion: string;
  output: T;
}
