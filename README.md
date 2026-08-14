# WizGenerator Core

Built by [WizGenerator](https://wizgenerator.com) — https://wizgenerator.com

[![CI](https://github.com/wizgenerator/generator-core/actions/workflows/ci.yml/badge.svg)](https://github.com/wizgenerator/generator-core/actions/workflows/ci.yml)
[![Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Zero runtime dependencies](https://img.shields.io/badge/runtime%20dependencies-0-brightgreen.svg)](package.json)

A provider-neutral TypeScript runtime and portable JSON contract for building reliable generators.

Use one contract model for deterministic utilities, structured text tools, and provider-backed generators. Keep algorithms and providers replaceable; validate inputs and outputs at the runtime boundary.

> v0.1 is intentionally small and marked experimental. It supports local or application-injected runners for text and structured data. Image artifacts and provider adapters are roadmap items, not implied features.

## Why this exists

Generator projects often repeat the same work: field parsing, default handling, provider coupling, response validation, and inconsistent result shapes. WizGenerator Core separates those concerns:

```text
portable contract -> validated input -> registered runner -> validated output
```

- **Portable:** generator definitions are JSON, not framework components.
- **Provider-neutral:** contracts reference a runner ID, not an AI vendor.
- **Fail-closed:** malformed definitions, inputs, and outputs are rejected.
- **Deterministic when needed:** seeded randomness is built in.
- **Host-controlled:** contracts cannot fetch URLs, read secrets, or execute code.
- **Small:** zero runtime dependencies and no UI framework.

## Try it locally

```bash
git clone https://github.com/wizgenerator/generator-core.git
cd generator-core
npm install
npm test
npm run examples
```

The `@wizgenerator/core` npm package is prepared but not published yet. The registry install command and npm badge will be added only after the public package is verified.

Node.js 20 or newer is required. The package is ESM.

## Library API

```ts
import {
  CONTRACT_VERSION,
  createRuntime,
  createSeededRandom,
  type GeneratorDefinition,
} from "@wizgenerator/core";

const definition: GeneratorDefinition = {
  contractVersion: CONTRACT_VERSION,
  id: "color-pair-generator",
  version: "1.0.0",
  title: "Color pair generator",
  inputs: [
    {
      id: "count",
      type: "number",
      label: "Count",
      default: 2,
      minimum: 1,
      maximum: 4,
      integer: true,
    },
  ],
  output: {
    type: "array",
    items: { type: "string" },
    minItems: 1,
    maxItems: 4,
  },
  runner: { id: "color-pairs" },
};

const runtime = createRuntime({
  runners: {
    "color-pairs": ({ input, seed = "demo" }) => {
      const random = createSeededRandom(seed);
      const colors = ["amber", "indigo", "mint", "slate"];
      return Array.from(
        { length: input.count as number },
        () => random.pick(colors),
      );
    },
  },
});

const result = await runtime.run(definition, { count: 2 }, { seed: "project-42" });
console.log(result.output);
```

## Three reference generators

The repository includes three deliberately different examples:

- [`name-generator.ts`](examples/name-generator.ts): deterministic composition with seeded randomness;
- [`unicode-transformer.ts`](examples/unicode-transformer.ts): a pure local text transformation;
- [`structured-brief.ts`](examples/structured-brief.ts): nested object output with strict schema validation.

Run all three:

```bash
npm run examples
```

These are reference implementations, not the boundary of the project. Name generation is the first proof, while the core remains reusable across generator categories.

## Contract and trust boundary

Contracts describe inputs, outputs, metadata, and a `runner.id`. A host application registers the actual runner:

```ts
const runtime = createRuntime({
  runners: {
    "my-provider": async ({ input, signal }) => {
      // Your server-side provider call. Keep credentials outside the contract.
      return callProvider(input, signal);
    },
  },
});
```

Loading a contract never grants network access. Do not dynamically import code from `runner.id`; use an explicit registry.

Read the [Contract 1.0 guide](docs/contract.md), the [JSON Schema](schema/generator-contract.schema.json), and the [security model](docs/security-model.md).

## API

- `createRuntime({ runners })`: creates an isolated runner registry.
- `runtime.register(id, runner)`: registers or replaces a runner.
- `runtime.run(definition, input, options)`: validates, runs, and validates again.
- `validateDefinition(value)`: returns all observed definition issues.
- `assertDefinition(value)`: throws a typed `GeneratorError` for an invalid definition.
- `normalizeInput(definition, input)`: validates defaults, types, bounds, and unknown keys.
- `assertOutput(schema, value)`: validates nested runner output.
- `createSeededRandom(seed)`: provides reproducible `next`, `integer`, and `pick` operations.

Errors expose a stable `code` and an `issues` array. Current codes are `INVALID_DEFINITION`, `INVALID_INPUT`, `INVALID_OUTPUT`, `RUNNER_NOT_FOUND`, and `RUN_ABORTED`.

## What v0.1 does not do

- no built-in provider or model selection;
- no secret or environment-variable management;
- no arbitrary HTTP execution from contracts;
- no prompt storage or interpolation;
- no UI renderer;
- no claim that JSON Schema validation replaces the runtime's cross-field checks.

Those are application or future adapter concerns. The narrow boundary keeps contracts portable and reviewable.

## Roadmap

Roadmap decisions will follow working integrations rather than feature count:

1. framework-neutral form renderer or Web Component;
2. explicitly allowlisted HTTP runner adapter with timeout and cancellation rules;
3. artifact contracts for image/file outputs;
4. a PHP adapter proven against the same fixtures;
5. community contract registry only after signing and moderation rules exist.

## Contributing

Issues and focused pull requests are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md) and review [SECURITY.md](SECURITY.md) before reporting a vulnerability.

The project is maintained by [WizGenerator](https://wizgenerator.com/). Attribution is appreciated but never required beyond the Apache-2.0 license; integrations must not force followed links or hidden promotional anchors.

## License

Apache-2.0. See [LICENSE](LICENSE).
