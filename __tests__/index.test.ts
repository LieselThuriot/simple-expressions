import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import * as se from '..';

beforeEach(() => {
    se.SimpleExpressions.enableCaches();
    se.SimpleExpressions.setCacheLimit(1000);
    se.SimpleExpressions.clear();
});

afterEach(() => {
    se.SimpleExpressions.enableCaches();
    se.SimpleExpressions.setCacheLimit(1000);
    se.SimpleExpressions.clear();
});

describe('basic expressions', () => {
    test('simple true results in true', () => {
        expect(se.executeExpression({}, true)).toBe(true);
    });

    test('simple false results in false', () => {
        expect(se.executeExpression({}, false)).toBe(false);
    });

    test('true results in true', () => {
        expect(se.executeExpression({}, 'true')).toBe(true);
    });

    test('false results in false', () => {
        expect(se.executeExpression({}, 'false')).toBe(false);
    });

    test('and( not(eq(#2, 5)), lt(#2, 10) ) for {"2":2} results in true', () => {
        expect(se.executeExpression({ "2": 2 }, 'and( not(eq(#2, 5)), lt(#2, 10) )')).toBe(true);
    });

    test('and( not(eq(#2, 5)), lt(#2, 10) ) for {"2":12} results in false', () => {
        expect(se.executeExpression({ "2": 12 }, 'and( not(eq(#2, 5)), lt(#2, 10) )')).toBe(false);
    });

    test('true for {} results in true', () => {
        expect(se.executeExpression({}, true)).toBe(true);
    });

    test('false for {} results in false', () => {
        expect(se.executeExpression({}, false)).toBe(false);
    });

    test('or (true, false ) for {} results in true', () => {
        expect(se.executeExpression({}, 'or (true, false )')).toBe(true);
    });

    test('AND (true, false ) for {} results in false', () => {
        expect(se.executeExpression({}, 'AND (true, false )')).toBe(false);
    });

    test('AND and OR accept more than two arguments', () => {
        expect(se.executeExpression({}, 'AND(true, false, true, true, false)')).toBe(false);
        expect(se.executeExpression({}, 'AND(true, true, true, true, true)')).toBe(true);
        expect(se.executeExpression({}, 'OR(false, false, true, false, false)')).toBe(true);
        expect(se.executeExpression({}, 'OR(false, false, false, false, false)')).toBe(false);
    });

    test('AND (true, 0 ) for {} results in false', () => {
        expect(se.executeExpression({}, 'AND (true, 0 )')).toBe(false);
    });

    test('AND (true, "blub" ) for {} results in true', () => {
        expect(se.executeExpression({}, 'AND (true, "blub" )')).toBe(true);
    });

    test('AND (true, not( empty( #text )) ) for {"text":"test"} results in true', () => {
        expect(se.executeExpression({ "text": "test" }, 'AND (true, not( empty( #text )) )')).toBe(true);
    });

    test('AND (true, not( empty( #text )) ) for {"text":""} results in false', () => {
        expect(se.executeExpression({ "text": "" }, 'AND (true, not( empty( #text )) )')).toBe(false);
    });

    test('AND (true, not( empty( #text )) ) for {} results in false', () => {
        expect(se.executeExpression({}, 'AND (true, not( empty( #text )) )')).toBe(false);
    });

    test('AND (true, not( empty( #text.innerText )) ) for {"text":{"innerText":"test"}} results in true', () => {
        expect(se.executeExpression({ "text": { "innerText": "test" } }, 'AND (true, not( empty( #text.innerText )) )')).toBe(true);
    });

    test('AND (true, empty( #text.innerText ) ) for {"text":{"innerText":"test"}} results in false', () => {
        expect(se.executeExpression({ "text": { "innerText": "test" } }, 'AND (true, empty( #text.innerText ) )')).toBe(false);
    });

});

