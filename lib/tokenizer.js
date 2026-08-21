"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tokenizer = exports.TokenKind = void 0;
var TokenKind;
(function (TokenKind) {
    TokenKind[TokenKind["End"] = 0] = "End";
    TokenKind[TokenKind["Identifier"] = 1] = "Identifier";
    TokenKind[TokenKind["Number"] = 2] = "Number";
    TokenKind[TokenKind["String"] = 3] = "String";
    TokenKind[TokenKind["Reference"] = 4] = "Reference";
    TokenKind[TokenKind["OpenParen"] = 5] = "OpenParen";
    TokenKind[TokenKind["CloseParen"] = 6] = "CloseParen";
    TokenKind[TokenKind["Comma"] = 7] = "Comma";
    TokenKind[TokenKind["OpenBracket"] = 8] = "OpenBracket";
    TokenKind[TokenKind["CloseBracket"] = 9] = "CloseBracket";
})(TokenKind || (exports.TokenKind = TokenKind = {}));
class Tokenizer {
    constructor(source) {
        this.source = source;
        this.index = 0;
        this._kind = TokenKind.End;
        this._value = '';
        this.next();
    }
    get kind() {
        return this._kind;
    }
    get value() {
        return this._value;
    }
    get position() {
        return this.index;
    }
    next() {
        const length = this.source.length;
        while (this.index < length && this.source.charCodeAt(this.index) <= 32) {
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
    readDelimitedToken() {
        while (this.index < this.source.length) {
            const character = this.source.charAt(this.index);
            if (character === '(' || character === ')' || character === ',' || character === '[' || character === ']' || character.charCodeAt(0) <= 32) {
                return;
            }
            this.index++;
        }
    }
    readString(quote) {
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
    isIdentifierStart(character) {
        const code = character.charCodeAt(0);
        return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
    }
    isIdentifierPart(character) {
        return this.isIdentifierStart(character);
    }
    fail(message) {
        throw new Error('Invalid Expression at ' + this.index + ': ' + message);
    }
}
exports.Tokenizer = Tokenizer;
Tokenizer.numericPattern = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
