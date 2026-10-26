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

The demo lets you edit a JSON model and expression, then evaluates the expression in your browser using the library bundled with the site. It showcases both boolean expressions and value-producing expressions such as `concat`, `len`, `lower`, `upper`, `if`, and the math operators.

To run the demo from a repository checkout, use Node.js 24 LTS or another version supported by the development tools:

```bash
npm ci
npm run build
npm run demo
```

The demo imports the built library from `lib/`. Run `npm run build` again after changing library source files.

The demo is a client-side showcase, not a security boundary. As with the library itself, expression text and regular-expression patterns should be treated as trusted input.

## Expression Syntax

Constants:

- `true` and `false`, case-insensitive
- Finite numeric literals in signed decimal/exponent form, including `.5`, `5.`, and `-2.5e+2`
- Strings quoted with single quotes, double quotes, or backticks
- Lists enclosed in square brackets, with comma-separated expressions such as `["yes", lower("NO"), #value]`

String backslashes are retained literally; they only affect whether a quote closes the string. There are no `null` or `undefined` literals, no object literals, and exactly one complete expression is required. Bare identifiers other than `true` and `false` are operator names and must be followed by parentheses.

Outer expression normalization and token separation recognize exactly Unicode White_Space: U+0009-U+000D, U+0020, U+0085, U+00A0, U+1680, U+2000-U+200A, U+2028, U+2029, U+202F, U+205F, and U+3000. U+FEFF is not whitespace. The same set is used to trim numeric strings and by the `trim` operator.

Model references start with `#`. Nested values use dots, such as `#user.name`. A literal own key such as `"user.name"` takes precedence over nested traversal. References only resolve own properties; inherited values are never read. JavaScript arrays currently expose numeric keys and `length` through this mechanism, but that is an incidental runtime behavior rather than a portable expression contract. Do not traverse arrays by reference in expressions shared with other implementations. The segments `__proto__`, `constructor`, and `prototype` are rejected. Models may contain JavaScript values that JSON cannot represent, including `undefined`, nonfinite numbers, shared references, and cycles; these are implementation-local behaviors rather than portable corpus values.

Operators are case-insensitive:

### Logic and comparison

| Operator | Arguments | Behavior |
| --- | --- | --- |
| `not` | 1 | Logical negation. |
| `eq` | 2 | Portable primitive equality and structural equality for lists and objects, as detailed below. Cycles terminate safely, but equality of differently shaped cyclic graphs is not a graph-isomorphism guarantee. |
| `or` | 2+ | Logical OR with short-circuit evaluation. |
| `and` | 2+ | Logical AND with short-circuit evaluation. |
| `gt` | 2 | Ordinal string or strict numeric greater-than comparison, as detailed below. |
| `lt` | 2 | Ordinal string or strict numeric less-than comparison, as detailed below. |

### Text and collections

| Operator | Arguments | Behavior |
| --- | --- | --- |
| `contains` | 2 | Case-sensitive string containment; the left value must be a string. |
| `startswith` | 2 | Case-sensitive string prefix matching; the left value must be a string. |
| `endswith` | 2 | Case-sensitive string suffix matching; the left value must be a string. |
| `in` | 2 | True when the first value is present in the second value, which must be a list; comparisons use the same rules as `eq`. |
| `empty` | 1 | True for `null`, `undefined`, and empty strings. |
| `len` | 1 | Returns `0` for nullish values, a string length, or an own `length` property; throws otherwise. |
| `lower` | 1 | Converts a value to lowercase text; falsey values become empty strings. |
| `upper` | 1 | Converts a value to uppercase text; falsey values become empty strings. |
| `trim` | 1 | Trims the explicit Unicode White_Space set; nullish values remain unchanged and other falsey values become empty strings. |
| `concat` | 2+ | Concatenates truthy values after portable text conversion; falsy values become empty strings. |

### Conversion and numeric

