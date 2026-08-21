export type Model = { [key: string]: any; };

export interface Evaluator {
    (model: Model): any;
    hasConstantValue?: boolean;
    constantValue?: any;
}

const unsafeReferenceSegments = new Set(['__proto__', 'constructor', 'prototype']);

export const equals = (value1: any, value2: any, compared: WeakMap<object, WeakSet<object>> = new WeakMap()): boolean => {
    if (value1 === value2) {
        return true;
    }

    if (value1 !== null && typeof value1 === 'object' && value2 !== null && typeof value2 === 'object') {
        let counterparts = compared.get(value1);
        if (counterparts?.has(value2)) {
            return true;
        }
        if (!counterparts) {
            counterparts = new WeakSet<object>();
            compared.set(value1, counterparts);
        }
        counterparts.add(value2);

        if (Array.isArray(value1) && Array.isArray(value2)) {
            return value1.length === value2.length && value1.every((item, index) => equals(item, value2[index], compared));
        }

        if (!Array.isArray(value1) && !Array.isArray(value2)) {
            const keys1 = Object.keys(value1);
            const keys2 = Object.keys(value2);
            return keys1.length === keys2.length && keys1.every((key) =>
                Object.prototype.hasOwnProperty.call(value2, key) && equals(value1[key], value2[key], compared));
        }
    }

    return value1 == value2;
};

export const greaterThan = (value1: any, value2: any): boolean => value1 > value2;
export const lessThan = (value1: any, value2: any): boolean => value1 < value2;

const regexInput = (value: any): string => {
    return !value ? '' : typeof value === 'string' ? value : value.toString();
};

export const evaluateRegex = (value: any, pattern: any): boolean => {
    if (!!pattern && typeof pattern === 'string') {
        return new RegExp(pattern).test(regexInput(value));
    }

    return false;
};

export const evaluateCompiledRegex = (value: any, regex: RegExp): boolean => {
    return regex.test(regexInput(value));
};

export const concat = (value1: any, value2: any): string => {
    const string1 = !!value1 ? value1.toString() : '';
    const string2 = !!value2 ? value2.toString() : '';
    return string1 + string2;
};

export const contains = (value1: any, value2: any): boolean => {
    return typeof value1 === 'string' && value1.indexOf(value2) >= 0;
};

export const startsWith = (value1: any, value2: any): boolean => {
    return typeof value1 === 'string' && value1.startsWith(value2);
};

export const endsWith = (value1: any, value2: any): boolean => {
    return typeof value1 === 'string' && value1.endsWith(value2);
};

export const inList = (value: any, list: any): boolean => {
    return Array.isArray(list) && list.some((item) => equals(value, item));
};

export const lower = (value: any): string => regexInput(value).toLowerCase();

export const upper = (value: any): string => regexInput(value).toUpperCase();

export const trim = (value: any): any => {
    if (value === null || value === undefined) {
        return value;
    }

    return regexInput(value).trim();
};

export const defined = (value: any): boolean => value !== null && value !== undefined;

export const toNumber = (value: any, strict: boolean = false): number => {
    const result = Number(value);
    if (strict && typeof value === 'string' && (value.trim() === '' || Number.isNaN(result))) {
        throw new Error('Invalid numeric value');
    }
    return result;
};

export const expandNumericValues = (operator: string, values: Evaluator[], model: Model): any[] => {
    const expanded: any[] = [];
    for (const value of values) {
        const result = value(model);
        if (values.length === 1 && !Array.isArray(result)) {
            throw new Error('Invalid Expression: operator ' + operator + ' expects at least two arguments');
        }
        if (Array.isArray(result)) {
            expanded.push(...result);
        } else {
            expanded.push(result);
        }
    }
    return expanded;
};

export const int = (value: any): number => Math.trunc(toNumber(value, true));
export const num = (value: any): number => {
    if (Array.isArray(value)) {
        throw new Error('Invalid numeric value');
    }
    return toNumber(value, true);
};
export const abs = (value: any): number => Math.abs(toNumber(value, true));
export const floor = (value: any): number => Math.floor(toNumber(value, true));
export const ceil = (value: any): number => Math.ceil(toNumber(value, true));
export const sqrt = (value: any): number => Math.sqrt(toNumber(value, true));
export const round = (value: any, decimals: any): number => {
    const places = toNumber(decimals, true);
    if (!Number.isSafeInteger(places) || places < 0) {
        throw new Error('Round precision must be a non-negative safe integer');
    }
    const factor = 10 ** places;
    if (!Number.isFinite(factor)) {
        throw new Error('Round precision is too large');
    }
    return Math.round(toNumber(value, true) * factor) / factor;
};
export const power = (value: any, exponent: any): number => Math.pow(toNumber(value, true), toNumber(exponent, true));
export const clamp = (value: any, minimum: any, maximum: any): number => Math.min(Math.max(toNumber(value, true), toNumber(minimum, true)), toNumber(maximum, true));

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

    throw new Error('Input does not have a length');
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
