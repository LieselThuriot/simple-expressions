export interface OperatorDefinition {
    name: string;
    signature: string;
    detail: string;
    arity: 1 | 2 | 3 | 'variadic';
    category: OperatorCategory;
    description: string;
}

export type OperatorCategory = 'Logic and comparison' | 'Text and collections' | 'Conversion and numeric' | 'Arithmetic' | 'Conditional and matching';

export const operatorDefinitions: readonly OperatorDefinition[] = [
    { name: 'not', signature: 'not(value)', detail: '1 argument', arity: 1, category: 'Logic and comparison', description: 'Logical negation' },
    { name: 'eq', signature: 'eq(left, right)', detail: '2 arguments', arity: 2, category: 'Logic and comparison', description: 'Loose equality; lists and objects compare structurally' },
    { name: 'or', signature: 'or(a, b, ...)', detail: '2+ arguments', arity: 'variadic', category: 'Logic and comparison', description: 'Logical OR, short-circuits' },
    { name: 'and', signature: 'and(a, b, ...)', detail: '2+ arguments', arity: 'variadic', category: 'Logic and comparison', description: 'Logical AND, short-circuits' },
    { name: 'gt', signature: 'gt(left, right)', detail: '2 arguments', arity: 2, category: 'Logic and comparison', description: 'Greater-than comparison' },
    { name: 'lt', signature: 'lt(left, right)', detail: '2 arguments', arity: 2, category: 'Logic and comparison', description: 'Less-than comparison' },
    { name: 'contains', signature: 'contains(text, part)', detail: '2 arguments', arity: 2, category: 'Text and collections', description: 'True if text contains part' },
    { name: 'startswith', signature: 'startswith(text, prefix)', detail: '2 arguments', arity: 2, category: 'Text and collections', description: 'True if text starts with prefix' },
    { name: 'endswith', signature: 'endswith(text, suffix)', detail: '2 arguments', arity: 2, category: 'Text and collections', description: 'True if text ends with suffix' },
    { name: 'in', signature: 'in(value, list)', detail: '2 arguments', arity: 2, category: 'Text and collections', description: 'True if value is in a list' },
    { name: 'empty', signature: 'empty(value)', detail: '1 argument', arity: 1, category: 'Text and collections', description: 'True for null, undefined, and empty strings' },
    { name: 'len', signature: 'len(value)', detail: '1 argument', arity: 1, category: 'Text and collections', description: '0 for nullish values, otherwise string length or own length property' },
    { name: 'lower', signature: 'lower(value)', detail: '1 argument', arity: 1, category: 'Text and collections', description: 'Converts to lowercase; falsy values become empty strings' },
    { name: 'upper', signature: 'upper(value)', detail: '1 argument', arity: 1, category: 'Text and collections', description: 'Converts to uppercase; falsy values become empty strings' },
    { name: 'trim', signature: 'trim(value)', detail: '1 argument', arity: 1, category: 'Text and collections', description: 'Trims surrounding whitespace; nullish values remain unchanged' },
    { name: 'defined', signature: 'defined(value)', detail: '1 argument', arity: 1, category: 'Conversion and numeric', description: 'True unless the value is null or undefined' },
    { name: 'int', signature: 'int(value)', detail: '1 argument', arity: 1, category: 'Conversion and numeric', description: 'Strictly converts to a number, then truncates toward zero' },
    { name: 'num', signature: 'num(value)', detail: '1 argument', arity: 1, category: 'Conversion and numeric', description: 'Strictly converts a value to a number' },
    { name: 'abs', signature: 'abs(value)', detail: '1 argument', arity: 1, category: 'Conversion and numeric', description: 'Returns the absolute value after strict conversion' },
    { name: 'floor', signature: 'floor(value)', detail: '1 argument', arity: 1, category: 'Conversion and numeric', description: 'Rounds down after strict numeric conversion' },
    { name: 'ceil', signature: 'ceil(value)', detail: '1 argument', arity: 1, category: 'Conversion and numeric', description: 'Rounds up after strict numeric conversion' },
    { name: 'sqrt', signature: 'sqrt(value)', detail: '1 argument', arity: 1, category: 'Conversion and numeric', description: 'Returns the square root after strict conversion' },
    { name: 'concat', signature: 'concat(a, b, ...)', detail: '2+ arguments', arity: 'variadic', category: 'Text and collections', description: 'Concatenates values; falsy values become empty strings' },
    { name: 'add', signature: 'add(a, b, ...)', detail: '2+ arguments or 1 list', arity: 'variadic', category: 'Arithmetic', description: 'Adds strictly converted values; lists expand one level' },
    { name: 'sub', signature: 'sub(a, b, ...)', detail: '2+ arguments', arity: 'variadic', category: 'Arithmetic', description: 'Subtracts strictly converted values from left to right' },
    { name: 'mul', signature: 'mul(a, b, ...)', detail: '2+ arguments or 1 list', arity: 'variadic', category: 'Arithmetic', description: 'Multiplies strictly converted values; lists expand one level' },
    { name: 'div', signature: 'div(a, b, ...)', detail: '2+ arguments', arity: 'variadic', category: 'Arithmetic', description: 'Divides strictly converted values; zero divisors throw' },
    { name: 'mod', signature: 'mod(a, b, ...)', detail: '2+ arguments', arity: 'variadic', category: 'Arithmetic', description: 'Calculates the remainder; zero divisors throw' },
    { name: 'min', signature: 'min(a, b, ...)', detail: '2+ arguments or 1 list', arity: 'variadic', category: 'Arithmetic', description: 'Returns the smallest strictly converted value; lists expand one level' },
    { name: 'max', signature: 'max(a, b, ...)', detail: '2+ arguments or 1 list', arity: 'variadic', category: 'Arithmetic', description: 'Returns the largest strictly converted value; lists expand one level' },
    { name: 'round', signature: 'round(value, decimals)', detail: '2 arguments', arity: 2, category: 'Arithmetic', description: 'Rounds strictly converted values to decimal places' },
    { name: 'pow', signature: 'pow(value, exponent)', detail: '2 arguments', arity: 2, category: 'Arithmetic', description: 'Raises strictly converted values to a power' },
    { name: 'clamp', signature: 'clamp(value, minimum, maximum)', detail: '3 arguments', arity: 3, category: 'Arithmetic', description: 'Constrains strictly converted values to a range' },
    { name: 'match', signature: 'match(value, pattern)', detail: '2 arguments', arity: 2, category: 'Conditional and matching', description: 'Tests a value against a non-empty JavaScript regex pattern' },
    { name: 'if', signature: 'if(test, yes, no)', detail: '3 arguments', arity: 3, category: 'Conditional and matching', description: 'Returns yes or no based on a condition; evaluates one branch only' }
];

export const heroSnippet = `npm install simple-expressions

const { executeExpression, parseExpression } = require('simple-expressions');

const model = { user: { name: 'Ada' }, score: 8 };

executeExpression(model, 'gt(#score, 5)');              // -> true
parseExpression('concat("Hi, ", #user.name)')(model);  // -> "Hi, Ada"`;

export const usageSnippet = `// typed result (preserves value type)
const evaluate = parseExpression(expression);
const result   = evaluate(model);

// boolean coercion
const match = executeExpression(model, expression);`;
