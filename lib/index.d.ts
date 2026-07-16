type Model = {
    [key: string]: any;
};
export declare class SimpleExpressions {
    private static _cacheLimit;
    static clear(options?: {
        parsed?: boolean;
        expression?: boolean;
    }): void;
    static disableCaches(): void;
    static enableCaches(): void;
    static setCacheLimit(limit: number): void;
    private static setCacheValue;
    private static trimCache;
}
export declare const parseExpression: (expression: string) => (model: Model) => any;
export declare const executeExpression: (model: Model, expression: string | boolean) => boolean;
export declare class SimpleExpression {
    constructor(expression: string | boolean);
    evaluate(model: Model): boolean;
}
export {};
