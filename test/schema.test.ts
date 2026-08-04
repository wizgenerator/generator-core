import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import type { ErrorObject } from "ajv";
import { Ajv2020 } from "ajv/dist/2020.js";
import { nameGenerator } from "../examples/name-generator.js";
import { structuredBriefGenerator } from "../examples/structured-brief.js";
import { unicodeTransformer } from "../examples/unicode-transformer.js";

const schema = JSON.parse(
  await readFile(new URL("../../schema/generator-contract.schema.json", import.meta.url), "utf8"),
) as object;
const validate = new Ajv2020({ allErrors: true, strict: true }).compile(schema);

test("the published JSON Schema accepts every reference contract", () => {
  for (const definition of [nameGenerator, unicodeTransformer, structuredBriefGenerator]) {
    assert.equal(validate(definition), true, JSON.stringify(validate.errors));
  }
});

test("the published JSON Schema rejects undeclared contract fields", () => {
  assert.equal(validate({ ...nameGenerator, unexpectedMetadata: "must-not-exist" }), false);
  assert.ok(validate.errors?.some((error: ErrorObject) => error.keyword === "additionalProperties"));
});
