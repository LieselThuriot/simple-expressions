"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compileOperator = exports.supportsSingleListArgument = exports.getOperatorArity = void 0;
const runtime_1 = require("./runtime");
const getOperatorArity = (operator) => {
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
exports.getOperatorArity = getOperatorArity;
const supportsSingleListArgument = (operator) => {
    return operator === 'add' || operator === 'mul' || operator === 'min' || operator === 'max';
};
exports.supportsSingleListArgument = supportsSingleListArgument;
const compileUnary = (operator, inner) => {
    switch (operator) {
        case 'not':
            return (model) => !inner(model);
        case 'empty':
            return (model) => (0, runtime_1.empty)(inner(model));
        case 'len':
            return (model) => (0, runtime_1.len)(inner(model));
        case 'lower':
            return (model) => (0, runtime_1.lower)(inner(model));
        case 'upper':
            return (model) => (0, runtime_1.upper)(inner(model));
        case 'trim':
            return (model) => (0, runtime_1.trim)(inner(model));
        case 'defined':
            return (model) => (0, runtime_1.defined)(inner(model));
        case 'int':
            return (model) => (0, runtime_1.int)(inner(model));
        case 'num':
            return (model) => (0, runtime_1.num)(inner(model));
        case 'abs':
            return (model) => (0, runtime_1.abs)(inner(model));
        case 'floor':
            return (model) => (0, runtime_1.floor)(inner(model));
        case 'ceil':
            return (model) => (0, runtime_1.ceil)(inner(model));
        case 'sqrt':
            return (model) => (0, runtime_1.sqrt)(inner(model));
        default:
            throw new Error('Invalid Expression: invalid operator: ' + operator);
    }
};
const compileBinary = (operator, left, right) => {
    switch (operator) {
        case 'eq':
            return (model) => (0, runtime_1.equals)(left(model), right(model));
        case 'contains':
            return (model) => (0, runtime_1.contains)(left(model), right(model));
        case 'startswith':
            return (model) => (0, runtime_1.startsWith)(left(model), right(model));
        case 'endswith':
            return (model) => (0, runtime_1.endsWith)(left(model), right(model));
        case 'in':
            return (model) => (0, runtime_1.inList)(left(model), right(model));
        case 'gt':
            return (model) => (0, runtime_1.greaterThan)(left(model), right(model));
        case 'lt':
            return (model) => (0, runtime_1.lessThan)(left(model), right(model));
        case 'match':
            if (right.hasConstantValue && !!right.constantValue && typeof right.constantValue === 'string') {
                const regex = new RegExp(right.constantValue);
                return (model) => (0, runtime_1.evaluateCompiledRegex)(left(model), regex);
            }
            return (model) => (0, runtime_1.evaluateRegex)(left(model), right(model));
        case 'round':
            return (model) => (0, runtime_1.round)(left(model), right(model));
        case 'pow':
            return (model) => (0, runtime_1.power)(left(model), right(model));
        default:
            throw new Error('Invalid Expression: invalid operator: ' + operator);
    }
};
const compileVariadic = (operator, values) => {
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
                return (0, runtime_1.constantEvaluator)(values.reduce((result, value) => (0, runtime_1.concat)(result, value.constantValue), ''));
            }
            return (model) => {
                let result = '';
                for (const value of values) {
                    result = (0, runtime_1.concat)(result, value(model));
                }
                return result;
            };
        case 'add':
            return (model) => (0, runtime_1.expandNumericValues)(operator, values, model).reduce((result, value) => result + (0, runtime_1.toNumber)(value, true), 0);
        case 'sub':
            return (model) => values.slice(1).reduce((result, value) => result - (0, runtime_1.toNumber)(value(model), true), (0, runtime_1.toNumber)(values[0](model), true));
        case 'mul':
            return (model) => (0, runtime_1.expandNumericValues)(operator, values, model).reduce((result, value) => result * (0, runtime_1.toNumber)(value, true), 1);
        case 'div':
            return (model) => values.slice(1).reduce((result, value) => {
                const divisor = (0, runtime_1.toNumber)(value(model), true);
                if (divisor === 0) {
                    throw new Error('Division by zero');
                }
                return result / divisor;
            }, (0, runtime_1.toNumber)(values[0](model), true));
        case 'mod':
            return (model) => values.slice(1).reduce((result, value) => {
                const divisor = (0, runtime_1.toNumber)(value(model), true);
                if (divisor === 0) {
                    throw new Error('Division by zero');
                }
                return result % divisor;
            }, (0, runtime_1.toNumber)(values[0](model), true));
        case 'min':
            return (model) => {
                const expanded = (0, runtime_1.expandNumericValues)(operator, values, model);
                if (expanded.length === 0) {
                    throw new Error('Min requires at least one value');
                }
                return expanded.slice(1).reduce((result, value) => Math.min(result, (0, runtime_1.toNumber)(value, true)), (0, runtime_1.toNumber)(expanded[0], true));
            };
        case 'max':
            return (model) => {
                const expanded = (0, runtime_1.expandNumericValues)(operator, values, model);
                if (expanded.length === 0) {
                    throw new Error('Max requires at least one value');
                }
                return expanded.slice(1).reduce((result, value) => Math.max(result, (0, runtime_1.toNumber)(value, true)), (0, runtime_1.toNumber)(expanded[0], true));
            };
        default:
            throw new Error('Invalid Expression: invalid operator: ' + operator);
    }
};
const compileTernary = (operator, condition, whenTrue, whenFalse) => {
    switch (operator) {
        case 'if':
            return (model) => condition(model) ? whenTrue(model) : whenFalse(model);
        case 'clamp':
            return (model) => (0, runtime_1.clamp)(condition(model), whenTrue(model), whenFalse(model));
        default:
            throw new Error('Invalid Expression: invalid operator: ' + operator);
    }
};
const compileOperator = (operator, args) => {
    switch ((0, exports.getOperatorArity)(operator)) {
        case 1:
            return compileUnary(operator, args[0]);
        case 2:
            return compileBinary(operator, args[0], args[1]);
        case 3:
            return compileTernary(operator, args[0], args[1], args[2]);
        case 'variadic':
            return compileVariadic(operator, args);
        default:
            throw new Error('Invalid Expression: invalid operator: ' + operator);
    }
};
exports.compileOperator = compileOperator;
