import { beforeEach, describe, expect, test } from 'vitest';
import * as se from '../src/index';

beforeEach(() => {
    se.SimpleExpressions.clear();
});

describe('operators', () => {
    test('contains is case-sensitive and only accepts string input', () => {
        expect(se.executeExpression({ value: 'Hello world' }, 'contains(#value, "world")')).toBe(true);
        expect(se.executeExpression({ value: 'Hello world' }, 'contains(#value, "World")')).toBe(false);
        expect(se.executeExpression({ value: 12345 }, 'contains(#value, "23")')).toBe(false);
    });

    test('comparison operators preserve loose equality and JavaScript ordering', () => {
        expect(se.executeExpression({}, 'eq(1, "1")')).toBe(true);
        expect(se.executeExpression({}, 'eq(false, 0)')).toBe(true);
        expect(se.executeExpression({}, 'gt(10, 2)')).toBe(true);
        expect(se.executeExpression({}, 'lt("a", "b")')).toBe(true);
        expect(se.executeExpression({}, 'gt(2, 2)')).toBe(false);
        expect(se.executeExpression({}, 'lt(2, 2)')).toBe(false);
    });

    test('empty distinguishes falsey values from empty values', () => {
        expect(se.executeExpression({ value: null }, 'empty(#value)')).toBe(true);
        expect(se.executeExpression({}, 'empty(#value)')).toBe(true);
        expect(se.executeExpression({ value: '' }, 'empty(#value)')).toBe(true);
        expect(se.executeExpression({ value: 0 }, 'empty(#value)')).toBe(false);
        expect(se.executeExpression({ value: false }, 'empty(#value)')).toBe(false);
        expect(se.executeExpression({ value: [] }, 'empty(#value)')).toBe(false);
        expect(se.executeExpression({ value: {} }, 'empty(#value)')).toBe(false);
    });

    test('len supports strings, arrays, and own length properties', () => {
        expect(se.executeExpression({ value: [1, 2, 3] }, 'eq(len(#value), 3)')).toBe(true);
        expect(se.executeExpression({ value: { length: 4 } }, 'eq(len(#value), 4)')).toBe(true);
        expect(() => se.executeExpression({ value: Object.create({ length: 4 }) }, 'len(#value)')).toThrow('Input does not have a length');
        expect(() => se.executeExpression({ value: {} }, 'len(#value)')).toThrow('Input does not have a length');
    });

    test('concat stringifies truthy values and ignores falsey values', () => {
        expect(se.parseExpression('concat("value", 12)')({})).toBe('value12');
        expect(se.parseExpression('concat(0, false)')({})).toBe('');
        expect(se.parseExpression('concat(#missing, "value")')({})).toBe('value');
        expect(se.parseExpression('concat(true, #value)')({ value: 5 })).toBe('true5');
    });
});

describe('numbers and strings', () => {
    test('accepts signed, decimal, and exponent numeric literals', () => {
        expect(se.parseExpression('+12')({})).toBe(12);
        expect(se.parseExpression('-.5')({})).toBe(-0.5);
        expect(se.parseExpression('1.')({})).toBe(1);
        expect(se.parseExpression('1e3')({})).toBe(1000);
        expect(se.parseExpression('-2.5E-2')({})).toBe(-0.025);
        expect(Object.is(se.parseExpression('-0')({}), -0)).toBe(true);
    });

    test('accepts all supported quoted string delimiters', () => {
        expect(se.parseExpression('"double"')({})).toBe('double');
        expect(se.parseExpression("'single'")({})).toBe('single');
        expect(se.parseExpression('`backtick`')({})).toBe('backtick');
    });

    test('rejects malformed numeric-like tokens and bare identifiers', () => {
        expect(() => se.parseExpression('1foo')).toThrow();
        expect(() => se.parseExpression('foo1')).toThrow();
        expect(() => se.parseExpression('_value')).toThrow();
        expect(() => se.parseExpression('hello')).toThrow('invalid operator: hello');
    });
});

