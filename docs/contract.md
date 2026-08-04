# Generator Contract 1.0

The contract is a portable JSON declaration. It describes what a generator accepts, what it must return, and which runner ID should execute it. It does not contain executable code, credentials, prompts, or provider-specific secrets.

```json
{
  "contractVersion": "1.0",
  "id": "project-name-generator",
  "version": "1.0.0",
  "title": "Project name generator",
  "inputs": [
    {
      "id": "style",
      "type": "select",
      "label": "Style",
      "required": true,
      "options": [
        { "label": "Modern", "value": "modern" },
        { "label": "Playful", "value": "playful" }
      ]
    }
  ],
  "output": {
    "type": "array",
    "items": { "type": "string" },
    "minItems": 1,
    "maxItems": 10
  },
  "runner": { "id": "project-names" }
}
```

The canonical machine-readable schema is [`schema/generator-contract.schema.json`](../schema/generator-contract.schema.json). Runtime validation adds cross-field checks that JSON Schema alone does not express in v0.1, including unique input IDs, valid select defaults, ordered minimum/maximum bounds, and required output properties that actually exist.

## Inputs

v0.1 supports `text`, `number`, `boolean`, and `select`. Unknown input keys are rejected. Defaults are applied before a runner is called. Text trimming is opt-in because silent normalization can change user intent.

## Outputs

Output schemas can contain strings, finite numbers, booleans, arrays, and objects. Object outputs reject undeclared properties unless `additionalProperties` is explicitly `true`.

## Runners

`runner.id` is resolved against an application-controlled registry. This is the main trust boundary: loading a contract does not grant network access or execute code. Applications decide which runner IDs exist and where credentials are stored.

## Compatibility

- Contract versions change only when the portable document shape or semantics break.
- Generator versions describe the behavior of an individual generator.
- Additive runtime APIs use package semantic versioning.
- v0.1 targets Contract `1.0`; future runtimes should reject unknown contract versions rather than guessing.
