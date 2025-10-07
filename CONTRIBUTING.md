# Contributing to mongoose-currency-convert

Thank you for your interest in contributing! Please follow these guidelines to help us maintain a high-quality project.

## How to Contribute

1. **Fork the repository** and clone your fork locally.
2. **Create a new branch** for your feature or fix:
   ```sh
   git checkout -b feat/my-feature
   ```
3. **Write clear, tested code**. Add or update unit tests as needed.
4. **Follow the Conventional Commits** format for commit messages (required for semantic-release):
   - Example: `feat: add support for new currency provider`
5. **Run all tests** before submitting:
   ```sh
   pnpm test
   pnpm coverage
   ```
6. **Open a Pull Request** on GitHub. Fill out the PR template and describe your changes clearly.

## Code Style
- Use TypeScript and follow the existing code style.
- Run the linter before committing:
  ```sh
  pnpm lint
  ```
- Format code with Prettier:
  ```sh
  pnpm format
  ```

## Issues & Feature Requests
- Search for existing issues before opening a new one.
- Provide clear steps to reproduce bugs or describe your feature request in detail.

## Extension Plugins
- See the README for instructions on creating external rate provider plugins.
- Export types from the base package for compatibility.

## License
By contributing, you agree that your code will be released under the MIT License.

---

Thanks for helping improve mongoose-currency-convert!