| Operator | Arguments | Behavior |
| --- | --- | --- |
| `defined` | 1 | True for every value except `null` and `undefined`. |
| `int` | 1 | Strictly converts a finite number or finite signed decimal/exponent string and truncates toward zero. |
| `num` | 1 | Converts a finite number or finite numeric string to a number. |
| `abs` | 1 | Returns the absolute value of a finite numeric input. |
| `floor` | 1 | Rounds a finite numeric input down to the nearest integer. |
| `ceil` | 1 | Rounds a finite numeric input up to the nearest integer. |
| `sqrt` | 1 | Returns the finite square root of a finite numeric input; a negative input throws `Invalid numeric result`. |

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
| `round` | 2 | Rounds the converted finite runtime number to a precision from 0 through 308; exact midpoint ties round away from zero. |
| `pow` | 2 | Raises a strictly converted value to a strictly converted exponent. |
| `clamp` | 3 | Constrains strictly converted numeric values between a minimum and maximum. |

### Conditional and matching

| Operator | Arguments | Behavior |
| --- | --- | --- |
| `match` | 2 | Tests a value against a non-empty JavaScript regular-expression pattern; empty or non-string patterns return `false`. |
| `if` | 3 | Returns the second or third argument based on the truthiness of the first; only the selected branch is evaluated. |

All numeric scalar inputs must be finite numbers or strings which, after trimming the explicit whitespace set, match `[+-]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?` and convert to a finite number. Radix strings, booleans, nullish or missing values, objects, lists used as leaves, blank or invalid strings, `NaN`, and infinities throw `Invalid numeric value`. Every numeric operator must also return a finite result; otherwise it throws `Invalid numeric result`. `div` and `mod` retain the more specific `Division by zero` error, including after an earlier nonfinite intermediate.

The seven list-aware numeric operators evaluate all arguments, then recursively flatten lists before scalar conversion. Cyclic lists encountered during active flattening throw `Invalid numeric value`; a repeated list that is no longer active is allowed. Each of these operators accepts any one expression argument syntactically, but at runtime that argument must evaluate to a list. A scalar result from `add(1)`, `sub(1)`, or `max(1)` throws an error containing `one list argument` even where flattened cardinality rules would otherwise permit one value.

Numeric literals and scalar numeric operator results normalize negative zero to positive zero. A plain reference to a model-supplied `-0` is returned unchanged; this JavaScript-specific exception avoids copying or rewriting model values.

`round` accepts a converted integer precision from 0 through 308 inclusive. It rounds decimal midpoint ties away from zero, distinguishes representable values adjacent to a midpoint, and does not fail only because multiplying by `10 ** precision` would overflow.

Equality does not use JavaScript's general coercion. Missing and null equal each other and no other value. Same-kind primitives compare directly. A finite number can equal a valid decimal string, and a Boolean compares as `1` or `0` only against a finite number or valid decimal string; blank strings are never numeric. Lists compare only with lists by length and recursive elements, with sparse holes equivalent to `undefined`. Objects compare only with objects by own enumerable keys and recursive values. List/object, collection/scalar, invalid numeric, and nonfinite cross-kind comparisons are false. Structural equality is cycle-safe.

`gt` and `lt` compare two nonblank strings by ordinal UTF-16 code-unit order, even when both look numeric. Otherwise, finite numbers and valid decimal strings compare numerically. Booleans, nullish or missing values, blank or invalid strings, lists, objects, and nonfinite numbers make the comparison false.

Portable text conversion retains JavaScript's comma-separated list form: nullish elements and sparse holes contribute empty fields, nested lists are flattened textually through their commas, and objects use their normal JavaScript text. An active cyclic list throws `Cyclic list value`; reusing the same list after its earlier traversal is complete is allowed. This applies wherever operators convert values to text, including `concat`, string predicates, case conversion, `trim`, and regex input.

Each list literal evaluation creates a fresh list, including `[]`; cached evaluators never share a mutable literal result between evaluations.

