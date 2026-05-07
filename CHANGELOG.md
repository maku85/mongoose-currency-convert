# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.5] - 2026-05-07

### Fixed

- Enhance `dateTransform` handling and add tests for invalid dates and non-finite rounding ([c5ab401](https://github.com/maku85/mongoose-currency-convert/commit/c5ab401))
- Remove deprecated currency codes from ISO 4217 list ([d600518](https://github.com/maku85/mongoose-currency-convert/commit/d600518))
- Add validation for duplicate `targetPath` in currency conversion plugin ([1636acc](https://github.com/maku85/mongoose-currency-convert/commit/1636acc))
- Update default min value in `rateValidation` to `0` ([0be75e8](https://github.com/maku85/mongoose-currency-convert/commit/0be75e8))
- Handle negative rates in currency conversion ([e178c6f](https://github.com/maku85/mongoose-currency-convert/commit/e178c6f))

## [0.2.4] - 2026-03-15

### Fixed

- Update release workflow permissions and documentation ([81e3287](https://github.com/maku85/mongoose-currency-convert/commit/81e3287fde942cf8c8b13585933735ac8bfca03a))

## [0.2.3] - 2026-03-15

### Fixed

- Disable husky in release workflow ([c3cb272](https://github.com/maku85/mongoose-currency-convert/commit/c3cb27272ba2b53993290fcee899f477eb0b015e))
- Update lock file ([6ba2736](https://github.com/maku85/mongoose-currency-convert/commit/6ba2736206bb2a9758adc42c3447b9033b99fa03))
- Update release workflow ([184eb0f](https://github.com/maku85/mongoose-currency-convert/commit/184eb0f2d9522ddb75dd85cb570961bd7aca3794))
- Update release workflow ([dd4a9d9](https://github.com/maku85/mongoose-currency-convert/commit/dd4a9d99b39817f08a94d43e7d3eae509fbb0a41))

## [0.2.2] - 2026-03-15

### Fixed

- Add `registry-url` and `NODE_AUTH_TOKEN` to npm publish step ([0c09805](https://github.com/maku85/mongoose-currency-convert/commit/0c098053d022c5b7fe627022a5bbe30ef6090de2))

## [0.2.1] - 2026-03-15

### Fixed

- Remove unnecessary `registry-url` from setup-node step ([d09bced](https://github.com/maku85/mongoose-currency-convert/commit/d09bced6d0bd9fe606c8862d0029fa6c4201ba78))
- Update `action-gh-release` to version 2.5.3 ([dd45a0d](https://github.com/maku85/mongoose-currency-convert/commit/dd45a0df595207ff9d8626695d9b0bbc1f92075d))

## [0.2.0] - 2026-03-15

First stable release. No code changes from `0.1.6`.

## [0.1.6] - 2026-03-15

### Added

- `onSuccess` callback option ([589937d](https://github.com/maku85/mongoose-currency-convert/commit/589937df2699db3b1cbc7fb0cf7c61a4d74a8be2))
- Option to skip currency conversion in save and update operations ([6eca3e2](https://github.com/maku85/mongoose-currency-convert/commit/6eca3e270888641e7f481713c80e1cb4125eccd9))
- `rateValidation` option to enforce rate bounds in currency conversion ([dc9b4c7](https://github.com/maku85/mongoose-currency-convert/commit/dc9b4c7992506731e169bd3d4c385c6adf3a0b3e))
- `usedFallback` flag to success context ([c38cdb9](https://github.com/maku85/mongoose-currency-convert/commit/c38cdb9cca34ea6411a22a242e19487bc5dacc46))
- `validate` module for currency code validation ([0a9b8f7](https://github.com/maku85/mongoose-currency-convert/commit/0a9b8f7e2e1cd354719e40aea808345cd499f0a7))
- Validation for `dateTransform` option and improved currency code checks ([e07d047](https://github.com/maku85/mongoose-currency-convert/commit/e07d047b7c0187481190e4007e56731834b3833f))
- Validation for `fallbackRate` against `rateValidation` bounds ([bdef2fe](https://github.com/maku85/mongoose-currency-convert/commit/bdef2fed8b31afd68d31284f033f4c5d34182b18))
- `concurrency` option to `CurrencyPluginOptions` and refactored rate fetching logic ([bdb20f8](https://github.com/maku85/mongoose-currency-convert/commit/bdb20f8d0b52ace3fdfafbb36a2a5db5f0004843))
- `updateMany` middleware to currency conversion plugin ([8043139](https://github.com/maku85/mongoose-currency-convert/commit/804313963eef7834d3393c6d8bd59158303c3906))
- Error handling and rollback functionality in currency conversion plugin ([31d646d](https://github.com/maku85/mongoose-currency-convert/commit/31d646d8cb21b3f8bbccfc70ff933c4b970fbfc9))
- Warning message for non-numeric amount in currency conversion ([ab57e31](https://github.com/maku85/mongoose-currency-convert/commit/ab57e3153aa69651efca8b57c8834536e4e68659))

### Changed

- Updated `rateValidation` defaults and enhanced `onSuccess`/`onError` handling ([83c745c](https://github.com/maku85/mongoose-currency-convert/commit/83c745c2cac1ceb239be865b42c5c14950d1c9cb))
- Updated `usedFallback` property in success context and error callback handling ([0460747](https://github.com/maku85/mongoose-currency-convert/commit/046074761f2fa17f23e66a00fffd19247c6d24b1))
- Enhanced README ([6b2b40c](https://github.com/maku85/mongoose-currency-convert/commit/6b2b40c3f8318d15e1faaaa6fb72cf4532532684))

### Fixed

- Validation for `round`, `onError`, `fallbackRate`, and `concurrency` options ([075ce91](https://github.com/maku85/mongoose-currency-convert/commit/075ce912f6740ecee1063e5a71bd98ac1851a7d8))
- Rollback logic to clear converted fields on error ([fba0197](https://github.com/maku85/mongoose-currency-convert/commit/fba01970349877152996dfe0333a4221e9ec2c39))
- Update middleware to apply currency conversion on `$setOnInsert` ([305d1b3](https://github.com/maku85/mongoose-currency-convert/commit/305d1b3c87346d1a38802ea848a244d9e768e3b6))
- `cache.set()` failure handled gracefully in currency conversion plugin ([b6a4e75](https://github.com/maku85/mongoose-currency-convert/commit/b6a4e751bd8630724bd6d48948c7539443bb6303))
- Invalid date values in currency conversion plugin ([30a5aa9](https://github.com/maku85/mongoose-currency-convert/commit/30a5aa931ab7a28522b510fc5fbf3bf0d5905c3c))
- Null rate in currency conversion logic ([0745eb9](https://github.com/maku85/mongoose-currency-convert/commit/0745eb9271ea6e50a8d689732c1bceda9efafca6))
- Cache sweep mechanism and cleanup in `SimpleCache` class ([6010dff](https://github.com/maku85/mongoose-currency-convert/commit/6010dffddda12452eef66a8c49074c2cb8115d5d))
- Currency code validation logic ([85e7a67](https://github.com/maku85/mongoose-currency-convert/commit/85e7a67109be5db8bf1bc22d2702c0587e8abf67))
- Error handling in update middleware for currency conversion ([1d2f482](https://github.com/maku85/mongoose-currency-convert/commit/1d2f482087d6ebf50c6fcb16d68874e7c3ede966))
- Normalized currency codes in cache key for consistency ([d7b691b](https://github.com/maku85/mongoose-currency-convert/commit/d7b691ba39aa40dd97e686433b62625f68a653f1))
- Optimized array return in `getPathArray` for improved performance ([ccfd133](https://github.com/maku85/mongoose-currency-convert/commit/ccfd1339c45d67b45f7d967002955ac96d950c40))
- Optimized path cache management for improved performance ([b2edda7](https://github.com/maku85/mongoose-currency-convert/commit/b2edda70b7c66a2e8f429a8caee5641201850c01))
- Currency conversion logic refactored to improve error handling and work item processing ([f46b7ea](https://github.com/maku85/mongoose-currency-convert/commit/f46b7ead2813900fcab53fb81998f072c6ba2bd9))
- Return conversion results from `applyCurrencyConversion` ([5680b95](https://github.com/maku85/mongoose-currency-convert/commit/5680b9534415b229f0d0cf1c7cf558e47e5cfe71))
- Simplified `currencyConversionPlugin` options to use `CurrencyPluginOptions` directly ([be7c450](https://github.com/maku85/mongoose-currency-convert/commit/be7c450393be438ff00a81c35f243cd79c5f00e0))
- Skip currency conversion for identical currencies; use `fallbackRate` on `getRate` failure ([1c7545b](https://github.com/maku85/mongoose-currency-convert/commit/1c7545b994a1b906755c03920ad51c6314d119ea))
- Skip currency conversion for non-numeric amounts ([6b69ea7](https://github.com/maku85/mongoose-currency-convert/commit/6b69ea7043c7df3a0d926e1ad9357d4533dc1378))
- `applyCurrencyConversion` call to use `this` context in save middleware ([b2aa394](https://github.com/maku85/mongoose-currency-convert/commit/b2aa39444f0be1ce3cd0d1216c55a641414dddf0))
- Build script to use temporary directory for CJS output ([735b84e](https://github.com/maku85/mongoose-currency-convert/commit/735b84e2e61ee3721413e9682e2851c031b4e116))
- ISO 4217 currency codes list updated with complete entries ([57f0e0a](https://github.com/maku85/mongoose-currency-convert/commit/57f0e0ad5e9cdcebc6fac5791d675f6981c01178))
- `tsconfig` to set `rootDir` to current directory and include test files ([99f3d77](https://github.com/maku85/mongoose-currency-convert/commit/99f3d7713fef007261bcc29761ec5eea6b018dc5))
- Cache destruction after saving product in example scripts ([5365bce](https://github.com/maku85/mongoose-currency-convert/commit/5365bce54122b3ed02a09883f8090e0c54e47183))

## [0.1.0] - 2025-10-07

### Added

- Initial release of `mongoose-currency-convert`
- Automatic currency conversion for specified fields on save and update
- Support for nested paths and array elements
- Customizable exchange rate logic via user-provided function
- Pluggable rounding function
- Optional in-memory cache for exchange rates
- Error handling and rollback on conversion failure
- TypeScript support and exported types
- High test coverage and usage examples
- Issue and PR templates
