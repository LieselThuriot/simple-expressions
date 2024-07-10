export declare class SimpleExpressions {
    static clear(options?: {
        parsed?: boolean;
        expression?: boolean;
    }): void;
    static disableCaches(): void;
    static enableChaches(): void;
}
export declare const parseExpression: (expression: string) => (model: {
    [key: string]: any;
}) => any;
export declare const executeExpression: (model: {
    [key: string]: any;
}, expression: string | boolean) => boolean;
export declare class SimpleExpression {
    constructor(expression: string | boolean);
    evaluate(model: {
        [key: string]: any;
    }): boolean;
}
//# sourceMappingURL=index.d.ts.map