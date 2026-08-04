# Contributing

Thank you for helping make generator infrastructure easier to reuse.

## Before opening a change

- Search existing issues and keep one concern per issue or pull request.
- For a new capability, include a concrete generator that needs it.
- Do not add provider SDKs, UI frameworks, telemetry, or network behavior to the core package without a design discussion.
- Never include API keys, production prompts, user data, or private endpoints in fixtures or examples.

## Development

```bash
npm install
npm run check
npm run examples
npm pack --dry-run
```

Node.js 20 or newer is required. Tests use Node's built-in test runner. Runtime dependencies should remain at zero unless a proposal demonstrates a security or correctness requirement that the platform cannot meet.

## Pull requests

A pull request should include:

- the user problem and the smallest contract/API change that solves it;
- tests for success and failure boundaries;
- documentation and changelog updates for user-visible behavior;
- compatibility notes if a contract or exported type changes.

Maintainers may decline generalized abstractions without a working use case. Security, data-loss prevention, input validation, accessibility in future UI work, and backward compatibility are not optional simplification targets.

By contributing, you agree that your contribution is licensed under Apache-2.0.
