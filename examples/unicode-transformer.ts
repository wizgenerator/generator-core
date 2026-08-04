import {
  CONTRACT_VERSION,
  createRuntime,
  type GeneratorDefinition,
  type GeneratorRunner,
} from "../src/index.js";

export const unicodeTransformer: GeneratorDefinition = {
  contractVersion: CONTRACT_VERSION,
  id: "unicode-transformer",
  version: "1.0.0",
  title: "Unicode text transformer",
  inputs: [
    { id: "text", type: "text", label: "Text", required: true, maxLength: 500 },
    {
      id: "mode",
      type: "select",
      label: "Mode",
      default: "bold",
      options: [
        { label: "Bold", value: "bold" },
        { label: "Strikethrough", value: "strikethrough" },
      ],
    },
  ],
  output: { type: "string", maxLength: 1_000 },
  runner: { id: "unicode-text" },
  tags: ["unicode", "local"],
};

function toMathematicalBold(text: string): string {
  return [...text].map((character) => {
    const code = character.codePointAt(0) as number;
    if (code >= 65 && code <= 90) return String.fromCodePoint(0x1d400 + code - 65);
    if (code >= 97 && code <= 122) return String.fromCodePoint(0x1d41a + code - 97);
    if (code >= 48 && code <= 57) return String.fromCodePoint(0x1d7ce + code - 48);
    return character;
  }).join("");
}

export const unicodeRunner: GeneratorRunner = ({ input }) => {
  const text = input["text"] as string;
  return input["mode"] === "strikethrough"
    ? [...text].map((character) => character === " " ? character : `${character}\u0336`).join("")
    : toMathematicalBold(text);
};

async function main(): Promise<void> {
  const runtime = createRuntime({ runners: { "unicode-text": unicodeRunner } });
  const result = await runtime.run(unicodeTransformer, { text: "Build once", mode: "bold" });
  console.log("Unicode transformer:", result.output);
}

if (import.meta.url === new URL(process.argv[1] ?? "", "file:").href) await main();
