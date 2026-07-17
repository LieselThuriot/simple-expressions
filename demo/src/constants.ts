export interface OperatorDefinition {
    name: string;
    signature: string;
    detail: string;
    description: string;
}

export const operatorDefinitions: readonly OperatorDefinition[] = [
    { name: 'not', signature: 'not(value)', detail: '1 argument', description: 'Logical negation' },
    { name: 'eq', signature: 'eq(left, right)', detail: '2 arguments', description: 'Loose equality (==)' },
    { name: 'or', signature: 'or(a, b, ...)', detail: '2+ arguments', description: 'Logical OR, short-circuits' },
    { name: 'and', signature: 'and(a, b, ...)', detail: '2+ arguments', description: 'Logical AND, short-circuits' },
    { name: 'contains', signature: 'contains(text, part)', detail: '2 arguments', description: 'True if text contains part' },
    { name: 'startswith', signature: 'startswith(text, prefix)', detail: '2 arguments', description: 'True if text starts with prefix' },
    { name: 'endswith', signature: 'endswith(text, suffix)', detail: '2 arguments', description: 'True if text ends with suffix' },
    { name: 'gt', signature: 'gt(left, right)', detail: '2 arguments', description: 'Greater-than comparison' },
    { name: 'lt', signature: 'lt(left, right)', detail: '2 arguments', description: 'Less-than comparison' },
    { name: 'empty', signature: 'empty(value)', detail: '1 argument', description: 'True for null, undefined, and empty strings' },
    { name: 'len', signature: 'len(value)', detail: '1 argument', description: 'String length or own length property' },
    { name: 'lower', signature: 'lower(value)', detail: '1 argument', description: 'Converts to lowercase; falsy values become empty strings' },
    { name: 'upper', signature: 'upper(value)', detail: '1 argument', description: 'Converts to uppercase; falsy values become empty strings' },
    { name: 'concat', signature: 'concat(a, b, ...)', detail: '2+ arguments', description: 'Concatenates values; falsy values become empty strings' },
    { name: 'match', signature: 'match(value, pattern)', detail: '2 arguments', description: 'Tests a value against a JavaScript regex pattern' },
    { name: 'if', signature: 'if(test, yes, no)', detail: '3 arguments', description: 'Returns yes or no based on a condition; evaluates one branch only' }
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
