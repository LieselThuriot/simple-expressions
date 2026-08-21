"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.referenceEvaluator = exports.constantEvaluator = exports.empty = exports.len = exports.clamp = exports.power = exports.round = exports.sqrt = exports.ceil = exports.floor = exports.abs = exports.num = exports.int = exports.expandNumericValues = exports.toNumber = exports.defined = exports.trim = exports.upper = exports.lower = exports.inList = exports.endsWith = exports.startsWith = exports.contains = exports.concat = exports.evaluateCompiledRegex = exports.evaluateRegex = exports.lessThan = exports.greaterThan = exports.equals = void 0;
const unsafeReferenceSegments = new Set(['__proto__', 'constructor', 'prototype']);
const equals = (value1, value2, compared = new WeakMap()) => {
    if (value1 === value2) {
        return true;
    }
    if (value1 !== null && typeof value1 === 'object' && value2 !== null && typeof value2 === 'object') {
        let counterparts = compared.get(value1);
        if (counterparts === null || counterparts === void 0 ? void 0 : counterparts.has(value2)) {
            return true;
        }
        if (!counterparts) {
            counterparts = new WeakSet();
            compared.set(value1, counterparts);
        }
        counterparts.add(value2);
        if (Array.isArray(value1) && Array.isArray(value2)) {
            return value1.length === value2.length && value1.every((item, index) => (0, exports.equals)(item, value2[index], compared));
        }
        if (!Array.isArray(value1) && !Array.isArray(value2)) {
            const keys1 = Object.keys(value1);
            const keys2 = Object.keys(value2);
            return keys1.length === keys2.length && keys1.every((key) => Object.prototype.hasOwnProperty.call(value2, key) && (0, exports.equals)(value1[key], value2[key], compared));
        }
    }
    return value1 == value2;
};
exports.equals = equals;
const greaterThan = (value1, value2) => value1 > value2;
exports.greaterThan = greaterThan;
const lessThan = (value1, value2) => value1 < value2;
exports.lessThan = lessThan;
const regexInput = (value) => {
    return !value ? '' : typeof value === 'string' ? value : value.toString();
};
const evaluateRegex = (value, pattern) => {
    if (!!pattern && typeof pattern === 'string') {
        return new RegExp(pattern).test(regexInput(value));
    }
    return false;
};
exports.evaluateRegex = evaluateRegex;
const evaluateCompiledRegex = (value, regex) => {
    return regex.test(regexInput(value));
};
exports.evaluateCompiledRegex = evaluateCompiledRegex;
const concat = (value1, value2) => {
    const string1 = !!value1 ? value1.toString() : '';
    const string2 = !!value2 ? value2.toString() : '';
    return string1 + string2;
};
exports.concat = concat;
const contains = (value1, value2) => {
    return typeof value1 === 'string' && value1.indexOf(value2) >= 0;
};
exports.contains = contains;
const startsWith = (value1, value2) => {
    return typeof value1 === 'string' && value1.startsWith(value2);
};
exports.startsWith = startsWith;
const endsWith = (value1, value2) => {
    return typeof value1 === 'string' && value1.endsWith(value2);
};
exports.endsWith = endsWith;
const inList = (value, list) => {
    return Array.isArray(list) && list.some((item) => (0, exports.equals)(value, item));
};
exports.inList = inList;
const lower = (value) => regexInput(value).toLowerCase();
exports.lower = lower;
const upper = (value) => regexInput(value).toUpperCase();
exports.upper = upper;
const trim = (value) => {
    if (value === null || value === undefined) {
        return value;
    }
    return regexInput(value).trim();
};
exports.trim = trim;
const defined = (value) => value !== null && value !== undefined;
exports.defined = defined;
const toNumber = (value, strict = false) => {
    const result = Number(value);
    if (strict && typeof value === 'string' && (value.trim() === '' || Number.isNaN(result))) {
        throw new Error('Invalid numeric value');
    }
    return result;
};
exports.toNumber = toNumber;
const expandNumericValues = (operator, values, model) => {
    const expanded = [];
    for (const value of values) {
        const result = value(model);
        if (values.length === 1 && !Array.isArray(result)) {
            throw new Error('Invalid Expression: operator ' + operator + ' expects at least two arguments');
        }
        if (Array.isArray(result)) {
            expanded.push(...result);
        }
        else {
            expanded.push(result);
        }
    }
    return expanded;
};
exports.expandNumericValues = expandNumericValues;
const int = (value) => Math.trunc((0, exports.toNumber)(value, true));
exports.int = int;
const num = (value) => {
    if (Array.isArray(value)) {
        throw new Error('Invalid numeric value');
    }
    return (0, exports.toNumber)(value, true);
};
exports.num = num;
const abs = (value) => Math.abs((0, exports.toNumber)(value, true));
exports.abs = abs;
const floor = (value) => Math.floor((0, exports.toNumber)(value, true));
exports.floor = floor;
const ceil = (value) => Math.ceil((0, exports.toNumber)(value, true));
exports.ceil = ceil;
const sqrt = (value) => Math.sqrt((0, exports.toNumber)(value, true));
exports.sqrt = sqrt;
const round = (value, decimals) => {
    const places = (0, exports.toNumber)(decimals, true);
    if (!Number.isSafeInteger(places) || places < 0) {
        throw new Error('Round precision must be a non-negative safe integer');
    }
    const factor = Math.pow(10, places);
    if (!Number.isFinite(factor)) {
        throw new Error('Round precision is too large');
    }
    return Math.round((0, exports.toNumber)(value, true) * factor) / factor;
};
exports.round = round;
const power = (value, exponent) => Math.pow((0, exports.toNumber)(value, true), (0, exports.toNumber)(exponent, true));
exports.power = power;
const clamp = (value, minimum, maximum) => Math.min(Math.max((0, exports.toNumber)(value, true), (0, exports.toNumber)(minimum, true)), (0, exports.toNumber)(maximum, true));
exports.clamp = clamp;
const len = (value) => {
    if (value === undefined || value === null) {
        return 0;
    }
    if (typeof value === 'string') {
        return value.length;
    }
    if (Object.prototype.hasOwnProperty.call(value, 'length')) {
        return value.length;
    }
    throw new Error('Input does not have a length');
};
exports.len = len;
const empty = (value) => {
    return value === undefined || value === null || (typeof value === 'string' && value.length === 0);
};
exports.empty = empty;
const constantEvaluator = (value) => {
    const evaluator = () => value;
    evaluator.hasConstantValue = true;
    evaluator.constantValue = value;
    return evaluator;
};
exports.constantEvaluator = constantEvaluator;
const referenceEvaluator = (path) => {
    const segments = path.split('.');
    for (const segment of segments) {
        if (!segment || unsafeReferenceSegments.has(segment)) {
            throw new Error('Invalid Expression: invalid model reference: #' + path);
        }
    }
    if (segments.length === 1) {
        return (model) => model == null || !Object.prototype.hasOwnProperty.call(model, path) ? undefined : model[path];
    }
    return (model) => {
        if (model == null) {
            return undefined;
        }
        if (Object.prototype.hasOwnProperty.call(model, path)) {
            return model[path];
        }
        let value = model;
        for (const segment of segments) {
            if (value == null || !Object.prototype.hasOwnProperty.call(value, segment)) {
                return undefined;
            }
            value = value[segment];
        }
        return value;
    };
};
exports.referenceEvaluator = referenceEvaluator;