describe('string parsing and boundaries', () => {
    test('Too many quotes throws', () => {
        expect(() => se.executeExpression({}, 'eq("te\\""st", "te\\""st")')).toThrow();
    });

    test('Invalid constant location throws', () => {
        expect(() => se.executeExpression({}, 'eq("test", "test"")')).toThrow();
        expect(() => se.executeExpression({}, 'eq("test", "tes"t")')).toThrow();
        expect(() => se.executeExpression({}, 'eq("te"st", "test")')).toThrow();
        expect(() => se.executeExpression({}, 'eq("test"", "test")')).toThrow();
        expect(() => se.executeExpression({}, 'eq("te""st", "test")')).toThrow();
        expect(() => se.executeExpression({}, 'eq("te""st", "test"""""d")')).toThrow();
        expect(() => se.executeExpression({}, 'eq(",""," ",")')).toThrow();
        expect(() => se.executeExpression({}, 'eq("test", "test\\")')).toThrow();
        expect(() => se.executeExpression({}, 'eq("test\\", "test")')).toThrow();
        expect(() => se.executeExpression({}, 'eq(123, "test\\" " " )')).toThrow();
        expect(() => se.executeExpression({}, 'eq("test\\" " ", 123 )')).toThrow();
    });

    test('Invalid parameters throws', () => {
        expect(() => se.executeExpression({}, 'eq("test", "test", "test")')).toThrow();
        expect(() => se.executeExpression({}, 'not("test", "test")')).toThrow();
    });

    test('Constant boundaries are respected', () => {
        expect(se.executeExpression({}, 'AND(eq("te\\"st", "te\\"st"), not(eq("te,st", "tes,t")))')).toBe(true);
        expect(se.executeExpression({}, 'eq("test", "test\\", \\"test")')).toBe(false);
        expect(se.executeExpression({}, 'eq("test\\", \\"test", "test\\", \\"test")')).toBe(true);
        expect(se.executeExpression({}, 'eq("test", "test\', \'test")')).toBe(false);
        expect(se.executeExpression({}, 'eq("test\', \'test", "test\', \'test")')).toBe(true);
        expect(se.executeExpression({}, 'not(eq("tru\\"e", "tru\\"e"))')).toBe(false);
        expect(se.executeExpression({}, 'eq(",", ",")')).toBe(true);
        expect(se.executeExpression({}, 'eq("\\",\\"", "\\",\\"")')).toBe(true);
        expect(se.executeExpression({}, 'eq("\',\'", "\',\'")')).toBe(true);
        expect(se.executeExpression({}, 'eq(123, "test\\"" )')).toBe(false);
    });

});

describe('regular expressions', () => {
    test('Can match a regex', () => {
        expect(se.executeExpression({ 'test': 'why hello there' }, 'match(#test, "hello")')).toBe(true);
        expect(se.executeExpression({ 'test': 'why hello there' }, 'match(#test, "^hello")')).toBe(false);
        expect(se.executeExpression({ 'test': 'why hello there' }, 'match(#test, "hello$")')).toBe(false);
        expect(se.executeExpression({ 'test': 'hello' }, 'match(#test, "^hello$")')).toBe(true);
        expect(se.executeExpression({ 'test': 'hello' }, 'match(#test, "[a-z]+")')).toBe(true);
        expect(se.executeExpression({ 'test': '12345' }, 'match(#test, "[a-z]+")')).toBe(false);
        expect(se.executeExpression({ 'test': '' }, 'match(#test, "[a-z]+")')).toBe(false);
        expect(se.executeExpression({ 'test': '' }, 'match(#test, ".{0}")')).toBe(true);
        expect(se.executeExpression({}, 'match(#test, ".+")')).toBe(false);
        expect(se.executeExpression({ 'test': '123' }, 'match(#test, "")')).toBe(false);
        expect(se.executeExpression({ 'mail': 'test@test.com' }, 'match(#mail, "^[^@]+@[^@]+\.[^@]+$")')).toBe(true);
        expect(se.executeExpression({ 'mail': 'test@test.com' }, "match(#mail, \"^[^@]+@[^@]+\\.[^@]+$\")")).toBe(true);
        expect(se.executeExpression({ 'mail': 'test@test' }, "match(#mail, '^[^@]+@[^@]+\\.[^@]+$')")).toBe(false);
        expect(se.executeExpression({ 'mail': 'test@test.com' }, "match(#mail, '^[^@]+@[^@]+\.[^@]+$')")).toBe(true);
        expect(se.executeExpression({ 'mail': 'test@test.com' }, 'AND(NOT(EMPTY(#mail)), MATCH(#mail, "^test@test.com$"))')).toBe(true);
        expect(se.executeExpression({ 'form': { 'mail': 'test@test.com' } }, 'AND(NOT(EMPTY(#form.mail)), MATCH(#form.mail, "^test@test.com$"))')).toBe(true);
    });

    test('Can match two regexes', () => {
        expect(se.executeExpression({ 'test': 'why hello there' }, 'and(match(#test, "hello"), match(#test, "there"))')).toBe(true);
    });

    test('Can do complex things', () => {
        expect(se.executeExpression({ 'test': 'why hello there' }, 'and(not(empty(#test)), and(match(#test, "hello"), match(#test, "there")))')).toBe(true);
    });

});

