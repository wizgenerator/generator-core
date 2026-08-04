import assert from "node:assert/strict";
import test from "node:test";
import { createSeededRandom } from "../src/index.js";

test("seeded random is reproducible", () => {
  const first = createSeededRandom("wiz");
  const second = createSeededRandom("wiz");
  assert.deepEqual(
    [first.next(), first.next(), first.integer(1, 10)],
    [second.next(), second.next(), second.integer(1, 10)],
  );
});

test("pick and integer reject empty or invalid ranges", () => {
  const random = createSeededRandom(42);
  assert.throws(() => random.pick([]), RangeError);
  assert.throws(() => random.integer(10, 1), RangeError);
});