Constant string patterns passed directly to `match` are compiled eagerly while parsing, so an invalid constant regex throws even if a surrounding expression would later short-circuit that branch. Model-derived patterns are compiled when evaluated.

## Caching

Parsed evaluators and the expression wrappers used internally by `executeExpression` are cached by default. Each cache is bounded to 1,000 entries and evicts the oldest entry when full; cache hits do not refresh FIFO order. Expression input type is validated before cache lookup. Boolean keys intentionally share entries with the equivalent lowercase strings (`true` with `"true"`, and `false` with `"false"`), while differently cased strings remain distinct. Use `SimpleExpressions.setCacheLimit(limit)` to set a positive safe-integer limit; lowering it immediately evicts the oldest existing entries. A limit of zero or less throws; use `disableCaches()` to disable caching, which also clears existing entries, and `enableCaches()` to resume caching.

## Errors

Parse-time failures (malformed syntax, unknown operators, non-finite literals, invalid references, and invalid constant regex patterns) throw `ExpressionParseException`. Failures while evaluating a parsed expression (invalid numeric values, division by zero, cyclic lists, and invalid model-supplied regex patterns) throw `ExpressionEvaluationException`. Both extend `Error` and are exported. Passing a value that is neither a string nor a Boolean throws a `TypeError`.

## Security

Expressions and regular-expression patterns are trusted input. `match` accepts JavaScript regex patterns from expression literals and model values. Invalid patterns throw, and untrusted patterns can cause excessive CPU use through catastrophic backtracking (ReDoS). Do not use this package as an untrusted-input validation or authorization boundary.

## Conformance

Cross-language compatibility is tested in the independent [simple-expressions-conformance](https://github.com/LieselThuriot/simple-expressions-conformance) repository. This package has no filesystem or checkout dependency on the C# and Dart implementations.

The conformance specification is versioned and maintained independently. See the conformance repository for the corpus and adapter contract; each implementation runs the corpus through its own test suite.

This package supports conformance specification v1. See [CONFORMANCE.md](https://github.com/LieselThuriot/simple-expressions/blob/master/CONFORMANCE.md) for compatibility details. The repository pins the corpus at `__tests__/conformance/`.

## Version 2.0.0 compatibility notes

This release intentionally replaces JavaScript's general loose equality and comparison coercions with the portable v1 rules. For example, `eq(false, "")`, `eq([], "")`, and `gt(true, 0)` now return `false`; distinct objects with equal own keys and values compare structurally. Unicode White_Space is recognized consistently, while U+FEFF is preserved by `trim` and rejected at expression boundaries.

Numeric operators require finite numbers or finite decimal/exponent strings, recursively expand list arguments where supported, and reject nonfinite results. `setCacheLimit(0)` now throws; use `disableCaches()` to disable caching. Parse and evaluation failures use the exported exception types described above. Review existing expressions and error handling when upgrading.

## Development

Run these commands from the root of a repository checkout. Node.js 24 LTS is recommended for development. The current test runner supports Node.js `^22.12.0 || ^24.0.0 || >=26.0.0`; this is separate from the published library's Node.js 20+ requirement.

Initialize the shared test fixtures and install dependencies:

```bash
git submodule update --init --recursive
npm ci
```

Then run the tests and build the production demo:

```bash
npm test
npm run demo:build
```

`npm test` rebuilds the published library in `lib/` before running the tests. `npm run demo:build` rebuilds the library and writes the production site to `docs/`. Both generated directories are tracked in this repository; review their changes with the source changes.

## Publishing

From the repository checkout, run `npm test` and inspect the package contents:

```bash
npm run pack:check
```

With the release version set and npm authentication configured, publish with:

```bash
npm run release
```

`npm run pack:check` is a dry run. `npm run release` creates the package tarball and publishes the package to npm; the `prepublishOnly` hook runs the tests again before publication.
