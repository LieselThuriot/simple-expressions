import { beforeEach, describe, expect, test } from 'vitest';
import * as se from '..';
import { executeExpression } from '..';

beforeEach(() => {
    se.SimpleExpressions.enableCaches();
    se.SimpleExpressions.setCacheLimit(1000);
    se.SimpleExpressions.clear();
});

describe('structural equality', () => {
    test('handles cyclic objects without a depth limit', () => {
        const left: { value: number; self?: unknown } = { value: 1 };
        const right: { value: number; self?: unknown } = { value: 1 };
        left.self = left;
        right.self = right;

        expect(executeExpression({ left, right }, 'eq(#left, #right)')).toBe(true);
    });
});

describe('cache lifecycle', () => {
    test('positive cache limits do not re-enable caching', () => {
        se.SimpleExpressions.disableCaches();
        se.SimpleExpressions.setCacheLimit(10);

        expect(se.SimpleExpressions.get('true')).not.toBe(se.SimpleExpressions.get('true'));
    });

    test.each([0, -1])('invalid cache limit %s throws without changing cache state', (limit) => {
        expect(() => se.SimpleExpressions.setCacheLimit(limit)).toThrow('Cache limit must be at least 1');

        se.SimpleExpressions.enableCaches();
        expect(() => se.SimpleExpressions.setCacheLimit(limit)).toThrow('Cache limit must be at least 1');
        expect(se.SimpleExpressions.get('true')).toBe(se.SimpleExpressions.get('true'));
    });
});
