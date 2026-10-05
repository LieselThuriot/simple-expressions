import { ExpressionEvaluationException } from './errors';
export type Model = { [key: string]: any; };

export interface Evaluator {
    (model: Model): any;
    hasConstantValue?: boolean;
    constantValue?: any;
}

const unsafeReferenceSegments = new Set(['__proto__', 'constructor', 'prototype']);
const decimalPattern = /^[+-]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?$/;

export const isPortableWhitespace = (code: number): boolean =>
    (code >= 0x0009 && code <= 0x000d) ||
    code === 0x0020 ||
    code === 0x0085 ||
    code === 0x00a0 ||
    code === 0x1680 ||
    (code >= 0x2000 && code <= 0x200a) ||
    code === 0x2028 ||
    code === 0x2029 ||
    code === 0x202f ||
    code === 0x205f ||
    code === 0x3000;

export const trimPortableWhitespace = (value: string): string => {
    let start = 0;
    let end = value.length;
    while (start < end && isPortableWhitespace(value.charCodeAt(start))) {
        start++;
    }
    while (end > start && isPortableWhitespace(value.charCodeAt(end - 1))) {
        end--;
    }
    return start === 0 && end === value.length ? value : value.substring(start, end);
};

const parseFiniteDecimal = (value: string): number | undefined => {
    const text = trimPortableWhitespace(value);
    if (!decimalPattern.test(text)) {
        return undefined;
    }
    const result = Number(text);
    return Number.isFinite(result) ? result : undefined;
};

export const equals = (value1: any, value2: any, compared: WeakMap<object, WeakSet<object>> = new WeakMap()): boolean => {
    if (value1 === value2) {
        return true;
    }

    const value1Nullish = value1 === null || value1 === undefined;
    const value2Nullish = value2 === null || value2 === undefined;
    if (value1Nullish || value2Nullish) {
        return value1Nullish && value2Nullish;
    }

    if (typeof value1 === 'object' && typeof value2 === 'object') {
        const value1IsArray = Array.isArray(value1);
        const value2IsArray = Array.isArray(value2);
        if (value1IsArray !== value2IsArray) {
            return false;
        }

        let counterparts = compared.get(value1);
        if (counterparts?.has(value2)) {
            return true;
        }
        if (!counterparts) {
            counterparts = new WeakSet<object>();
            compared.set(value1, counterparts);
        }
        counterparts.add(value2);

        if (value1IsArray) {
            if (value1.length !== value2.length) {
                return false;
            }
            for (let index = 0; index < value1.length; index++) {
                const left = Object.prototype.hasOwnProperty.call(value1, index) ? value1[index] : undefined;
                const right = Object.prototype.hasOwnProperty.call(value2, index) ? value2[index] : undefined;
                if (!equals(left, right, compared)) {
                    return false;
                }
            }
            return true;
        }

        const keys1 = Object.keys(value1);
        const keys2 = Object.keys(value2);
        return keys1.length === keys2.length && keys1.every((key) =>
            Object.prototype.hasOwnProperty.call(value2, key) && equals(value1[key], value2[key], compared));
    }

    if (typeof value1 === typeof value2) {
        return false;
    }

    const number1 = equalityNumber(value1);
    const number2 = equalityNumber(value2);
    return number1 !== undefined && number2 !== undefined && number1 === number2;
};

const comparisonNumber = (value: any): number | undefined => {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : undefined;
    }
    if (typeof value === 'string') {
        return parseFiniteDecimal(value);
    }
    return undefined;
};

const equalityNumber = (value: any): number | undefined => {
    return typeof value === 'boolean' ? (value ? 1 : 0) : comparisonNumber(value);
};

const compare = (value1: any, value2: any): number | undefined => {
    if (typeof value1 === 'string' && typeof value2 === 'string') {
        if (trimPortableWhitespace(value1) === '' || trimPortableWhitespace(value2) === '') {
            return undefined;
        }
        return value1 < value2 ? -1 : value1 > value2 ? 1 : 0;
    }

    const number1 = comparisonNumber(value1);
    const number2 = comparisonNumber(value2);
    if (number1 === undefined || number2 === undefined) {
        return undefined;
    }
    return number1 < number2 ? -1 : number1 > number2 ? 1 : 0;
};

