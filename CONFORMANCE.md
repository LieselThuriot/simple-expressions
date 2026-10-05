# Conformance

Cross-language compatibility is specified and tested by the independent [simple-expressions-conformance](https://github.com/LieselThuriot/simple-expressions-conformance) repository.

The pinned `__tests__/conformance/` submodule supplies `spec/v1/cases.json`, which is executed by `__tests__/conformance.test.ts`. Initialize it with `git submodule update --init --recursive`. The test reads the corpus in place and does not copy files from the submodule.

The conformance suite is the minimum shared test set. The additional local tests cover this repository's demo helpers and are not part of the cross-language count.

This implementation supports conformance specification v1 and retains JavaScript-style truthiness. Portable whitespace is the explicit Unicode White_Space set U+0009-U+000D, U+0020, U+0085, U+00A0, U+1680, U+2000-U+200A, U+2028, U+2029, U+202F, U+205F, and U+3000; U+FEFF is excluded. This set controls outer normalization, token boundaries, numeric trimming, and `trim`.

Numeric scalar inputs must be finite numbers or finite strings matching the signed decimal/exponent literal grammar after portable trimming. Radix, blank, Boolean, nullish, collection, invalid, and nonfinite inputs are rejected. Every numeric result must be finite or throw `Invalid numeric result`, while zero divisors throw `Division by zero`. Precision for `round` is an integer from 0 through 308; decimal ties round away from zero without relying on a potentially overflowing binary scaling intermediate. Numeric literals and scalar numeric operator results normalize negative zero to zero. A model-supplied `-0` returned by a plain reference passes through unchanged, unlike the Dart and C# scalar value adapters; nested model collections are likewise not copied or normalized.

The seven list-aware numeric operators recursively flatten list arguments in depth-first order and reject cycles encountered during active traversal. Any one expression argument is accepted by the parser, including a scalar-looking expression, but its runtime result must be a list or evaluation throws an error containing `one list argument`. Numeric arguments are evaluated and flattened before scalar conversion. Flattened leaf cardinality determines identities and errors.

Equality follows explicit primitive conversion domains and structural collection domains rather than host loose equality. It is cycle-safe, treats sparse JavaScript array holes as `undefined` in either operand, and does not promise graph-isomorphism semantics for differently shaped cyclic values. String comparisons use ordinal UTF-16 code-unit order; mixed number/valid-decimal-string comparisons are numeric; unsupported values make comparisons false.

List-to-text conversion preserves comma formatting and treats holes and nullish items as empty fields. An active cyclic list throws `Cyclic list value`, while repeated non-active use is allowed. Every list expression evaluation returns a fresh list, including an empty literal. Expression types are validated before cache lookup, and Boolean cache keys intentionally remain shared with their lowercase string forms.

The JSON corpus cannot represent `undefined`, `NaN`, infinity, negative zero, sparse arrays, shared references, or cyclic models. Those behaviors remain implementation-local tests. The adapter preserves an explicitly declared `null` model and validates each case has exactly one expectation field, including `value: null`.
