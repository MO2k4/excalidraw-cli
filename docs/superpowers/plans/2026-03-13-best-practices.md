# Best Practices Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add ESLint, Prettier, Husky, lint-staged, GitHub Actions CI, Vitest coverage, Dependabot, EditorConfig, and npm publish preparation to make excalidraw-cli a well-maintained open-source npm package.

**Architecture:** Each tool is independent configuration — no source code architecture changes. ESLint + Prettier enforce code style; Husky + lint-staged gate commits; GitHub Actions runs lint + test + build on every push/PR; Vitest coverage tracks test health; Dependabot automates dependency updates.

**Tech Stack:** ESLint 9 (flat config) + typescript-eslint + eslint-config-prettier, Prettier 3, Husky 9, lint-staged, @vitest/coverage-v8, GitHub Actions

**Design spec:** `docs/superpowers/specs/2026-03-13-best-practices-design.md`

---

## Chunk 1: Linting & Formatting

### Task 1: Install ESLint and Prettier

**Files:**
- Modify: `package.json` (devDependencies, scripts)
- Create: `eslint.config.mjs`
- Create: `.prettierrc`
- Create: `.prettierignore`

**Note on packages:** The spec lists `@typescript-eslint/eslint-plugin` + `@typescript-eslint/parser` (ESLint 8 style). This project uses ESLint 9 with flat config, which uses the unified `typescript-eslint` package instead — these are the same organization's packages, now shipped as one. The `typescript-eslint` package is the correct choice for ESLint 9.

- [ ] **Step 1: Install all linting and formatting packages in one command**

```bash
npm install --save-dev eslint typescript-eslint eslint-config-prettier prettier
```

Expected: all four packages appear in `package.json` devDependencies.

- [ ] **Step 2: Create `eslint.config.mjs`**

The strict preset is used per spec. `no-explicit-any` is downgraded from error to warning because `exporter.ts` uses intentional `any` casts for Excalidraw library interop (the library's types are not cleanly consumable).

```js
import tseslint from 'typescript-eslint'
import prettierConfig from 'eslint-config-prettier'

export default tseslint.config(
  ...tseslint.configs.strict,
  prettierConfig,
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  }
)
```

- [ ] **Step 3: Create `.prettierrc`**

```json
{
  "singleQuote": true,
  "semi": false,
  "printWidth": 100
}
```

- [ ] **Step 4: Create `.prettierignore`**

```
dist/
node_modules/
```

- [ ] **Step 5: Add lint and format scripts to `package.json`**

The `"scripts"` block should look like this after adding the two new entries:

```json
"scripts": {
  "build": "tsup",
  "dev": "tsx src/index.ts",
  "test": "vitest run",
  "test:watch": "vitest",
  "lint": "eslint src tests",
  "format": "prettier --write src tests"
}
```

- [ ] **Step 6: Run lint — expect warnings only, no errors**

```bash
npm run lint
```

Expected: ESLint reports `@typescript-eslint/no-explicit-any` warnings for the `as any` casts in `src/exporter.ts`. These are expected and acceptable. If any **errors** (not warnings) appear, fix them before continuing.

- [ ] **Step 7: Run Prettier to format all source files**

```bash
npm run format
```

- [ ] **Step 8: Run tests to confirm nothing broke**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 9: Commit**

```bash
git add eslint.config.mjs .prettierrc .prettierignore package.json package-lock.json src/ tests/
git commit -m "chore: add ESLint and Prettier"
```

---

### Task 2: Husky + lint-staged

**Files:**
- Modify: `package.json` (prepare script, lint-staged config)
- Create: `.husky/pre-commit` (created by husky init, then updated)

- [ ] **Step 1: Install Husky and lint-staged**

```bash
npm install --save-dev husky lint-staged
```

- [ ] **Step 2: Initialize Husky**

```bash
npx husky init
```

This creates `.husky/pre-commit` with a default `npm test` line and adds `"prepare": "husky"` to `package.json` scripts automatically.

- [ ] **Step 3: Update `.husky/pre-commit` to run lint-staged**

Replace the entire file contents with (shebang line is required for the hook to execute):

```bash
#!/usr/bin/env sh
npx lint-staged
```

- [ ] **Step 4: Add lint-staged config to `package.json`**

Add a top-level `"lint-staged"` key alongside `"scripts"`, `"dependencies"`, etc.:

```json
"lint-staged": {
  "*.ts": ["eslint --fix", "prettier --write"]
}
```

- [ ] **Step 5: Test the pre-commit hook manually**

Stage a `.ts` file and run lint-staged directly to verify the hook works:

```bash
git add src/index.ts
npx lint-staged
```

Expected: lint-staged runs ESLint then Prettier on the staged file, exits 0, no errors.

- [ ] **Step 6: Commit**

```bash
git add .husky/pre-commit package.json package-lock.json
git commit -m "chore: add Husky pre-commit hook with lint-staged"
```

---

## Chunk 2: Coverage & CI

### Task 3: Vitest Coverage

**Files:**
- Modify: `vitest.config.ts`
- Modify: `package.json` (new script)

- [ ] **Step 1: Install coverage provider**

```bash
npm install --save-dev @vitest/coverage-v8
```

- [ ] **Step 2: Add `test:coverage` script to `package.json`**

Add to `"scripts"`:

```json
"test:coverage": "vitest run --coverage"
```

- [ ] **Step 3: Update `vitest.config.ts` to configure coverage**

Replace the file with:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/dom-shim.ts'],
    },
  },
})
```

`src/dom-shim.ts` is excluded because it contains browser API stubs that are not meaningfully unit-testable.

- [ ] **Step 4: Run coverage and confirm it works**

```bash
npm run test:coverage
```

Expected: tests pass, a coverage summary table is printed to the terminal, and a `coverage/lcov.info` file is generated.

- [ ] **Step 5: Add `coverage/` to `.gitignore`**

Append to `.gitignore`:

```
coverage/
```

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts package.json package-lock.json .gitignore
git commit -m "chore: add Vitest coverage with v8 provider"
```

