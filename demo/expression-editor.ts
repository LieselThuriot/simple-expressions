import { autocompletion, type Completion, type CompletionContext, type CompletionSource } from '@codemirror/autocomplete';
import { HighlightStyle, StreamLanguage, StringStream, syntaxHighlighting } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { basicSetup } from 'codemirror';
import { tags } from '@lezer/highlight';
import {
    getModelPropertyCompletions,
    getReferenceCompletionContext,
    isInsideStringAt,
    operatorDefinitions
} from './expression-completions';

interface ExpressionParserState {
    quote: string | null;
}

const numberPattern = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/;
const operatorNames = new Set(operatorDefinitions.map((operator) => operator.name));

const isIdentifierPart = (character: string): boolean => /[A-Za-z]/.test(character);

const isReferenceDelimiter = (character: string): boolean => {
    return character === '(' || character === ')' || character === ',' || character.charCodeAt(0) <= 32;
};

const consumeString = (stream: StringStream, state: ExpressionParserState): void => {
    let escaped = false;

    while (!stream.eol()) {
        const character = stream.next();
        if (character === state.quote && !escaped) {
            state.quote = null;
            return;
        }

        if (character === '\\') {
            escaped = !escaped;
        } else {
            escaped = false;
        }
    }
};

const expressionLanguage = StreamLanguage.define<ExpressionParserState>({
    name: 'simple-expressions',
    startState: () => ({ quote: null }),
    token(stream, state) {
        if (state.quote !== null) {
            consumeString(stream, state);
            return 'string';
        }

        if (stream.eatSpace()) {
            return null;
        }

        const character = stream.peek();
        if (character === undefined) {
            return null;
        }

        if (character === '"' || character === "'" || character === '`') {
            state.quote = stream.next() ?? null;
            consumeString(stream, state);
            return 'string';
        }

        if (character === '#') {
            stream.next();
            stream.eatWhile((nextCharacter) => !isReferenceDelimiter(nextCharacter));
            return 'variableName';
        }

        if (stream.match(numberPattern)) {
            return 'number';
        }

        if (isIdentifierPart(character)) {
            stream.next();
            stream.eatWhile(isIdentifierPart);
            const identifier = stream.current().toLowerCase();

            if (operatorNames.has(identifier)) {
                return 'operatorKeyword';
            }
            if (identifier === 'true' || identifier === 'false') {
                return 'bool';
            }
            return 'invalid';
        }

        if (character === '(' || character === ')' || character === ',') {
            stream.next();
            return 'punctuation';
        }

        stream.next();
        stream.eatWhile((nextCharacter) => !isReferenceDelimiter(nextCharacter));
        return 'invalid';
    },
    languageData: {
        commentTokens: {}
    }
});

const expressionHighlightStyle = HighlightStyle.define([
    { tag: tags.operatorKeyword, color: 'var(--editor-operator)', fontWeight: '650' },
    { tag: tags.bool, color: 'var(--editor-constant)', fontWeight: '650' },
    { tag: tags.string, color: 'var(--editor-string)' },
    { tag: tags.number, color: 'var(--editor-number)' },
    { tag: tags.variableName, color: 'var(--editor-reference)' },
    { tag: tags.punctuation, color: 'var(--editor-punctuation)' },
    { tag: tags.invalid, color: 'var(--editor-invalid)', textDecoration: 'underline wavy var(--editor-invalid)' }
]);

const expressionEditorTheme = EditorView.theme({
    '&': {
        color: 'var(--input-text)',
        backgroundColor: 'transparent',
        fontFamily: 'var(--code-font)',
        fontSize: '0.83rem'
    },
    '.cm-content': {
        minHeight: '67px',
        padding: '15px 16px',
        caretColor: 'var(--blue)',
        fontFamily: 'var(--code-font)',
        lineHeight: '1.7'
    },
    '.cm-line': {
        padding: '0'
    },
    '.cm-activeLine, .cm-activeLineGutter': {
        backgroundColor: 'transparent'
    },
    '.cm-scroller': {
        overflow: 'auto',
        fontFamily: 'var(--code-font)'
    },
    '.cm-gutters': {
        display: 'none'
    },
    '.cm-focused': {
        outline: 'none'
    },
    '.cm-selectionBackground': {
        backgroundColor: 'var(--blue-glow)'
    },
    '.cm-cursor': {
        borderLeftColor: 'var(--blue)'
    },
    '.cm-matchingBracket': {
        backgroundColor: 'var(--blue-glow)',
        outline: '1px solid var(--blue-ring)'
    }
});

const operatorSection = { name: 'Operators', rank: 1 };
const modelSection = { name: 'Model properties', rank: 2 };

const operatorCompletions: readonly Completion[] = operatorDefinitions.map((operator) => ({
    label: operator.name,
    type: 'function',
    detail: operator.detail,
    info: operator.description,
    apply: `${operator.name}(`,
    section: operatorSection
}));

const createExpressionCompletionSource = (getModelText: () => string): CompletionSource => {
    return (context: CompletionContext) => {
        const source = context.state.sliceDoc(0, context.pos);
        const referenceContext = getReferenceCompletionContext(source);

        if (referenceContext) {
            const options: Completion[] = getModelPropertyCompletions(
                getModelText(),
                referenceContext.path,
                referenceContext.prefix
            ).map((property) => ({
                label: property,
                type: 'property',
                detail: 'model property',
                section: modelSection
            }));

            return {
                from: referenceContext.from,
                to: referenceContext.to,
                options,
                validFor: /^[A-Za-z0-9_$-]*$/
            };
        }

        if (isInsideStringAt(source, source.length)) {
            return null;
        }

        const word = context.matchBefore(/[A-Za-z]*$/);
        if (!context.explicit && (!word || word.from === word.to)) {
            return null;
        }

        return {
            from: word?.from ?? context.pos,
            to: word?.to ?? context.pos,
            options: operatorCompletions,
            validFor: /^[A-Za-z]*$/
        };
    };
};

export interface ExpressionEditor {
    getValue(): string;
    setValue(value: string): void;
    focus(): void;
    destroy(): void;
}

export const createExpressionEditor = (
    parent: HTMLElement,
    initialValue: string,
    getModelText: () => string,
    onChange: () => void
): ExpressionEditor => {
    const view = new EditorView({
        parent,
        state: EditorState.create({
            doc: initialValue,
            extensions: [
                basicSetup,
                expressionLanguage,
                syntaxHighlighting(expressionHighlightStyle),
                expressionEditorTheme,
                autocompletion({
                    override: [createExpressionCompletionSource(getModelText)],
                    maxRenderedOptions: 24,
                    icons: true
                }),
                EditorView.contentAttributes.of({
                    'aria-labelledby': 'expression-label',
                    'aria-describedby': 'expression-help',
                    spellcheck: 'false'
                }),
                EditorView.updateListener.of((update) => {
                    if (update.docChanged) {
                        onChange();
                    }
                })
            ]
        })
    });

    return {
        getValue: () => view.state.doc.toString(),
        setValue: (value: string) => {
            if (view.state.doc.toString() !== value) {
                view.dispatch({
                    changes: {
                        from: 0,
                        to: view.state.doc.length,
                        insert: value
                    }
                });
            }
        },
        focus: () => view.focus(),
        destroy: () => view.destroy()
    };
};
