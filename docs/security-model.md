# Security model

WizGenerator Core validates data at three boundaries:

1. the generator definition before execution;
2. user input before it reaches a runner;
3. runner output before it reaches the caller.

The runtime rejects unknown inputs, unsafe object keys, non-finite numbers, oversized declarations, excessive array/object shapes, unsupported contract versions, and outputs that do not match their declared schema.

The package intentionally does not fetch remote URLs, read environment variables, interpolate prompts, or manage provider keys. A host application may implement those behaviors in a runner, but it must separately enforce authentication, host allowlists, rate limits, timeouts, cost limits, moderation, logging redaction, and cancellation.

Contracts should be treated as untrusted data. Do not dynamically import code based on `runner.id`; resolve it only against an explicit registry controlled by the host application.

See [SECURITY.md](../SECURITY.md) for vulnerability reporting.
