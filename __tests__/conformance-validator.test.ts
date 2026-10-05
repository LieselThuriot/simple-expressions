import { describe, expect, test } from 'vitest';
import { validateCorpus } from './conformance-validator';

const ok = { id: 'a', expression: 'true', truthy: true };
const corpus = (...cases: unknown[]) => ({ cases });

describe('conformance validator', () => {
    test('accepts a valid corpus', () => {
        expect(validateCorpus(corpus(ok, { id: 'b', expression: '1', value: 1 }, { id: 'c', expression: 'x', error: 'e' }))).toHaveLength(3);
    });

    test.each([
        ['non-object document', []],
        ['unknown top-level field', { cases: [], extra: 1 }],
        ['cases not an array', { cases: {} }],
        ['non-string document comment', { $comment: 'x', cases: [] }],
        ['non-object case', corpus(1)],
        ['unknown case field', corpus({ ...ok, extra: 1 })],
        ['blank id', corpus({ ...ok, id: ' ' })],
        ['non-string expression', corpus({ ...ok, expression: 1 })],
        ['duplicate id', corpus(ok, ok)],
        ['zero expectations', corpus({ id: 'a', expression: 'true' })],
        ['value and truthy', corpus({ ...ok, value: 1 })],
        ['value and error', corpus({ id: 'a', expression: 'x', value: 1, error: 'e' })],
        ['truthy and error', corpus({ ...ok, error: 'e' })],
        ['non-boolean truthy', corpus({ id: 'a', expression: 'x', truthy: 1 })],
        ['non-string error', corpus({ id: 'a', expression: 'x', error: 1 })],
        ['blank error', corpus({ id: 'a', expression: 'x', error: ' ' })],
        ['non-finite value', corpus({ id: 'a', expression: 'x', value: Infinity })],
        ['NaN model', corpus({ ...ok, model: { a: NaN } })],
        ['undefined value', corpus({ id: 'a', expression: 'x', value: undefined })],
    ])('rejects %s', (_name, input) => {
        expect(() => validateCorpus(input)).toThrow();
    });
});
