import { GeneratorError } from "./errors.js";
import type {
  GeneratorDefinition,
  GeneratorRunner,
  JsonValue,
  RunOptions,
  RunResult,
  RuntimeOptions,
} from "./types.js";
import { assertDefinition, assertOutput, normalizeInput } from "./validation.js";

export interface GeneratorRuntime {
  register(id: string, runner: GeneratorRunner): void;
  run<T extends JsonValue = JsonValue>(
    definition: GeneratorDefinition,
    input: unknown,
    options?: RunOptions,
  ): Promise<RunResult<T>>;
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw new GeneratorError("RUN_ABORTED", "Generator run was aborted");
}

export function createRuntime(options: RuntimeOptions = {}): GeneratorRuntime {
  const runners = new Map<string, GeneratorRunner>();
  const runtime: GeneratorRuntime = {
    register(id, runner) {
      if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(id)) {
        throw new TypeError("Runner ID must use lowercase kebab-case");
      }
      if (typeof runner !== "function") throw new TypeError("Runner must be a function");
      runners.set(id, runner);
    },

    async run<T extends JsonValue = JsonValue>(definition: GeneratorDefinition, input: unknown, runOptions: RunOptions = {}) {
      assertDefinition(definition);
      throwIfAborted(runOptions.signal);
      const normalized = normalizeInput(definition, input);
      const runner = runners.get(definition.runner.id);
      if (!runner) {
        throw new GeneratorError(
          "RUNNER_NOT_FOUND",
          `Runner ${JSON.stringify(definition.runner.id)} is not registered`,
        );
      }

      const output = await runner({
        definition,
        input: normalized,
        ...(runOptions.signal ? { signal: runOptions.signal } : {}),
        ...(runOptions.seed !== undefined ? { seed: runOptions.seed } : {}),
      });
      throwIfAborted(runOptions.signal);
      assertOutput(definition.output, output);

      return {
        generatorId: definition.id,
        generatorVersion: definition.version,
        output: output as T,
      };
    },
  };
  for (const [id, runner] of Object.entries(options.runners ?? {})) runtime.register(id, runner);
  return runtime;
}
