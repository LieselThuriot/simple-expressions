# simple-expressions

![simple-expressions logo](https://raw.githubusercontent.com/LieselThuriot/simple-expressions/refs/heads/master/demo/public/simple-expressions.png)

[![npm](https://img.shields.io/npm/v/simple-expressions.svg)](https://www.npmjs.com/package/simple-expressions)
[![license](https://img.shields.io/npm/l/simple-expressions.svg)](https://www.npmjs.com/package/simple-expressions)

A small, dependency-free CommonJS library for parsing and evaluating trusted expressions against a model object.

## Install

```bash
npm install simple-expressions
```

Requires Node.js 20 or later.

## Usage

```js
const { executeExpression, parseExpression } = require('simple-expressions');

const model = { user: { name: 'Ada' }, score: 8 };

executeExpression(model, 'and(eq(#user.name, "Ada"), gt(#score, 5))');
// true

const evaluator = parseExpression('concat("Hello, ", #user.name)');
evaluator(model);
// "Hello, Ada"
```

`executeExpression(model, expression)` always returns a boolean. `parseExpression(expression)` returns a reusable evaluator and preserves the expression result's type.

For direct use, `new SimpleExpression(expression)` accepts an expression string or Boolean and exposes `.evaluate(model)`. `SimpleExpressions.clear({ parsed, expression })` can clear either cache selectively.

## Demo

Try the interactive playground at [simple-expressions.liesel.dev](https://simple-expressions.liesel.dev/).

The demo lets you edit a JSON model and expression, then evaluates the expression in your browser using the package source bundled locally for the site. It showcases both boolean expressions and value-producing expressions such as `concat`, `len`, `lower`, `upper`, `if`, and the math operators.

To run the demo locally:

```bash
npm install
npm run demo
```

The demo is a client-side showcase, not a security boundary. As with the library itself, expression text and regular-expression patterns should be treated as trusted input.

## Expression Syntax

Constants:

- `true` and `false`, case-insensitive
- Numeric literals, including signed, decimal, and exponent values
- Strings quoted with single quotes, double quotes, or backticks
- Lists enclosed in square brackets, with comma-separated expressions such as `["yes", lower("NO"), #value]`

String backslashes are retained literally; they only affect whether a quote closes the string. There are no `null` or `undefined` literals, no object literals, and exactly one complete expression is required. Bare identifiers other than `true` and `false` are operator names and must be followed by parentheses.

Model references start with `#`. Nested values use dots, such as `#user.name`. A literal own key such as `"user.name"` takes precedence over nested traversal. References only resolve own properties; inherited values are never read. JavaScript arrays currently expose numeric keys and `length` through this mechanism, but that is an incidental runtime behavior rather than a portable expression contract. Do not traverse arrays by reference in expressions shared with other implementations. The segments `__proto__`, `constructor`, and `prototype` are rejected. Models may contain JavaScript values that JSON cannot represent, including `undefined`, nonfinite numbers, shared references, and cycles; these are implementation-local behaviors rather than portable corpus values.

Operators are case-insensitive:

### Logic and comparison

| Operator | Arguments | Behavior |
| --- | --- | --- |
| `not` | 1 | Logical negation. |
| `eq` | 2 | Loose equality, with structural equality for lists and objects using own enumerable properties. Cycles terminate safely, but equality of differently shaped cyclic graphs is not a graph-isomorphism guarantee. |
| `or` | 2+ | Logical OR with short-circuit evaluation. |
| `and` | 2+ | Logical AND with short-circuit evaluation. |
| `gt` | 2 | JavaScript greater-than comparison. |
| `lt` | 2 | JavaScript less-than comparison. |

### Text and collections

| Operator | Arguments | Behavior |
| --- | --- | --- |
| `contains` | 2 | Case-sensitive string containment; the left value must be a string. |
| `startswith` | 2 | Case-sensitive string prefix matching; the left value must be a string. |
| `endswith` | 2 | Case-sensitive string suffix matching; the left value must be a string. |
| `in` | 2 | True when the first value is present in the second value, which must be a list; comparisons use the same loose equality as `eq`. |
| `empty` | 1 | True for `null`, `undefined`, and empty strings. |
| `len` | 1 | Returns `0` for nullish values, a string length, or an own `length` property; throws otherwise. |
| `lower` | 1 | Converts a value to lowercase text; falsey values become empty strings. |
| `upper` | 1 | Converts a value to uppercase text; falsey values become empty strings. |
| `trim` | 1 | Trims surrounding whitespace; nullish values remain unchanged and other falsey values become empty strings. |
| `concat` | 2+ | Concatenates truthy values after calling `toString()`; falsy values become empty strings. |

### Conversion and numeric

| Operator | Arguments | Behavior |
| --- | --- | --- |
| `defined` | 1 | True for every value except `null` and `undefined`. |
| `int` | 1 | Converts a finite number or finite numeric string and truncates toward zero with `Math.trunc()`. |
| `num` | 1 | Converts a finite number or finite numeric string to a number. |
| `abs` | 1 | Returns the absolute value of a finite numeric input. |
| `floor` | 1 | Rounds a finite numeric input down to the nearest integer. |
| `ceil` | 1 | Rounds a finite numeric input up to the nearest integer. |
| `sqrt` | 1 | Returns the square root of a finite numeric input. The result may be `NaN`. |

### Arithmetic

| Operator | Arguments | Behavior |
| --- | --- | --- |
| `add` | 2+ (or 1 list) | Adds numeric leaves after recursively flattening list arguments; an empty list returns `0`. |
| `sub` | 2+ (or 1 list) | Recursively flattens list arguments, then subtracts at least two numeric leaves from left to right. |
| `mul` | 2+ (or 1 list) | Multiplies numeric leaves after recursively flattening list arguments; an empty list returns `1`. |
| `div` | 2+ (or 1 list) | Recursively flattens list arguments, then divides at least two numeric leaves from left to right. Zero divisors throw. |
| `mod` | 2+ (or 1 list) | Recursively flattens list arguments, then calculates remainder across at least two numeric leaves. Zero divisors throw. |
| `min` | 2+ (or 1 list) | Returns the smallest numeric leaf after recursively flattening list arguments; no leaves throws. |
| `max` | 2+ (or 1 list) | Returns the largest numeric leaf after recursively flattening list arguments; no leaves throws. |
| `round` | 2 | Rounds strictly converted numeric values to a non-negative safe-integer number of decimal places. |
| `pow` | 2 | Raises a strictly converted value to a strictly converted exponent. |
| `clamp` | 3 | Constrains strictly converted numeric values between a minimum and maximum. |

### Conditional and matching

| Operator | Arguments | Behavior |
| --- | --- | --- |
| `match` | 2 | Tests a value against a non-empty JavaScript regular-expression pattern; empty or non-string patterns return `false`. |
| `if` | 3 | Returns the second or third argument based on the truthiness of the first; only the selected branch is evaluated. |

Unquoted identifiers are operators and must be followed by parentheses. They are not string constants.

All numeric scalar inputs must be finite numbers or finite numeric strings. Booleans, nullish or missing values, objects, lists used as leaves, blank or invalid strings, `NaN`, and infinities throw `Invalid numeric value`. Arithmetic may still produce `NaN` or infinity. Cyclic lists encountered while flattening arithmetic arguments also throw `Invalid numeric value`.

Each of the seven arithmetic operators accepts one syntactic argument only when that argument evaluates to a list. A scalar call such as `add(1)`, `sub(1)`, or `max(1)` is invalid even where the operator's flattened list rules would otherwise permit one value.

Constant string patterns passed directly to `match` are compiled eagerly while parsing, so an invalid constant regex throws even if a surrounding expression would later short-circuit that branch. Model-derived patterns are compiled when evaluated.

## Caching

Parsed evaluators and the expression wrappers used internally by `executeExpression` are cached by default. Each cache is bounded to 1,000 entries and evicts the oldest entry when full; cache hits do not refresh FIFO order. Use `SimpleExpressions.setCacheLimit(limit)` to set a positive safe-integer limit; lowering it immediately evicts the oldest existing entries. A limit of zero or less throws; use `disableCaches()` to disable caching, which also clears existing entries, and `enableCaches()` to resume caching.

## Security

Expressions and regular-expression patterns are trusted input. `match` accepts JavaScript regex patterns from expression literals and model values. Invalid patterns throw, and untrusted patterns can cause excessive CPU use through catastrophic backtracking (ReDoS). Do not use this package as an untrusted-input validation or authorization boundary.

## Conformance

Cross-language compatibility is tested in the independent [simple-expressions-conformance](https://github.com/LieselThuriot/simple-expressions-conformance) repository. This package has no filesystem or checkout dependency on the C# and Dart implementations.

The conformance specification is versioned and maintained independently. See the conformance repository for the corpus, adapter contract, and cross-language CI.

This package supports conformance specification v1. Initialize `__tests__/conformance/` before running conformance tests.

## Development

```bash
npm test
npm run pack:check
npm run release
```

`npm test` rebuilds the published output before running the test suite. `npm run pack:check` shows the files that would be included in a release.
`npm run release` creates the package tarball and publishes it to npm.
