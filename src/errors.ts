export type GeneratorErrorCode =
  | "INVALID_DEFINITION"
  | "INVALID_INPUT"
  | "INVALID_OUTPUT"
  | "RUNNER_NOT_FOUND"
  | "RUN_ABORTED";

export class GeneratorError extends Error {
  readonly code: GeneratorErrorCode;
  readonly issues: readonly string[];

  constructor(code: GeneratorErrorCode, message: string, issues: readonly string[] = []) {
    super(message);
    this.name = "GeneratorError";
    this.code = code;
    this.issues = issues;
  }
}