describe('concatenation', () => {
    test('Concatination', () => {
        // These should probably throw since they're not boolean operators.
        // For now we are ok with them returning a boolean in the end result.
        expect(se.executeExpression({}, 'concat("test", "123")')).toBe(true);
        expect(se.parseExpression('concat("a", "b", "c", "d")')({})).toBe('abcd');
        expect(se.parseExpression('concat("a", 0, false, #missing, "b")')({})).toBe('ab');
        expect(se.executeExpression({}, 'concat(#1, #2)')).toBe(false);
        expect(se.executeExpression({ '1': '123' }, 'concat(#1, #2)')).toBe(true);
    });

    test('Concatination allows fancy regexes', () => {
        expect(se.executeExpression({ 'pattern': 'hello there', 'test': 'hello there' }, 'match(#test, concat(concat("^", #pattern), "$"))')).toBe(true);
        expect(se.executeExpression({ 'pattern1': 'hello', 'pattern2': 'there', 'test': 'hello there' }, 'and( match(#test, concat("^", #pattern1)), match(#test, concat(#pattern2, "$")) )')).toBe(true);
        expect(se.executeExpression({ 'pattern1': 'hello', 'pattern2': 'there', 'test': 'hello there' }, 'match(#test, concat(concat(concat(concat("(", #pattern1), ")(?! "), #pattern2), ")"))')).toBe(false);
        expect(se.executeExpression({ 'pattern1': 'hello', 'pattern2': 'there', 'test': 'hello over there' }, 'match(#test, concat(concat(concat(concat("(", #pattern1), ")(?! "), #pattern2), ")"))')).toBe(true);
    });

});

describe('length', () => {
    test('Can test input lengths', () => {
        expect(se.executeExpression({ 'test': 'hello' }, 'lt(len(#test), 10)')).toBe(true);
        expect(se.executeExpression({ 'test': 'hello' }, 'gt(len(#test), 10)')).toBe(false);
        expect(se.executeExpression({ 'test': 'hello' }, 'eq(len(#test), 5)')).toBe(true);
        expect(se.executeExpression({ 'test': 'hello' }, 'len(#test)')).toBe(true);
        expect(se.executeExpression({ 'test': '' }, 'len(#test)')).toBe(false);
        expect(se.executeExpression({ 'test': '' }, 'eq(len(#test), 0)')).toBe(true);
        expect(se.executeExpression({}, 'len(#test)')).toBe(false);
        expect(se.executeExpression({}, 'eq(len(#test), 0)')).toBe(true);
        expect(se.executeExpression({}, 'eq(len("test"), 2)')).toBe(false);
        expect(se.executeExpression({}, 'eq(len("test"), 4)')).toBe(true);
    });

});

describe('model references and logical evaluation', () => {
    test('Nested model references are resolved without flattening', () => {
        expect(se.executeExpression({ form: { address: { city: 'Ghent' } } }, 'eq(#form.address.city, "Ghent")')).toBe(true);
        expect(se.executeExpression({ 'form.address.city': 'literal' }, 'eq(#form.address.city, "literal")')).toBe(true);
        expect(se.executeExpression({ form: {} }, 'empty(#form.address.city)')).toBe(true);
    });

    test('And and or short-circuit the right operand', () => {
        const model = { value: {} };

        expect(() => se.executeExpression(model, 'len(#value)')).toThrow('Input does not have a length');
        expect(se.executeExpression(model, 'and(false, len(#value))')).toBe(false);
        expect(se.executeExpression(model, 'or(true, len(#value))')).toBe(true);
    });

    test('And and or short-circuit later operands', () => {
        const model = { value: {} };

        expect(se.executeExpression(model, 'and(true, true, false, len(#value))')).toBe(false);
        expect(se.executeExpression(model, 'or(false, false, true, len(#value))')).toBe(true);
    });

    test('Or evaluates a truthy or falsey right operand when needed', () => {
        expect(se.executeExpression({}, 'or(false, "value")')).toBe(true);
        expect(se.executeExpression({}, 'or(false, 0)')).toBe(false);
    });

});

