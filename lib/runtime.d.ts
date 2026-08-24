export type Model = {
    [key: string]: any;
};
export interface Evaluator {
    (model: Model): any;
    hasConstantValue?: boolean;
    constantValue?: any;
}
export declare const equals: (value1: any, value2: any, compared?: WeakMap<object, WeakSet<object>>) => boolean;
export declare const greaterThan: (value1: any, value2: any) => boolean;
export declare const lessThan: (value1: any, value2: any) => boolean;
export declare const evaluateRegex: (value: any, pattern: any) => boolean;
export declare const evaluateCompiledRegex: (value: any, regex: RegExp) => boolean;
export declare const concat: (value1: any, value2: any) => string;
export declare const contains: (value1: any, value2: any) => boolean;
export declare const startsWith: (value1: any, value2: any) => boolean;
export declare const endsWith: (value1: any, value2: any) => boolean;
export declare const inList: (value: any, list: any) => boolean;
export declare const lower: (value: any) => string;
export declare const upper: (value: any) => string;
export declare const trim: (value: any) => any;
export declare const defined: (value: any) => boolean;
export declare const toNumber: (value: any) => number;
export declare const expandNumericValues: (operator: string, values: Evaluator[], model: Model) => any[];
export declare const int: (value: any) => number;
export declare const num: (value: any) => number;
export declare const abs: (value: any) => number;
export declare const floor: (value: any) => number;
export declare const ceil: (value: any) => number;
export declare const sqrt: (value: any) => number;
export declare const round: (value: any, decimals: any) => number;
export declare const power: (value: any, exponent: any) => number;
export declare const clamp: (value: any, minimum: any, maximum: any) => number;
export declare const len: (value: any) => number;
export declare const empty: (value: any) => boolean;
export declare const constantEvaluator: (value: any) => Evaluator;
export declare const referenceEvaluator: (path: string) => Evaluator;
