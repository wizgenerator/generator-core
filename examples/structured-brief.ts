import {
  CONTRACT_VERSION,
  createRuntime,
  type GeneratorDefinition,
  type GeneratorRunner,
} from "../src/index.js";

export const structuredBriefGenerator: GeneratorDefinition = {
  contractVersion: CONTRACT_VERSION,
  id: "structured-brief",
  version: "1.0.0",
  title: "Structured project brief",
  inputs: [
    { id: "topic", type: "text", label: "Topic", required: true, minLength: 3, maxLength: 120, trim: true },
    { id: "audience", type: "text", label: "Audience", required: true, minLength: 3, maxLength: 120, trim: true },
    { id: "include-risks", type: "boolean", label: "Include risks", default: true },
  ],
  output: {
    type: "object",
    properties: {
      title: { type: "string", minLength: 3, maxLength: 160 },
      audience: { type: "string", minLength: 3, maxLength: 120 },
      sections: {
        type: "array",
        minItems: 2,
        maxItems: 6,
        items: { type: "string", minLength: 3, maxLength: 240 },
      },
      ready: { type: "boolean" },
    },
    required: ["title", "audience", "sections", "ready"],
    additionalProperties: false,
  },
  runner: { id: "brief-template" },
  tags: ["structured-output", "brief"],
};

export const briefRunner: GeneratorRunner = ({ input }) => {
  const topic = input["topic"] as string;
  const audience = input["audience"] as string;
  const sections = [
    `Define the outcome for ${topic}.`,
    `List the evidence required by ${audience}.`,
  ];
  if (input["include-risks"] === true) sections.push("Record constraints, risks, and rollback conditions.");
  return { title: `${topic} brief`, audience, sections, ready: true };
};

async function main(): Promise<void> {
  const runtime = createRuntime({ runners: { "brief-template": briefRunner } });
  const result = await runtime.run(structuredBriefGenerator, {
    topic: "Open-source launch",
    audience: "JavaScript maintainers",
    "include-risks": true,
  });
  console.log("Structured brief:", result.output);
}

if (import.meta.url === new URL(process.argv[1] ?? "", "file:").href) await main();
