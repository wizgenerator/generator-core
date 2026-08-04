# Security policy

## Supported versions

Until a stable 1.0 release, security fixes are applied to the latest minor release only.

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting for this repository. Do not open a public issue containing an exploit, credential, private endpoint, or user data.

Include the affected version, impact, reproduction steps, and any suggested mitigation. We will acknowledge a complete report within five business days and coordinate disclosure after a fix or mitigation is available.

## Scope reminders

WizGenerator Core does not manage credentials or make network requests. Vulnerabilities in a host application's provider runner may still be relevant when the core API makes a safe implementation impossible; explain that boundary in the report.

Never send real API keys or production data as proof.
