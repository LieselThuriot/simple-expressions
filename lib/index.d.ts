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
    constructor(expression: string);
    evaluate(model: {
        [key: string]: any;
    }): boolean;
}