export const greaterThan = (value1: any, value2: any): boolean => compare(value1, value2) === 1;
export const lessThan = (value1: any, value2: any): boolean => compare(value1, value2) === -1;

const textValue = (value: any, activeArrays: WeakSet<any[]> = new WeakSet()): string => {
    if (!Array.isArray(value)) {
        return value === undefined ? 'undefined' : value === null ? 'null' : value.toString();
    }
    if (activeArrays.has(value)) {
        throw new ExpressionEvaluationException('Cyclic list value');
    }

    activeArrays.add(value);
    try {
        const result: string[] = [];
        for (let index = 0; index < value.length; index++) {
            const item = Object.prototype.hasOwnProperty.call(value, index) ? value[index] : undefined;
            result.push(item === undefined || item === null ? '' : textValue(item, activeArrays));
        }
        return result.join(',');
    } finally {
        activeArrays.delete(value);
    }
};

const falsyText = (value: any): string => {
    return !value ? '' : typeof value === 'string' ? value : textValue(value);
};

export const evaluateRegex = (value: any, pattern: any): boolean => {
    if (!!pattern && typeof pattern === 'string') {
        const text = falsyText(value);
        let regex: RegExp;
        try {
            regex = new RegExp(pattern);
        } catch (error) {
            throw new ExpressionEvaluationException('Invalid regular expression: ' + (error as Error).message);
        }
        return regex.test(text);
    }

    return false;
};

export const evaluateCompiledRegex = (value: any, regex: RegExp): boolean => {
    return regex.test(falsyText(value));
};

export const concat = (value1: any, value2: any): string => {
    const string1 = !!value1 ? textValue(value1) : '';
    const string2 = !!value2 ? textValue(value2) : '';
    return string1 + string2;
};

export const contains = (value1: any, value2: any): boolean => {
    return typeof value1 === 'string' && value1.indexOf(textValue(value2)) >= 0;
};

export const startsWith = (value1: any, value2: any): boolean => {
    return typeof value1 === 'string' && value1.startsWith(textValue(value2));
};

export const endsWith = (value1: any, value2: any): boolean => {
    return typeof value1 === 'string' && value1.endsWith(textValue(value2));
};

export const inList = (value: any, list: any): boolean => {
    if (!Array.isArray(list)) {
        return false;
    }
    for (let index = 0; index < list.length; index++) {
        const item = Object.prototype.hasOwnProperty.call(list, index) ? list[index] : undefined;
        if (equals(value, item)) {
            return true;
        }
    }
    return false;
};

export const lower = (value: any): string => falsyText(value).toLowerCase();

export const upper = (value: any): string => falsyText(value).toUpperCase();

export const trim = (value: any): any => {
    if (value === null || value === undefined) {
        return value;
    }

    return trimPortableWhitespace(falsyText(value));
};

export const defined = (value: any): boolean => value !== null && value !== undefined;

export const toNumber = (value: any): number => {
    if (typeof value === 'number') {
        if (Number.isFinite(value)) {
            return value;
        }
        throw new ExpressionEvaluationException('Invalid numeric value');
    }

    if (typeof value === 'string') {
        const result = parseFiniteDecimal(value);
        if (result !== undefined) {
            return result;
        }
    }

    throw new ExpressionEvaluationException('Invalid numeric value');
};

// Numeric literals and operator outputs are normalized; plain model references are not.
export const normalizeZero = (value: number): number => value === 0 ? 0 : value;

export const numericResult = (value: number): number => {
    if (!Number.isFinite(value)) {
        throw new ExpressionEvaluationException('Invalid numeric result');
    }
    return normalizeZero(value);
};

