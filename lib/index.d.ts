export declare class SimpleExpressionCaches {
    private static _enabled;
    private static _verbose;
    private static _parseCache;
    private static _simpleCache;
    private static logVerbose;
    static get(e: string | boolean): SimpleExpression;
    static getParsedExpression(expression: string, factory: (value: string) => (model: {
        [key: string]: any;
    }) => any): (model: {
        [key: string]: any;
    }) => any;
    static clear(options?: {
        parsed?: boolean;
        expression?: boolean;
    }): void;
    static disable(): void;
    static enable(): void;
    static verbose(value?: boolean): void;
}
export declare const parseExpression: (expression: string) => (model: {
    [key: string]: any;
}) => any;
export declare const executeExpression: (model: {
    [key: string]: any;
}, expression: string | boolean) => boolean;
export declare class SimpleExpression {
    private readonly _parsedExpression;
    private readonly _needsFlattening;
    private flattenObject;
    constructor(expression: string | boolean);
    evaluate(model: {
        [key: string]: any;
    }): boolean;
}
