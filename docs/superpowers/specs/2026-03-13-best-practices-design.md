# Best Practices Implementation Design

**Date:** 2026-03-13
**Status:** Approved

## Overview

Add the standard quality tooling expected of a well-maintained open-source npm package to excalidraw-cli. The project already has TypeScript (strict), Vitest, and tsup — this fills the remaining gaps.

## Scope

Option B was selected: ESLint + Prettier, Husky + lint-staged, GitHub Actions CI, Vitest coverage, Dependabot, EditorConfig, and npm publish preparation.

---

## Section 1: Linting & Formatting

### ESLint

- Package: `eslint`, `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`
- Config file: `eslint.config.mjs` (flat config format)
- Ruleset: `@typescript-eslint` recommended strict preset
- Ignores: `dist/`, `node_modules/`

### Prettier

- Package: `prettier`, `eslint-config-prettier` (disables ESLint rules that conflict with Prettier)
- Config file: `.prettierrc` — single quotes, no semicolons, 100-char line width
- Ignores: `.prettierignore` — excludes `dist/`, `node_modules/`

### New scripts in `package.json`

```json
"lint": "eslint src tests",
"format": "prettier --write src tests"
```

---

## Section 2: Pre-commit Hooks

### Husky

- Package: `husky`
- Initialized via `"prepare": "husky"` script (runs after `npm install`)
- Creates `.husky/pre-commit` hook

### lint-staged

- Package: `lint-staged`
- Config in `package.json` under `"lint-staged"` key
- Runs on staged `.ts` files only:
  1. `eslint --fix` — auto-fixes; blocks commit if unfixable errors remain
  2. `prettier --write` — formats in place

```json
"lint-staged": {
  "*.ts": ["eslint --fix", "prettier --write"]
}
```

---

## Section 3: GitHub Actions CI

- File: `.github/workflows/ci.yml`
- Triggers: push to `main`, all pull requests
- Node version: 18 (matches tsup target)
- Single job, steps in order:
  1. Checkout
  2. Setup Node 18
  3. `npm ci`
  4. `npm run lint`
  5. `npm run test:coverage`
  6. `npm run build`
- Coverage lcov output uploaded as workflow artifact

---

## Section 4: Test Coverage

- Package: `@vitest/coverage-v8`
- New script: `"test:coverage": "vitest run --coverage"`
- Config added to `vitest.config.ts`:

```ts
coverage: {
  provider: 'v8',
  reporter: ['text', 'lcov'],
  include: ['src/**/*.ts'],
  exclude: ['src/dom-shim.ts'],
}
```

- `src/dom-shim.ts` excluded — browser shim code not meaningfully unit-testable
- No enforced threshold — avoids coverage-gaming, project is small enough to inspect visually

---

## Section 5: Dependabot

- File: `.github/dependabot.yml`
- Ecosystem: `npm`
- Cadence: weekly
- Target branch: `main`
- CI runs automatically on Dependabot PRs

---

## Section 6: EditorConfig

- File: `.editorconfig` at project root
- Settings: UTF-8, LF line endings, 2-space indent, trim trailing whitespace, insert final newline
- Ensures consistent behavior across editors and contributors

---

## Section 7: npm Publish Preparation

Changes to `package.json`:

- `"files": ["dist"]` — only compiled output published, not source/tests/docs
- `"prepublishOnly": "npm run build && npm test"` — build + tests must pass before publish
- `"engines": { "node": ">=18" }` — documents Node requirement for consumers

---

## Files Added/Modified

| File | Change |
|------|--------|
| `eslint.config.mjs` | New — ESLint flat config |
| `.prettierrc` | New — Prettier config |
| `.prettierignore` | New |
| `.editorconfig` | New |
| `.github/workflows/ci.yml` | New — CI pipeline |
| `.github/dependabot.yml` | New — dependency automation |
| `.husky/pre-commit` | New — pre-commit hook |
| `vitest.config.ts` | Modified — add coverage config |
| `package.json` | Modified — new scripts, lint-staged, files, engines, prepublishOnly |

## New Dev Dependencies

| Package | Purpose |
|---------|---------|
| `eslint` | Linter |
| `@typescript-eslint/eslint-plugin` | TypeScript lint rules |
| `@typescript-eslint/parser` | TypeScript ESLint parser |
| `eslint-config-prettier` | Disable ESLint rules conflicting with Prettier |
| `prettier` | Formatter |
| `husky` | Git hooks |
| `lint-staged` | Run linters on staged files |
| `@vitest/coverage-v8` | V8 coverage provider for Vitest |