describe('regular expressions', () => {
    test('accepts a pattern from the model and evaluates it per model', () => {
        const expression = se.parseExpression('match(#value, #pattern)');

        expect(expression({ value: 'hello', pattern: '^hello$' })).toBe(true);
        expect(expression({ value: 'goodbye', pattern: '^hello$' })).toBe(false);
    });

    test('returns false for empty or non-string patterns', () => {
        expect(se.executeExpression({ value: 'hello', pattern: '' }, 'match(#value, #pattern)')).toBe(false);
        expect(se.executeExpression({ value: 'hello', pattern: 123 }, 'match(#value, #pattern)')).toBe(false);
        expect(se.executeExpression({ value: 'hello' }, 'match(#value, 0)')).toBe(false);
    });

    test('converts falsey input values to an empty regex input', () => {
        const expression = 'match(#value, ".{0}")';

        expect(se.executeExpression({ value: 0 }, expression)).toBe(true);
        expect(se.executeExpression({ value: false }, expression)).toBe(true);
        expect(se.executeExpression({ value: null }, expression)).toBe(true);
        expect(se.executeExpression({}, expression)).toBe(true);
    });

    test('rejects invalid constant and runtime patterns', () => {
        expect(() => se.parseExpression('match("value", "[")')).toThrow();

        const expression = se.parseExpression('match(#value, #pattern)');
        expect(() => expression({ value: 'value', pattern: '[' })).toThrow();
    });

    test('reuses a constant pattern for repeated evaluations', () => {
        const expression = se.parseExpression('match(#value, "hello")');

        expect(expression({ value: 'hello' })).toBe(true);
        expect(expression({ value: 'goodbye' })).toBe(false);
        expect(expression({ value: 'hello again' })).toBe(true);
    });
});

describe('model references', () => {
    test('handles null models and null intermediate properties', () => {
        expect(se.executeExpression(null, 'empty(#value)')).toBe(true);
        expect(se.executeExpression({ value: null }, 'empty(#value.child)')).toBe(true);
        expect(se.executeExpression({ value: { child: null } }, 'empty(#value.child)')).toBe(true);
    });

    test('prefers an own dotted key over traversing nested properties', () => {
        const expression = se.parseExpression('#value.child');

        expect(expression({ value: { child: 'nested' }, 'value.child': 'direct' })).toBe('direct');
        expect(expression({ value: { child: 'nested' }, 'value.child': undefined })).toBeUndefined();
    });

    test('resolves inherited properties for single-segment references', () => {
        const model = Object.create({ value: 'inherited' });

        expect(se.parseExpression('#value')(model)).toBe('inherited');
    });

    test('rejects empty or malformed model references', () => {
        expect(() => se.parseExpression('#')).toThrow('missing model reference');
        expect(() => se.parseExpression('#.value')).toThrow('invalid model reference');
        expect(() => se.parseExpression('#value.')).toThrow('invalid model reference');
        expect(() => se.parseExpression('#value..child')).toThrow('invalid model reference');
    });
});

describe('parser validation', () => {
    test.each([
        '',
        '   ',
        'not()',
        'eq(1)',
        'eq(1,)',
        'eq(,1)',
        'eq(1 2)',
        'eq(1, 2',
        'eq(1, 2))',
        'xor(true, false)',
        'eq(1, 2)\ttrailing'
    ])('rejects malformed expression %j', (expression) => {
        expect(() => se.executeExpression({}, expression)).toThrow();
    });

    test('rejects unsupported constructor input and unterminated strings', () => {
        expect(() => new se.SimpleExpression(123)).toThrow('unsupported type');
        expect(() => se.parseExpression('"unterminated')).toThrow('unterminated string');
    });
});

describe('public APIs and caches', () => {
    test('parseExpression returns raw values while public evaluation coerces to boolean', () => {
        expect(se.parseExpression('len("hello")')({})).toBe(5);
        expect(se.executeExpression({}, 'len("hello")')).toBe(true);
        expect(new se.SimpleExpression(false).evaluate({})).toBe(false);
        expect(new se.SimpleExpression('true').evaluate({})).toBe(true);
    });

    test('normalizes whitespace before caching parsed expressions', () => {
        const first = se.parseExpression(' true ');
        const second = se.parseExpression('true');

        expect(first).toBe(second);
        expect(first({})).toBe(true);
    });

    test('clear can invalidate parsed and expression caches independently', () => {
        const parsed = se.parseExpression('true');
        const expression = se.SimpleExpressions.get('true');

        se.SimpleExpressions.clear({ parsed: true });
        expect(se.parseExpression('true')).not.toBe(parsed);
        expect(se.SimpleExpressions.get('true')).toBe(expression);

        se.SimpleExpressions.clear({ expression: true });
        expect(se.SimpleExpressions.get('true')).not.toBe(expression);
    });

    test('disabling caches creates fresh parsed and expression instances', () => {
        const parsed = se.parseExpression('true');
        const expression = se.SimpleExpressions.get('true');

        se.SimpleExpressions.disableCaches();
        expect(se.parseExpression('true')).not.toBe(parsed);
        expect(se.SimpleExpressions.get('true')).not.toBe(expression);
    });

    test('cached evaluators continue to use the model passed at evaluation time', () => {
        const expression = se.parseExpression('#value');

        expect(expression({ value: 'first' })).toBe('first');
        expect(expression({ value: 'second' })).toBe('second');
    });
});
