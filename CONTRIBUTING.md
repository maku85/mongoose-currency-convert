# Contributing to mongoose-currency-convert

Thank you for your interest in contributing! This document explains how to get started and what to keep in mind.

## Prerequisites

- Node.js ≥ 18
- pnpm
- Docker (for running MongoDB in integration tests)

## Setup

```sh
git clone https://github.com/maku85/mongoose-currency-convert.git
cd mongoose-currency-convert
pnpm install
```

Start MongoDB for tests:

```sh
docker compose up -d
```

## Development workflow

1. **Fork** the repository and create a branch:
   ```sh
   git checkout -b feat/my-feature
   ```

2. **Make your changes** in `src/`. The main entry point is `src/index.ts`; types live in `src/types.ts`; utilities in `src/utils/`.

3. **Add or update tests** in `test/plugin.spec.ts`. All changes must be covered.

4. **Run the test suite** (requires Docker/MongoDB running):
   ```sh
   pnpm test
   ```

5. **Check coverage** (must stay above the thresholds in `package.json`):
   ```sh
   pnpm coverage
   ```

6. **Lint and format**:
   ```sh
   pnpm lint
   pnpm format
   ```

7. **Build** to verify the dual ESM/CJS output is correct:
   ```sh
   pnpm build
   ```

8. **Commit** using [Conventional Commits](https://www.conventionalcommits.org/) — this is required for semantic-release to generate the changelog and bump the version automatically:

   | Prefix | When to use |
   |--------|-------------|
   | `feat:` | New feature visible to users |
   | `fix:` | Bug fix |
   | `perf:` | Performance improvement |
   | `refactor:` | Code change that is neither a fix nor a feature |
   | `test:` | Adding or fixing tests |
   | `docs:` | Documentation only |
   | `chore:` | Tooling, config, dependencies |

   Breaking changes: add `BREAKING CHANGE:` in the commit body, or append `!` to the type (e.g. `feat!:`).

9. **Open a Pull Request** on GitHub with a clear description of what changed and why.

## Project structure

```
src/
  index.ts          # Plugin entry point and Mongoose middleware
  types.ts          # Exported TypeScript interfaces
  utils/
    helpers.ts      # ISO 4217 list, path helpers, rounding
    cache.ts        # Built-in SimpleCache implementation
test/
  plugin.spec.ts    # Integration tests (Mocha + Chai + real MongoDB)
```

## Writing tests

Tests run against a real MongoDB instance (not mocked). Use the existing helpers at the top of `plugin.spec.ts` to connect and register models. Each test should:
- Use a fresh model/schema to avoid state leakage between tests.
- Assert on the actual saved document retrieved from the database.

## Extension plugins

To publish a `getRate` provider as a separate package:

```ts
import type { GetRateFn } from 'mongoose-currency-convert/types';

export function createMyProvider(): GetRateFn {
  return async (from, to, date) => {
    // fetch rate from your service
    return rate;
  };
}
```

The cache is managed by the base plugin — providers must only return a rate value. See [`mongoose-currency-convert-ecb`](https://www.npmjs.com/package/mongoose-currency-convert-ecb) as a reference implementation.

## Issues and feature requests

- Search for existing issues before opening a new one.
- For bugs, include a minimal reproducible example and the versions of Node.js, Mongoose, and this package you are using.
- For new features, explain the use case first; implementation PRs without prior discussion may be closed.

## License

By contributing, you agree that your code will be released under the [MIT License](LICENSE).
