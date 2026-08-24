# Conformance

Cross-language compatibility is specified and tested by the independent [simple-expressions-conformance](https://github.com/LieselThuriot/simple-expressions-conformance) repository.

The pinned `__tests__/conformance/` submodule supplies `spec/v1/cases.json`, which is executed by `__tests__/conformance.test.ts`. Initialize it with `git submodule update --init --recursive`. The test reads the corpus in place and does not copy files from the submodule.

The conformance suite is the minimum shared test set. The additional local tests cover this repository's demo helpers and are not part of the cross-language count.

This implementation supports conformance specification v1. Numeric scalar inputs must be finite numbers or finite numeric strings, while final numeric results may be nonfinite. An outer numeric operator rejects a nonfinite inner result. Arithmetic operators recursively flatten list arguments, accept one syntactic argument only when it evaluates to a list, and reject cycles encountered during active traversal. Equality is structural and cycle-safe, but does not promise graph-isomorphism semantics for differently shaped cyclic values.

The JSON corpus cannot represent `undefined`, nonfinite numbers, shared references, or cyclic models. Those behaviors remain implementation-local tests. The adapter preserves an explicitly declared `null` model and validates each case has exactly one expectation field, including `value: null`.
