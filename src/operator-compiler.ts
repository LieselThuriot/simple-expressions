import {
    Evaluator,
    abs,
    ceil,
    clamp,
    concat,
    constantEvaluator,
    contains,
    defined,
    empty,
    endsWith,
    equals,
    evaluateCompiledRegex,
    evaluateRegex,
    expandNumericValues,
    floor,
    greaterThan,
    inList,
    int,
    len,
    lessThan,
    lower,
    num,
    power,
    round,
    sqrt,
    startsWith,
    toNumber,
    trim,
    upper
} from './runtime';

export type OperatorArity = 1 | 2 | 3 | 'variadic';

export const getOperatorArity = (operator: string): OperatorArity | undefined => {
    switch (operator) {
        case 'not':
        case 'empty':
        case 'len':
        case 'lower':
        case 'upper':
        case 'trim':
        case 'defined':
        case 'int':
        case 'num':
        case 'abs':
        case 'floor':
        case 'ceil':
        case 'sqrt':
            return 1;
        case 'eq':
        case 'contains':
        case 'startswith':
        case 'endswith':
        case 'gt':
        case 'lt':
        case 'match':
        case 'in':
        case 'round':
        case 'pow':
            return 2;
        case 'clamp':
        case 'if':
            return 3;
        case 'or':
        case 'and':
        case 'concat':
        case 'add':
        case 'sub':
        case 'mul':
        case 'div':
        case 'mod':
        case 'min':
        case 'max':
            return 'variadic';
        default:
            return undefined;
    }
};

export const supportsSingleListArgument = (operator: string): boolean => {
    return operator === 'add' || operator === 'mul' || operator === 'min' || operator === 'max';
};

const compileUnary = (operator: string, inner: Evaluator): Evaluator => {
    switch (operator) {
        case 'not':
            return (model) => !inner(model);
        case 'empty':
            return (model) => empty(inner(model));
        case 'len':
            return (model) => len(inner(model));
        case 'lower':
            return (model) => lower(inner(model));
        case 'upper':
            return (model) => upper(inner(model));
        case 'trim':
            return (model) => trim(inner(model));
        case 'defined':
            return (model) => defined(inner(model));
        case 'int':
            return (model) => int(inner(model));
        case 'num':
            return (model) => num(inner(model));
        case 'abs':
            return (model) => abs(inner(model));
        case 'floor':
            return (model) => floor(inner(model));
        case 'ceil':
            return (model) => ceil(inner(model));
        case 'sqrt':
            return (model) => sqrt(inner(model));
        default:
            throw new Error('Invalid Expression: invalid operator: ' + operator);
    }
};

const compileBinary = (operator: string, left: Evaluator, right: Evaluator): Evaluator => {
    switch (operator) {
        case 'eq':
            return (model) => equals(left(model), right(model));
        case 'contains':
            return (model) => contains(left(model), right(model));
        case 'startswith':
            return (model) => startsWith(left(model), right(model));
        case 'endswith':
            return (model) => endsWith(left(model), right(model));
        case 'in':
            return (model) => inList(left(model), right(model));
        case 'gt':
            return (model) => greaterThan(left(model), right(model));
        case 'lt':
            return (model) => lessThan(left(model), right(model));
        case 'match':
            if (right.hasConstantValue && !!right.constantValue && typeof right.constantValue === 'string') {
                const regex = new RegExp(right.constantValue);
                return (model) => evaluateCompiledRegex(left(model), regex);
            }
            return (model) => evaluateRegex(left(model), right(model));
        case 'round':
            return (model) => round(left(model), right(model));
        case 'pow':
            return (model) => power(left(model), right(model));
        default:
            throw new Error('Invalid Expression: invalid operator: ' + operator);
    }
};

const compileVariadic = (operator: string, values: Evaluator[]): Evaluator => {
    switch (operator) {
        case 'or':
            return (model) => {
                for (const value of values) {
                    if (!!value(model)) {
                        return true;
                    }
                }
                return false;
            };
        case 'and':
            return (model) => {
                for (const value of values) {
                    if (!value(model)) {
                        return false;
                    }
                }
                return true;
            };
        case 'concat':
            if (values.every((value) => value.hasConstantValue)) {
                return constantEvaluator(values.reduce((result, value) => concat(result, value.constantValue), ''));
            }
            return (model) => {
                let result = '';
                for (const value of values) {
                    result = concat(result, value(model));
                }
                return result;
            };
        case 'add':
            return (model) => expandNumericValues(operator, values, model).reduce((result, value) => result + toNumber(value, true), 0);
        case 'sub':
            return (model) => values.slice(1).reduce((result, value) => result - toNumber(value(model), true), toNumber(values[0]!(model), true));
        case 'mul':
            return (model) => expandNumericValues(operator, values, model).reduce((result, value) => result * toNumber(value, true), 1);
        case 'div':
            return (model) => values.slice(1).reduce((result, value) => {
                const divisor = toNumber(value(model), true);
                if (divisor === 0) {
                    throw new Error('Division by zero');
                }
                return result / divisor;
            }, toNumber(values[0]!(model), true));
        case 'mod':
            return (model) => values.slice(1).reduce((result, value) => {
                const divisor = toNumber(value(model), true);
                if (divisor === 0) {
                    throw new Error('Division by zero');
                }
                return result % divisor;
            }, toNumber(values[0]!(model), true));
        case 'min':
            return (model) => {
                const expanded = expandNumericValues(operator, values, model);
                if (expanded.length === 0) {
                    throw new Error('Min requires at least one value');
                }
                return expanded.slice(1).reduce((result, value) => Math.min(result, toNumber(value, true)), toNumber(expanded[0], true));
            };
        case 'max':
            return (model) => {
                const expanded = expandNumericValues(operator, values, model);
                if (expanded.length === 0) {
                    throw new Error('Max requires at least one value');
                }
                return expanded.slice(1).reduce((result, value) => Math.max(result, toNumber(value, true)), toNumber(expanded[0], true));
            };
        default:
            throw new Error('Invalid Expression: invalid operator: ' + operator);
    }
};

const compileTernary = (operator: string, condition: Evaluator, whenTrue: Evaluator, whenFalse: Evaluator): Evaluator => {
    switch (operator) {
        case 'if':
            return (model) => condition(model) ? whenTrue(model) : whenFalse(model);
        case 'clamp':
            return (model) => clamp(condition(model), whenTrue(model), whenFalse(model));
        default:
            throw new Error('Invalid Expression: invalid operator: ' + operator);
    }
};

export const compileOperator = (operator: string, args: Evaluator[]): Evaluator => {
    switch (getOperatorArity(operator)) {
        case 1:
            return compileUnary(operator, args[0]!);
        case 2:
            return compileBinary(operator, args[0]!, args[1]!);
        case 3:
            return compileTernary(operator, args[0]!, args[1]!, args[2]!);
        case 'variadic':
            return compileVariadic(operator, args);
        default:
            throw new Error('Invalid Expression: invalid operator: ' + operator);
    }
};
