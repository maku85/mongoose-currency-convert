# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [0.2.0](https://github.com/maku85/mongoose-currency-convert/compare/v0.1.6...v0.2.0) (2026-03-15)

## [0.1.6](https://github.com/maku85/mongoose-currency-convert/compare/v0.1.5...v0.1.6) (2026-03-15)


### Features

* add error handling and rollback functionality in currency conversion plugin tests ([175b01e](https://github.com/maku85/mongoose-currency-convert/commit/175b01e7c70fabbbf4bfbd8905c380065c835601))
* add error handling for cache.get() in currency conversion plugin ([31d646d](https://github.com/maku85/mongoose-currency-convert/commit/31d646d8cb21b3f8bbccfc70ff933c4b970fbfc9))
* add onSuccess callback option ([589937d](https://github.com/maku85/mongoose-currency-convert/commit/589937df2699db3b1cbc7fb0cf7c61a4d74a8be2))
* add option to skip currency conversion in save and update operations ([6eca3e2](https://github.com/maku85/mongoose-currency-convert/commit/6eca3e270888641e7f481713c80e1cb4125eccd9))
* add rateValidation option to enforce rate bounds in currency conversion ([dc9b4c7](https://github.com/maku85/mongoose-currency-convert/commit/dc9b4c7992506731e169bd3d4c385c6adf3a0b3e))
* add usedFallback flag to success context and update related logic ([c38cdb9](https://github.com/maku85/mongoose-currency-convert/commit/c38cdb9cca34ea6411a22a242e19487bc5dacc46))
* add usedFallback property to success context and handle errors in callbacks ([0460747](https://github.com/maku85/mongoose-currency-convert/commit/046074761f2fa17f23e66a00fffd19247c6d24b1))
* add validate module for currency code validation ([0a9b8f7](https://github.com/maku85/mongoose-currency-convert/commit/0a9b8f7e2e1cd354719e40aea808345cd499f0a7))
* add validation for dateTransform option and improve currency code checks ([e07d047](https://github.com/maku85/mongoose-currency-convert/commit/e07d047b7c0187481190e4007e56731834b3833f))
* add validation for fallbackRate against rateValidation bounds in currency conversion ([bdef2fe](https://github.com/maku85/mongoose-currency-convert/commit/bdef2fed8b31afd68d31284f033f4c5d34182b18))
* add validation tests for rateValidation and skipCurrencyConversion logic ([d5b6015](https://github.com/maku85/mongoose-currency-convert/commit/d5b6015c42fff5bd567c180c49778c87c91af247))
* enhance README ([6b2b40c](https://github.com/maku85/mongoose-currency-convert/commit/6b2b40c3f8318d15e1faaaa6fb72cf4532532684))
* improve warning message for non-numeric amount in currency conversion ([ab57e31](https://github.com/maku85/mongoose-currency-convert/commit/ab57e3153aa69651efca8b57c8834536e4e68659))
* update rateValidation defaults and enhance onSuccess/onError handling ([83c745c](https://github.com/maku85/mongoose-currency-convert/commit/83c745c2cac1ceb239be865b42c5c14950d1c9cb))


### Bug Fixes

* add cache destruction after saving product in example scripts ([5365bce](https://github.com/maku85/mongoose-currency-convert/commit/5365bce54122b3ed02a09883f8090e0c54e47183))
* add concurrency option to CurrencyPluginOptions and refactor rate fetching logic ([bdb20f8](https://github.com/maku85/mongoose-currency-convert/commit/bdb20f8d0b52ace3fdfafbb36a2a5db5f0004843))
* add updateMany middleware to currency conversion plugin ([8043139](https://github.com/maku85/mongoose-currency-convert/commit/804313963eef7834d3393c6d8bd59158303c3906))
* add validation for round, onError, fallbackRate, and concurrency options ([075ce91](https://github.com/maku85/mongoose-currency-convert/commit/075ce912f6740ecee1063e5a71bd98ac1851a7d8))
* correct rollback logic to clear converted fields on error ([fba0197](https://github.com/maku85/mongoose-currency-convert/commit/fba01970349877152996dfe0333a4221e9ec2c39))
* enhance update middleware to apply currency conversion on $setOnInsert ([305d1b3](https://github.com/maku85/mongoose-currency-convert/commit/305d1b3c87346d1a38802ea848a244d9e768e3b6))
* handle cache.set() failure gracefully in currency conversion plugin ([b6a4e75](https://github.com/maku85/mongoose-currency-convert/commit/b6a4e751bd8630724bd6d48948c7539443bb6303))
* handle invalid date values in currency conversion plugin ([30a5aa9](https://github.com/maku85/mongoose-currency-convert/commit/30a5aa931ab7a28522b510fc5fbf3bf0d5905c3c))
* handle null rate in currency conversion logic ([0745eb9](https://github.com/maku85/mongoose-currency-convert/commit/0745eb9271ea6e50a8d689732c1bceda9efafca6))
* implement cache sweep mechanism and cleanup in SimpleCache class ([6010dff](https://github.com/maku85/mongoose-currency-convert/commit/6010dffddda12452eef66a8c49074c2cb8115d5d))
* improve currency code validation logic ([85e7a67](https://github.com/maku85/mongoose-currency-convert/commit/85e7a67109be5db8bf1bc22d2702c0587e8abf67))
* improve error handling in update middleware for currency conversion ([1d2f482](https://github.com/maku85/mongoose-currency-convert/commit/1d2f482087d6ebf50c6fcb16d68874e7c3ede966))
* normalize currency codes in cache key for consistency ([d7b691b](https://github.com/maku85/mongoose-currency-convert/commit/d7b691ba39aa40dd97e686433b62625f68a653f1))
* optimize array return in getPathArray function for improved performance ([ccfd133](https://github.com/maku85/mongoose-currency-convert/commit/ccfd1339c45d67b45f7d967002955ac96d950c40))
* optimize path cache management for improved performance ([b2edda7](https://github.com/maku85/mongoose-currency-convert/commit/b2edda70b7c66a2e8f429a8caee5641201850c01))
* refactor currency conversion logic to improve error handling and processing of work items ([f46b7ea](https://github.com/maku85/mongoose-currency-convert/commit/f46b7ead2813900fcab53fb81998f072c6ba2bd9))
* return conversion results from applyCurrencyConversion function ([5680b95](https://github.com/maku85/mongoose-currency-convert/commit/5680b9534415b229f0d0cf1c7cf558e47e5cfe71))
* simplify currencyConversionPlugin options by using CurrencyPluginOptions directly ([be7c450](https://github.com/maku85/mongoose-currency-convert/commit/be7c450393be438ff00a81c35f243cd79c5f00e0))
* skip currency conversion for identical currencies and use fallbackRate on getRate failure ([1c7545b](https://github.com/maku85/mongoose-currency-convert/commit/1c7545b994a1b906755c03920ad51c6314d119ea))
* skip currency conversion for non-numeric amounts and add corresponding test ([6b69ea7](https://github.com/maku85/mongoose-currency-convert/commit/6b69ea7043c7df3a0d926e1ad9357d4533dc1378))
* update applyCurrencyConversion call to use 'this' context in save middleware ([b2aa394](https://github.com/maku85/mongoose-currency-convert/commit/b2aa39444f0be1ce3cd0d1216c55a641414dddf0))
* update build:cjs script to use temporary directory for output ([735b84e](https://github.com/maku85/mongoose-currency-convert/commit/735b84e2e61ee3721413e9682e2851c031b4e116))
* update CONTRIBUTING.md and README.md for clarity and improved guidelines ([8a1ba0a](https://github.com/maku85/mongoose-currency-convert/commit/8a1ba0a8e1685819a1aafe44e40e7d0c16f2c29e))
* update description for clarity and adjust prepublishOnly and coverage scripts to use pnpm ([c4bdf66](https://github.com/maku85/mongoose-currency-convert/commit/c4bdf6670dc610dbf14639896bd8fa398bff9754))
* update healthcheck command to use mongosh for better compatibility ([f717e57](https://github.com/maku85/mongoose-currency-convert/commit/f717e57b335fe68e425b9db015478bea0995a876))
* update ISO 4217 currency codes to include complete list and improve organization ([57f0e0a](https://github.com/maku85/mongoose-currency-convert/commit/57f0e0ad5e9cdcebc6fac5791d675f6981c01178))
* update issue and pull request templates for clarity and improved guidelines ([515f810](https://github.com/maku85/mongoose-currency-convert/commit/515f810b5f183bbfc153910ea6f8aa408cdd7326))
* update release workflow ([00428ab](https://github.com/maku85/mongoose-currency-convert/commit/00428abac1917f016eef35c5afd1621d6114c9ce))
* update tests ([97045ba](https://github.com/maku85/mongoose-currency-convert/commit/97045bab0387e16a414064a99ac4a6558cf3df12))
* update tsconfig to set rootDir to current directory and include test files ([99f3d77](https://github.com/maku85/mongoose-currency-convert/commit/99f3d7713fef007261bcc29761ec5eea6b018dc5))

## [0.1.0] - 2025-10-07
### Added
- Initial release of `mongoose-currency-convert`.
- Automatic currency conversion for specified fields on save and update.
- Support for nested paths and array elements.
- Customizable exchange rate logic via user function.
- Pluggable rounding function.
- Optional in-memory cache for exchange rates.
- Error handling and rollback on conversion failure.
- TypeScript support and exported types.
- High test coverage and examples.
- Issue and PR templates.
- Improved documentation and usage examples.
