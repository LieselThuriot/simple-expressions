export class ExpressionParseException extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ExpressionParseException';
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export class ExpressionEvaluationException extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ExpressionEvaluationException';
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