describe('malformed expressions', () => {
    test('Malformed expressions are rejected', () => {
        expect(() => se.executeExpression({}, 'eq(1foo, 1)')).toThrow();
        expect(() => se.executeExpression({}, 'eq(1, 2, 3)')).toThrow();
        expect(() => se.executeExpression({}, 'not(true, false)')).toThrow();
        expect(() => se.executeExpression({}, 'eq(1, 2) trailing')).toThrow();
        expect(() => se.executeExpression({}, 'eq((1), 1)')).toThrow();
    });

});

describe('operators', () => {
    test('contains is case-sensitive and only accepts string input', () => {
        expect(se.executeExpression({ value: 'Hello world' }, 'contains(#value, "world")')).toBe(true);
        expect(se.executeExpression({ value: 'Hello world' }, 'contains(#value, "World")')).toBe(false);
        expect(se.executeExpression({ value: 12345 }, 'contains(#value, "23")')).toBe(false);
    });

    test('startswith and endswith are case-sensitive and only accept string input', () => {
        expect(se.executeExpression({ value: 'Hello world' }, 'startswith(#value, "Hello")')).toBe(true);
        expect(se.executeExpression({ value: 'Hello world' }, 'startswith(#value, "hello")')).toBe(false);
        expect(se.executeExpression({ value: 'Hello world' }, 'endswith(#value, "world")')).toBe(true);
        expect(se.executeExpression({ value: 'Hello world' }, 'endswith(#value, "World")')).toBe(false);
        expect(se.executeExpression({ value: 12345 }, 'startswith(#value, "12")')).toBe(false);
        expect(se.executeExpression({ value: 12345 }, 'endswith(#value, "45")')).toBe(false);
    });

    test('lower and upper coerce values to strings', () => {
        expect(se.parseExpression('lower("Hello WORLD")')({})).toBe('hello world');
        expect(se.parseExpression('upper("Hello world")')({})).toBe('HELLO WORLD');
        expect(se.parseExpression('lower(123)')({})).toBe('123');
        expect(se.parseExpression('upper(true)')({})).toBe('TRUE');
        expect(se.parseExpression('lower(0)')({})).toBe('');
        expect(se.parseExpression('upper(false)')({})).toBe('');
        expect(se.parseExpression('lower(#missing)')({})).toBe('');
    });

    test('if evaluates only the selected branch and preserves its value', () => {
        expect(se.parseExpression('if(true, "yes", len(#value))')({ value: {} })).toBe('yes');
        expect(se.parseExpression('if(false, len(#value), "no")')({ value: {} })).toBe('no');
        expect(se.executeExpression({}, 'if(eq(1, 1), 0, 1)')).toBe(false);
    });

    test('new operators are case-insensitive', () => {
        expect(se.executeExpression({}, 'STARTSWITH("Hello", "He")')).toBe(true);
        expect(se.executeExpression({}, 'ENDSWITH("Hello", "lo")')).toBe(true);
        expect(se.parseExpression('LOWER("Hello")')({})).toBe('hello');
        expect(se.parseExpression('UPPER("Hello")')({})).toBe('HELLO');
        expect(se.parseExpression('IF(true, "yes", "no")')({})).toBe('yes');
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

    test('does not resolve inherited properties', () => {
        const model = Object.create({ value: 'inherited' });

        expect(se.parseExpression('#value')(model)).toBeUndefined();
        expect(se.parseExpression('#value.child')({ value: Object.create({ child: 'inherited' }) })).toBeUndefined();
    });

    test('rejects prototype-chain reference segments', () => {
        expect(() => se.parseExpression('#__proto__')).toThrow('invalid model reference');
        expect(() => se.parseExpression('#value.constructor')).toThrow('invalid model reference');
        expect(() => se.parseExpression('#value.prototype.name')).toThrow('invalid model reference');
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
        'and(true)',
        'or(false)',
        'concat("value")',
        'eq(1 2)',
        'eq(1, 2',
        'eq(1, 2))',
        'xor(true, false)',
        'lower("value", "extra")',
        'startswith("value")',
        'if(true, 1)',
        'if(true, 1, 2, 3)',
        'eq(1, 2)\ttrailing'
    ])('rejects malformed expression %j', (expression) => {
        expect(() => se.executeExpression({}, expression)).toThrow();
    });

    test('rejects unsupported constructor input and unterminated strings', () => {
        expect(() => new se.SimpleExpression(123)).toThrow('unsupported type');
        expect(() => se.executeExpression({}, 123 as unknown as string)).toThrow('unsupported type');
        expect(() => se.SimpleExpressions.get(123 as unknown as string)).toThrow('unsupported type');
        expect(() => se.parseExpression('"unterminated')).toThrow('unterminated string');
    });
});
