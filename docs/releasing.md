# Release process

Releases are deliberate because a public Git and npm history cannot be silently rewritten.

## Before tagging

1. Update `CHANGELOG.md`, `package.json`, and `CITATION.cff` to the same version.
2. Run `npm ci`, `npm run check`, `npm run examples`, and `npm audit --audit-level=high`.
3. Inspect `npm pack --dry-run --json`; only intended files may ship.
4. Scan the complete staged tree for credentials, private prompts, user data, and production endpoints.
5. Install the packed tarball in a clean temporary project and import every public export used by the README.
6. Review `git diff --cached` and create a signed or verified release commit when available.

## GitHub release

Tag `v<package version>` from `main` and create a GitHub release using the matching changelog section. Do not call a release complete until CI passes on the tag and the public repository, tag, source archive, license, and security policy are readable without authentication.

## npm publication

The package is scoped and must remain public. Prefer npm trusted publishing from a protected GitHub environment with provenance. Until that relationship is configured, publish only from an authenticated maintainer session after the tarball review:

```bash
npm publish --access public
```

Verify the public registry metadata and install the exact version into a clean project. A successful command alone is not publication proof.

## After release

- Enable private vulnerability reporting and branch protection on `main`.
- Confirm Dependabot and CI permissions are read-only except where a later release workflow explicitly needs an npm identity token.
- Open a versioned milestone for only the next proven integration needs.
- Review installs, dependents, external implementations, issue quality, contributor activity, and qualified citations after 30 and 90 days. Stars are a secondary awareness signal.
