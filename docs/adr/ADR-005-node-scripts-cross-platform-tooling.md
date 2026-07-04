# ADR-005: Cross-platform tooling via Node scripts, never shell scripts

**Status:** Accepted
**Date:** 2026-07-05

## Context

CR-002 introduces real deploy/install tooling (`scripts/check-node.mjs`, `scripts/deploy.mjs`) that
operators run directly, not just CI. Operators run **Windows or Mac/Linux** — a normal `.sh` script
doesn't run on Windows without WSL/Git Bash, and a `.ps1`/`.bat` script doesn't run natively on
Mac/Linux. The real alternatives were: (a) maintain parallel shell scripts per OS, (b) require a
POSIX shell everywhere (ruling out native Windows), or (c) write the tooling in Node, since **Node
22.22 is already a mandatory prerequisite** for this project regardless of platform.

## Decision

**All project tooling/scripts are plain Node ESM (`.mjs`), invoked via `npm run <script>` — never
`.sh`, `.ps1`, or `.bat` files.** Where the tooling needs to shell out (spawning the Forge CLI via
`npx`), it does so through Node's `child_process.spawn`, with `shell: true` for the Windows case
where npm-installed binaries are `.cmd`/`.ps1` shims that `spawn` can't resolve directly
(`scripts/lib/forge-cli.mjs`).

This is a carve-out from the general "TypeScript strict everywhere" tech constraint in `CLAUDE.md`:
`scripts/` is plain JavaScript, not TypeScript, so it runs with zero build step (`node
scripts/deploy.mjs` needs nothing compiled first) — appropriate for tooling that must work
identically before `npm run build` has ever succeeded. App runtime code (`src/`) is untouched by
this ADR and remains TypeScript strict as before.

## Consequences

- Single script codebase for both operator platforms — no platform-conditional branches in CI or
  in the README beyond which `nvm` variant to install.
- The Forge CLI itself is always invoked the same way (`npx --package=@forge/cli forge ...`)
  through `runForge`/`runForgeCaptured` in `scripts/lib/forge-cli.mjs`, so there's exactly one place
  that knows how to spawn it safely on both platforms.
- Testable logic (Node-version comparison, deploy-config parsing/validation) lives in pure
  `scripts/lib/*.mjs` modules with no I/O side effects, so it's covered by the same Vitest suite as
  the rest of the project (`vitest.config.ts`'s `include` now covers `scripts/**/*.test.mjs`
  alongside `src/**/*.test.ts`) without needing a shell-script test harness.
- Anyone extending the deploy tooling must keep it in `scripts/*.mjs` — see the new `CLAUDE.md`
  standing order. Relaxing the Node version pin, or introducing a shell script, requires a new ADR.
