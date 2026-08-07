# Conformance

Cross-language compatibility is specified and tested by the independent [simple-expressions-conformance](https://github.com/LieselThuriot/simple-expressions-conformance) repository.

The pinned `conformance/` submodule supplies `spec/v1/cases.json`, which is executed by `__tests__/conformance.test.ts`. Initialize it with `git submodule update --init --recursive`. The test reads the corpus in place and does not copy files from the submodule.

The conformance suite is the minimum shared test set. The additional local tests cover this repository's demo helpers and are not part of the cross-language count.
