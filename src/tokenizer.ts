import { ExpressionParseException } from './errors';
import { isPortableWhitespace } from './runtime';

export enum TokenKind {
    End,
    Identifier,
    Number,
    String,
    Reference,
    OpenParen,
    CloseParen,
    Comma,
    OpenBracket,
    CloseBracket
}

export class Tokenizer {
    private index: number = 0;
    private _kind: TokenKind = TokenKind.End;
    private _value: string = '';

    public constructor(private readonly source: string) {
        this.next();
    }

    public get kind(): TokenKind {
        return this._kind;
    }

    public get value(): string {
        return this._value;
    }

    public get position(): number {
        return this.index;
    }

    public next(): void {
        const length = this.source.length;

        while (this.index < length && isPortableWhitespace(this.source.charCodeAt(this.index))) {
            this.index++;
        }

        if (this.index >= length) {
            this._kind = TokenKind.End;
            this._value = '';
            return;
        }

        const start = this.index;
        const character = this.source.charAt(this.index);

        switch (character) {
            case '(':
                this.index++;
                this._kind = TokenKind.OpenParen;
                this._value = character;
                return;
            case ')':
                this.index++;
                this._kind = TokenKind.CloseParen;
                this._value = character;
                return;
            case ',':
                this.index++;
                this._kind = TokenKind.Comma;
                this._value = character;
                return;
            case '[':
                this.index++;
                this._kind = TokenKind.OpenBracket;
                this._value = character;
                return;
            case ']':
                this.index++;
                this._kind = TokenKind.CloseBracket;
                this._value = character;
                return;
            case '#':
                this.index++;
                this.readDelimitedToken();
                if (this.index === start + 1) {
                    this.fail('missing model reference');
                }
                this._kind = TokenKind.Reference;
                this._value = this.source.substring(start + 1, this.index);
                return;
            case '`':
            case '"':
            case "'":
                this.readString(character);
                return;
        }

        if (this.isIdentifierStart(character)) {
            this.index++;
            while (this.index < length && this.isIdentifierPart(this.source.charAt(this.index))) {
                this.index++;
            }
            this._kind = TokenKind.Identifier;
            this._value = this.source.substring(start, this.index);
            return;
        }

        this.readDelimitedToken();
        const value = this.source.substring(start, this.index);
        if (Tokenizer.numericPattern.test(value)) {
            this._kind = TokenKind.Number;
            this._value = value;
            return;
        }

        this.fail('unexpected token ' + value);
    }

    private static readonly numericPattern = /^[+-]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?$/;

    private readDelimitedToken(): void {
        while (this.index < this.source.length) {
            const character = this.source.charAt(this.index);
            if (character === '(' || character === ')' || character === ',' || character === '[' || character === ']' || isPortableWhitespace(character.charCodeAt(0))) {
                return;
            }
            this.index++;
        }
    }

    private readString(quote: string): void {
        const start = this.index + 1;
        this.index++;
        let backslashCount = 0;

        while (this.index < this.source.length) {
            const character = this.source.charAt(this.index);

            if (character === '\\') {
                backslashCount++;
                this.index++;
                continue;
            }

            if (character === quote && backslashCount % 2 === 0) {
                this._kind = TokenKind.String;
                this._value = this.source.substring(start, this.index);
                this.index++;
                return;
            }

            backslashCount = 0;
            this.index++;
        }

        this.fail('unterminated string');
    }

    private isIdentifierStart(character: string): boolean {
        const code = character.charCodeAt(0);
        return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
    }

    private isIdentifierPart(character: string): boolean {
        return this.isIdentifierStart(character);
    }

    private fail(message: string): never {
        throw new ExpressionParseException('Invalid Expression at ' + this.index + ': ' + message);
    }
}
