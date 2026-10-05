import { describe, expect, test } from 'vitest';
import { parseExpression } from '..';

const evaluate = (expression: string, model: Record<string, any> = {}): any => parseExpression(expression)(model);

describe('numeric scalar validation', () => {
    test.each([
        'int(#value)', 'num(#value)', 'abs(#value)', 'floor(#value)', 'ceil(#value)', 'sqrt(#value)',
        'round(#value, 2)', 'round(1, #value)', 'pow(#value, 2)', 'pow(2, #value)',
        'clamp(#value, 0, 2)', 'clamp(1, #value, 2)', 'clamp(1, 0, #value)',
        'add(#value, 1)', 'sub(#value, 1)', 'mul(#value, 1)', 'div(#value, 1)',
        'mod(#value, 1)', 'min(#value, 1)', 'max(#value, 1)'
    ])('%s rejects nonnumeric scalar inputs', (expression) => {
        const invalidValues = [true, false, null, undefined, {}, ' ', 'nope', NaN, Infinity, -Infinity];
        for (const value of invalidValues) {
            expect(() => evaluate(expression, { value }), `${expression} should reject ${String(value)}`).toThrow('Invalid numeric value');
        }
    });

    test.each(['int', 'num', 'abs', 'floor', 'ceil', 'sqrt'])('%s rejects a list scalar input', (operator) => {
        expect(() => evaluate(`${operator}(#value)`, { value: [] })).toThrow('Invalid numeric value');
    });

    test('accepts finite numbers and finite numeric strings', () => {
        expect(evaluate('add(#values)', { values: [1, ' 2.5 ', '-3e1', '.5', '5.'] })).toBe(-21);
    });

    test.each(['0x10', '0Xff', '0b10', '0o10', '.', '+', '1_000', '1e', '1e309', '\ufeff1\ufeff'])('rejects non-decimal or nonfinite string %s', (value) => {
        expect(() => evaluate('num(#value)', { value })).toThrow('Invalid numeric value');
    });

    test('rejects a nonfinite numeric literal', () => {
        expect(() => parseExpression('1e309')).toThrow('Invalid numeric value');
    });

    test.each([
        'sqrt(-1)',
        'pow(1e308, 2)',
        'add(1e308, 1e308)',
        'sub(-1e308, 1e308)',
        'mul(1e308, 1e308)',
        'div(1e308, 1e-308)'
    ])('rejects a nonfinite numeric result: %s', (expression) => {
        expect(() => evaluate(expression)).toThrow('Invalid numeric result');
    });

    test('retains the specific zero-divisor error after a nonfinite intermediate', () => {
        expect(() => evaluate('div(1e308, 1e-308, 0)')).toThrow('Division by zero');
        expect(() => evaluate('mod(1e308, 0)')).toThrow('Division by zero');
    });

    test('evaluates and flattens every argument before converting numeric leaves', () => {
        expect(() => evaluate('add("invalid", sqrt(-1))')).toThrow('Invalid numeric result');
    });
});

describe('arithmetic list expansion', () => {
    test.each([
        ['add', 10], ['sub', -8], ['mul', 24], ['div', 0.041666666666666664], ['mod', 1], ['min', 1], ['max', 4]
    ] as const)('%s recursively flattens arguments depth-first', (operator, expected) => {
        expect(evaluate(`${operator}(#values)`, { values: [1, [2, [3]], 4] })).toBe(expected);
    });

    test('accepts list-producing references and expressions as single arguments', () => {
        const model = { values: [1, [2, 3]], fallback: [4, 5] };
        expect(evaluate('add(#values)', model)).toBe(6);
        expect(evaluate('add(if(true, #values, #fallback))', model)).toBe(6);
        expect(evaluate('mul(if(false, #values, #fallback))', model)).toBe(20);
    });

    test('applies flattened cardinality and identity rules', () => {
        expect(evaluate('add([])')).toBe(0);
        expect(evaluate('mul([])')).toBe(1);
        expect(() => evaluate('sub([1])')).toThrow('Sub requires at least two values');
        expect(() => evaluate('div([1, []])')).toThrow('Div requires at least two values');
        expect(() => evaluate('mod([[], 1])')).toThrow('Mod requires at least two values');
        expect(() => evaluate('min([])')).toThrow('Min requires at least one value');
        expect(() => evaluate('max([])')).toThrow('Max requires at least one value');
    });

    test.each(['add', 'sub', 'mul', 'div', 'mod', 'min', 'max'])('%s rejects one scalar syntactic argument at runtime', (operator) => {
        expect(() => evaluate(`${operator}(1)`)).toThrow(`operator ${operator} expects at least two arguments or one list argument`);
    });

    test('rejects cyclic arrays but permits repeated noncyclic arrays', () => {
        const cycle: any[] = [1];
        cycle.push(cycle);
        const shared = [2, 3];

        expect(() => evaluate('add(#values)', { values: cycle })).toThrow('Invalid numeric value');
        expect(evaluate('add(#values)', { values: [shared, shared] })).toBe(10);
    });
});

describe('negative zero', () => {
    test.each(['-0', 'round(-0.4, 0)', 'mul(-1, 0)', 'ceil(-0.5)', 'min(#positive, #negative)', 'max(#negative, #positive)'])('%s normalizes -0 to 0', (expression) => {
        const model = { positive: 0, negative: -0 };
        const result = evaluate(expression, model);
        expect(result).toBe(0);
        expect(Object.is(result, -0)).toBe(false);
    });

    // Documented divergence: the ports normalize model-supplied -0 at value construction.
    test('a plain reference passes a model-supplied -0 through unchanged', () => {
        expect(Object.is(evaluate('#value', { value: -0 }), -0)).toBe(true);
    });
});

describe('rounding', () => {
    test.each([
        ['round(0.5, 0)', 1],
        ['round(-0.5, 0)', -1],
        ['round(2.5, 0)', 3],
        ['round(-2.5, 0)', -3],
        ['round(1.25, 1)', 1.3],
        ['round(-1.25, 1)', -1.3],
        ['round(1.005, 2)', 1],
        ['round(-1.005, 2)', -1],
        ['round(1.0049999999999997, 2)', 1],
        ['round(1.0050000000000001, 2)', 1.01],
        ['round(7.164692098702749e-215, 230)', 7.164692098702749e-215],
        ['round(4.898568327955125e-190, 204)', 4.89856832795512e-190],
        ['round(6.663776354903525e-38, 52)', 6.66377635490352e-38],
        ['round(1e308, 308)', 1e308],
        ['round(5e-324, 308)', 0]
    ])('%s rounds robustly to %s', (expression, expected) => {
        expect(evaluate(expression)).toBe(expected);
    });

    test.each([-1, 0.5, 309])('rejects invalid precision %s', (precision) => {
        expect(() => evaluate('round(1, #precision)', { precision })).toThrow('Round precision');
    });
});

describe('regex compilation', () => {
    test('eagerly compiles constant patterns in unselected branches', () => {
        expect(() => parseExpression('if(true, true, match("value", "["))')).toThrow();
    });
});
