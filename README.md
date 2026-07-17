# simple-expressions

![simple-expressions logo](https://raw.githubusercontent.com/LieselThuriot/simple-expressions/refs/heads/master/demo/simple-expressions.png)

[![npm](https://img.shields.io/npm/v/simple-expressions.svg)](https://www.npmjs.com/package/simple-expressions)
[![license](https://img.shields.io/npm/l/simple-expressions.svg)](https://www.npmjs.com/package/simple-expressions)

A small, dependency-free CommonJS library for parsing and evaluating simple expressions against a model object.

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

## Demo

Try the interactive playground at [lieselthuriot.github.io/simple-expressions](https://lieselthuriot.github.io/simple-expressions/).

The demo lets you edit a JSON model and expression, then evaluates the expression in your browser using the package source bundled locally for the site. It showcases both boolean expressions and value-producing expressions such as `concat`, `len`, `lower`, `upper`, and `if`.

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

Model references start with `#`. Nested values use dots, such as `#user.name`. A literal own key such as `"user.name"` takes precedence over nested traversal. References only resolve own properties; inherited values are never read. The segments `__proto__`, `constructor`, and `prototype` are rejected.

Operators are case-insensitive:

| Operator | Arguments | Behavior |
| --- | --- | --- |
| `not` | 1 | Logical negation. |
| `eq` | 2 | JavaScript loose equality (`==`). |
| `or` | 2+ | Logical OR with short-circuit evaluation. |
| `and` | 2+ | Logical AND with short-circuit evaluation. |
| `contains` | 2 | Case-sensitive string containment; the left value must be a string. |
| `startswith` | 2 | Case-sensitive string prefix matching; the left value must be a string. |
| `endswith` | 2 | Case-sensitive string suffix matching; the left value must be a string. |
| `gt` | 2 | JavaScript greater-than comparison. |
| `lt` | 2 | JavaScript less-than comparison. |
| `empty` | 1 | True for `null`, `undefined`, and empty strings. |
| `len` | 1 | A string length or an own `length` property; throws otherwise. |
| `lower` | 1 | Converts a value to lowercase text; falsey values become empty strings. |
| `upper` | 1 | Converts a value to uppercase text; falsey values become empty strings. |
| `concat` | 2+ | Concatenates truthy values after calling `toString()`; falsy values become empty strings. |
| `match` | 2 | Tests a value against a JavaScript regular expression pattern. |
| `if` | 3 | Returns the second or third argument based on the truthiness of the first; only the selected branch is evaluated. |

Unquoted identifiers are operators and must be followed by parentheses. They are not string constants.

## Caching

Parsed expressions and `SimpleExpression` instances are cached by default. Each cache is bounded to 1,000 entries and evicts the oldest entry when full. Use `SimpleExpressions.setCacheLimit(limit)` to set a positive safe-integer limit; lowering it immediately evicts the oldest existing entries. A limit of zero or less disables caching, the same as `disableCaches()`, which also clears existing entries. Use `SimpleExpressions.clear()` or `enableCaches()` to manage this behavior when needed.

## Security

Expressions and regular-expression patterns are trusted input. `match` accepts JavaScript regex patterns from expression literals and model values. Invalid patterns throw, and untrusted patterns can cause excessive CPU use through catastrophic backtracking (ReDoS). Do not use this package as an untrusted-input validation or authorization boundary.

## Development

```bash
npm test
npm run pack:check
npm run release
```

`npm test` rebuilds the published output before running the test suite. `npm run pack:check` shows the files that would be included in a release.
`npm run release` creates the package tarball and publishes it to npm.