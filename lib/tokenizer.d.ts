export declare enum TokenKind {
    End = 0,
    Identifier = 1,
    Number = 2,
    String = 3,
    Reference = 4,
    OpenParen = 5,
    CloseParen = 6,
    Comma = 7,
    OpenBracket = 8,
    CloseBracket = 9
}
export declare class Tokenizer {
    private readonly source;
    private index;
    private _kind;
    private _value;
    constructor(source: string);
    get kind(): TokenKind;
    get value(): string;
    get position(): number;
    next(): void;
    private static readonly numericPattern;
    private readDelimitedToken;
    private readString;
    private isIdentifierStart;
    private isIdentifierPart;
    private fail;
}