---

### Task 4: GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create the `.github/workflows/` directory**

```bash
mkdir -p .github/workflows
```

- [ ] **Step 2: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Test with coverage
        run: npm run test:coverage

      - name: Build
        run: npm run build

      - name: Upload coverage
        uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: coverage/lcov.info
          if-no-files-found: warn
```

- [ ] **Step 3: Commit and push**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions CI pipeline"
git push
```

- [ ] **Step 4: Verify CI passes on GitHub**

Go to the repository on GitHub → Actions tab. Confirm the CI workflow runs and all steps pass (Install → Lint → Test → Build → Upload coverage).

---

## Chunk 3: Dependabot, EditorConfig & npm Prep

### Task 5: Dependabot

**Files:**
- Create: `.github/dependabot.yml`

- [ ] **Step 1: Create `.github/dependabot.yml`**

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    target-branch: "main"
```

- [ ] **Step 2: Commit**

```bash
git add .github/dependabot.yml
git commit -m "chore: add Dependabot for weekly npm updates"
```

---

### Task 6: EditorConfig

**Files:**
- Create: `.editorconfig`

- [ ] **Step 1: Create `.editorconfig`**

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
trim_trailing_whitespace = true
insert_final_newline = true
```

- [ ] **Step 2: Commit**

```bash
git add .editorconfig
git commit -m "chore: add EditorConfig"
```

---

### Task 7: npm Publish Preparation

**Files:**
- Modify: `package.json` (files, engines, prepublishOnly)

- [ ] **Step 1: Update `package.json` with publish fields**

The complete updated `package.json` should look like this:

```json
{
  "name": "excalidraw-cli",
  "version": "0.1.0",
  "description": "Export Excalidraw files to PNG or SVG from the command line",
  "type": "module",
  "bin": {
    "excalidraw-cli": "./dist/index.js"
  },
  "files": ["dist"],
  "engines": {
    "node": ">=18"
  },
  "scripts": {
    "build": "tsup",
    "dev": "tsx src/index.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint src tests",
    "format": "prettier --write src tests",
    "prepare": "husky",
    "prepublishOnly": "npm run build && npm test"
  },
  "lint-staged": {
    "*.ts": ["eslint --fix", "prettier --write"]
  },
  "dependencies": {
    "@excalidraw/excalidraw": "^0.17.0",
    "commander": "^12.0.0",
    "glob": "^11.0.0",
    "jsdom": "^25.0.0",
    "@resvg/resvg-js": "^2.6.0"
  },
  "devDependencies": {
    "@types/jsdom": "^21.0.0",
    "@types/node": "^22.0.0",
    "@vitest/coverage-v8": "^2.0.0",
    "eslint": "^9.0.0",
    "eslint-config-prettier": "^9.0.0",
    "husky": "^9.0.0",
    "lint-staged": "^15.0.0",
    "prettier": "^3.0.0",
    "tsx": "^4.0.0",
    "tsup": "^8.0.0",
    "typescript": "^5.5.0",
    "typescript-eslint": "^8.0.0",
    "vitest": "^2.0.0"
  }
}
```

**Important:** Do not copy the `devDependencies` version numbers literally — use the actual versions that `npm install` resolved (they will be in your existing `package.json` and `package-lock.json`). Only add the new fields: `"files"`, `"engines"`, and `"prepublishOnly"`.

- [ ] **Step 2: Validate `package.json` is valid JSON**

```bash
node -e "JSON.parse(require('fs').readFileSync('package.json', 'utf-8')); console.log('valid')"
```

Expected: prints `valid`. If it errors, fix the JSON syntax before continuing.

- [ ] **Step 3: Verify package contents with dry run**

```bash
npm pack --dry-run
```

Expected: only files under `dist/` and `package.json` are listed. No `src/`, `tests/`, `docs/`, or config files should appear.

- [ ] **Step 4: Verify prepublishOnly works end-to-end**

`prepublishOnly` is a lifecycle hook and cannot be called directly with `npm run`. Trigger it by running the equivalent commands manually:

```bash
npm run build && npm test
```

Expected: build succeeds and all tests pass.

- [ ] **Step 5: Commit and push**

```bash
git add package.json
git commit -m "chore: prepare package for npm publishing"
git push
```

- [ ] **Step 6: Verify CI passes after push**

Confirm on GitHub Actions that all CI steps still pass with the updated `package.json`.

---

## Summary of Files

| File | Action |
|------|--------|
| `eslint.config.mjs` | Create |
| `.prettierrc` | Create |
| `.prettierignore` | Create |
| `.editorconfig` | Create |
| `.github/workflows/ci.yml` | Create |
| `.github/dependabot.yml` | Create |
| `.husky/pre-commit` | Create (via husky init) |
| `vitest.config.ts` | Modify — add coverage config |
| `package.json` | Modify — scripts, lint-staged, files, engines, prepublishOnly, prepare |
| `.gitignore` | Modify — add `coverage/` |

## New Dev Dependencies

| Package | Purpose |
|---------|---------|
| `eslint` | Linter runtime |
| `typescript-eslint` | TypeScript rules + parser (unified ESLint 9 package) |
| `eslint-config-prettier` | Disables ESLint rules that conflict with Prettier |
| `prettier` | Code formatter |
| `husky` | Git hooks |
| `lint-staged` | Run tools on staged files only |
| `@vitest/coverage-v8` | V8 coverage provider for Vitest |