export const expandNumericValues = (operator: string, values: Evaluator[], model: Model): any[] => {
    const expanded: any[] = [];
    const activeArrays = new WeakSet<any[]>();

    const append = (value: any): void => {
        if (!Array.isArray(value)) {
            expanded.push(value);
            return;
        }
        if (activeArrays.has(value)) {
            throw new ExpressionEvaluationException('Invalid numeric value');
        }

        activeArrays.add(value);
        for (let index = 0; index < value.length; index++) {
            append(Object.prototype.hasOwnProperty.call(value, index) ? value[index] : undefined);
        }
        activeArrays.delete(value);
    };

    const evaluated = values.map((value) => value(model));
    if (evaluated.length === 1 && !Array.isArray(evaluated[0])) {
        throw new ExpressionEvaluationException('Invalid Expression: operator ' + operator + ' expects at least two arguments or one list argument');
    }
    for (const result of evaluated) {
        append(result);
    }
    return expanded;
};

export const int = (value: any): number => numericResult(Math.trunc(toNumber(value)));
export const num = (value: any): number => numericResult(toNumber(value));
export const abs = (value: any): number => numericResult(Math.abs(toNumber(value)));
export const floor = (value: any): number => numericResult(Math.floor(toNumber(value)));
export const ceil = (value: any): number => numericResult(Math.ceil(toNumber(value)));
export const sqrt = (value: any): number => numericResult(Math.sqrt(toNumber(value)));
export const round = (value: any, decimals: any): number => {
    const places = toNumber(decimals);
    if (!Number.isInteger(places) || places < 0) {
        throw new ExpressionEvaluationException('Round precision must be a non-negative safe integer');
    }
    if (places > 308) {
        throw new ExpressionEvaluationException('Round precision is too large');
    }
    const number = toNumber(value);
    if (number === 0) {
        return 0;
    }

    const data = new DataView(new ArrayBuffer(8));
    data.setFloat64(0, Math.abs(number));
    const high = data.getUint32(0);
    const low = data.getUint32(4);
    const exponentBits = (high >>> 20) & 0x7ff;
    const fraction = (BigInt(high & 0xfffff) << 32n) | BigInt(low);
    const significand = exponentBits === 0 ? fraction : (1n << 52n) | fraction;
    const binaryExponent = exponentBits === 0 ? -1074 : exponentBits - 1023 - 52;
    const numerator = significand * (5n ** BigInt(places));
    const shift = binaryExponent + places;
    let rounded: bigint;
    if (shift >= 0) {
        rounded = numerator << BigInt(shift);
    } else {
        const divisor = 1n << BigInt(-shift);
        rounded = numerator / divisor;
        if ((numerator % divisor) * 2n >= divisor) {
            rounded++;
        }
    }
    if (number < 0) {
        rounded = -rounded;
    }
    return numericResult(Number(rounded.toString() + 'e-' + places));
};

export const power = (value: any, exponent: any): number => numericResult(Math.pow(toNumber(value), toNumber(exponent)));
export const clamp = (value: any, minimum: any, maximum: any): number => numericResult(Math.min(Math.max(toNumber(value), toNumber(minimum)), toNumber(maximum)));

export const len = (value: any): number => {
    if (value === undefined || value === null) {
        return 0;
    }

    if (typeof value === 'string') {
        return value.length;
    }

    if (Object.prototype.hasOwnProperty.call(value, 'length')) {
        return value.length;
    }

    throw new ExpressionEvaluationException('Input does not have a length');
};

export const empty = (value: any): boolean => {
    return value === undefined || value === null || (typeof value === 'string' && value.length === 0);
};

export const constantEvaluator = (value: any): Evaluator => {
    const evaluator: Evaluator = () => value;
    evaluator.hasConstantValue = true;
    evaluator.constantValue = value;
    return evaluator;
};

export const referenceEvaluator = (path: string): Evaluator => {
    const segments = path.split('.');

    for (const segment of segments) {
        if (!segment || unsafeReferenceSegments.has(segment)) {
            throw new ExpressionEvaluationException('Invalid Expression: invalid model reference: #' + path);
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

        let value: any = model;
        for (const segment of segments) {
            if (value == null || !Object.prototype.hasOwnProperty.call(value, segment)) {
                return undefined;
            }
            value = value[segment];
        }
        return value;
    };
};
