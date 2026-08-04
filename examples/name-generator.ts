import {
  CONTRACT_VERSION,
  createRuntime,
  createSeededRandom,
  type GeneratorDefinition,
  type GeneratorRunner,
} from "../src/index.js";

export const nameGenerator: GeneratorDefinition = {
  contractVersion: CONTRACT_VERSION,
  id: "name-generator",
  version: "1.0.0",
  title: "Project name generator",
  description: "Combines curated word sets with deterministic seeded randomness.",
  inputs: [
    {
      id: "style",
      type: "select",
      label: "Style",
      required: true,
      default: "modern",
      options: [
        { label: "Modern", value: "modern" },
        { label: "Playful", value: "playful" },
      ],
    },
    {
      id: "count",
      type: "number",
      label: "Number of names",
      default: 5,
      minimum: 1,
      maximum: 10,
      integer: true,
    },
  ],
  output: {
    type: "array",
    items: { type: "string", minLength: 3, maxLength: 40 },
    minItems: 1,
    maxItems: 10,
  },
  runner: { id: "project-names" },
  tags: ["names", "deterministic"],
};

const words = {
  modern: {
    first: ["Atlas", "Nova", "Prism", "Signal", "Vertex"],
    second: ["Flow", "Forge", "Grid", "Stack", "Works"],
  },
  playful: {
    first: ["Bumble", "Doodle", "Jolly", "Mango", "Pixel"],
    second: ["Berry", "Nest", "Pop", "Spark", "Whiz"],
  },
} as const;

export const projectNameRunner: GeneratorRunner = ({ input, seed = "wizgenerator" }) => {
  const style = input["style"] as keyof typeof words;
  const count = input["count"] as number;
  const random = createSeededRandom(seed);
  const selected = words[style];
  const results = new Set<string>();

  while (results.size < count) {
    results.add(`${random.pick(selected.first)}${random.pick(selected.second)}`);
  }
  return [...results];
};

async function main(): Promise<void> {
  const runtime = createRuntime({ runners: { "project-names": projectNameRunner } });
  const result = await runtime.run(nameGenerator, { style: "modern", count: 5 }, { seed: "launch-2026" });
  console.log("Name generator:", result.output);
}

if (import.meta.url === new URL(process.argv[1] ?? "", "file:").href) await main();
