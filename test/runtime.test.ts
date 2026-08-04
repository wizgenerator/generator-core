import assert from "node:assert/strict";
import test from "node:test";
import { briefRunner, structuredBriefGenerator } from "../examples/structured-brief.js";
import { nameGenerator, projectNameRunner } from "../examples/name-generator.js";
import {
  CONTRACT_VERSION,
  GeneratorError,
  createRuntime,
  validateDefinition,
  type GeneratorDefinition,
} from "../src/index.js";

test("runs a deterministic generator and validates its result", async () => {
  const runtime = createRuntime({ runners: { "project-names": projectNameRunner } });
  const first = await runtime.run<string[]>(nameGenerator, { style: "modern", count: 5 }, { seed: "same" });
  const second = await runtime.run<string[]>(nameGenerator, { style: "modern", count: 5 }, { seed: "same" });
  assert.deepEqual(first, second);
  assert.equal(first.output.length, 5);
  assert.equal(new Set(first.output).size, 5);
});

test("normalizes defaults and trimmed input", async () => {
  const runtime = createRuntime({ runners: { "brief-template": briefRunner } });
  const result = await runtime.run(structuredBriefGenerator, {
    topic: "  Launch plan  ",
    audience: "  maintainers  ",
  });
  assert.deepEqual(result.output, {
    title: "Launch plan brief",
    audience: "maintainers",
    sections: [
      "Define the outcome for Launch plan.",
      "List the evidence required by maintainers.",
      "Record constraints, risks, and rollback conditions.",
    ],
    ready: true,
  });
});

test("rejects unknown and invalid inputs before calling a runner", async () => {
  let called = false;
  const runtime = createRuntime({ runners: { "project-names": () => { called = true; return []; } } });
  await assert.rejects(
    runtime.run(nameGenerator, { style: "unknown", count: 0, surprise: true }),
    (error: unknown) => error instanceof GeneratorError && error.code === "INVALID_INPUT" && error.issues.length === 3,
  );
  assert.equal(called, false);
});

test("rejects unregistered runners", async () => {
  const runtime = createRuntime();
  await assert.rejects(
    runtime.run(nameGenerator, { style: "modern", count: 2 }),
    (error: unknown) => error instanceof GeneratorError && error.code === "RUNNER_NOT_FOUND",
  );
});

test("rejects runner output that violates the contract", async () => {
  const runtime = createRuntime({ runners: { "project-names": () => ["ok", 42] } });
  await assert.rejects(
    runtime.run(nameGenerator, { style: "modern", count: 2 }),
    (error: unknown) => error instanceof GeneratorError && error.code === "INVALID_OUTPUT",
  );
});

test("rejects additional object output fields by default", async () => {
  const runtime = createRuntime({
    runners: {
      "brief-template": () => ({ title: "A title", audience: "people", sections: ["One", "Two"], ready: true, secret: "no" }),
    },
  });
  await assert.rejects(
    runtime.run(structuredBriefGenerator, { topic: "A topic", audience: "people" }),
    (error: unknown) => error instanceof GeneratorError && error.issues.includes("output.secret is not allowed"),
  );
});

test("fails closed for unsafe input keys", async () => {
  const unsafe = JSON.parse('{"style":"modern","count":2,"__proto__":{"polluted":true}}') as unknown;
  const runtime = createRuntime({ runners: { "project-names": projectNameRunner } });
  await assert.rejects(
    runtime.run(nameGenerator, unsafe),
    (error: unknown) => error instanceof GeneratorError && error.code === "INVALID_INPUT",
  );
  assert.equal(({} as { polluted?: boolean }).polluted, undefined);
});

test("honors an already-aborted signal", async () => {
  const controller = new AbortController();
  controller.abort();
  const runtime = createRuntime({ runners: { "project-names": projectNameRunner } });
  await assert.rejects(
    runtime.run(nameGenerator, { style: "modern", count: 2 }, { signal: controller.signal }),
    (error: unknown) => error instanceof GeneratorError && error.code === "RUN_ABORTED",
  );
});

test("reports malformed definitions without executing them", () => {
  const badDefinition: GeneratorDefinition = {
    ...nameGenerator,
    contractVersion: CONTRACT_VERSION,
    id: "Not Safe",
    inputs: [...nameGenerator.inputs, nameGenerator.inputs[0] as GeneratorDefinition["inputs"][number]],
  };
  const issues = validateDefinition(badDefinition);
  assert.ok(issues.some((issue) => issue.includes("lowercase kebab-case")));
  assert.ok(issues.includes("input IDs must be unique"));
});

test("allows negative numeric ranges", async () => {
  const definition: GeneratorDefinition = {
    contractVersion: CONTRACT_VERSION,
    id: "temperature-normalizer",
    version: "1.0.0",
    title: "Temperature normalizer",
    inputs: [{ id: "temperature", type: "number", label: "Temperature", minimum: -100, maximum: 100 }],
    output: { type: "number", minimum: -1, maximum: 1 },
    runner: { id: "normalize-temperature" },
  };
  const runtime = createRuntime({
    runners: { "normalize-temperature": ({ input }) => (input["temperature"] as number) / 100 },
  });
  assert.deepEqual(validateDefinition(definition), []);
  assert.equal((await runtime.run<number>(definition, { temperature: -25 })).output, -0.25);
});

test("additional output properties must still be JSON-compatible", async () => {
  const definition: GeneratorDefinition = {
    ...structuredBriefGenerator,
    output: { type: "object", properties: {}, additionalProperties: true },
  };
  const runtime = createRuntime({ runners: { "brief-template": () => ({ callback: () => "unsafe" }) as never } });
  await assert.rejects(
    runtime.run(definition, { topic: "A topic", audience: "people" }),
    (error: unknown) => error instanceof GeneratorError && error.code === "INVALID_OUTPUT",
  );
});
