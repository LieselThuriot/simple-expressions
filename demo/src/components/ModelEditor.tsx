import { json } from '@codemirror/lang-json';
import { EditorView } from '@codemirror/view';
import CodeMirror from '@uiw/react-codemirror';

const modelEditorTheme = EditorView.theme({
    '&': {
        color: 'var(--input-text)',
        backgroundColor: 'transparent',
        fontFamily: 'var(--code-font)',
        fontSize: '0.83rem'
    },
    '.cm-content': {
        minHeight: '126px',
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

export interface ModelEditorProps {
    value: string;
    onChange: (value: string) => void;
}

export const ModelEditor = ({ value, onChange }: ModelEditorProps) => {
    return (
        <CodeMirror
            value={value}
            onChange={onChange}
            extensions={[
                json(),
                modelEditorTheme,
                EditorView.contentAttributes.of({
                    'aria-labelledby': 'model-label',
                    'aria-describedby': 'model-help',
                    spellcheck: 'false'
                })
            ]}
            basicSetup={{
                lineNumbers: false,
                highlightActiveLineGutter: false,
                highlightActiveLine: false,
                foldGutter: false,
                dropCursor: false,
                allowMultipleSelections: false,
                indentOnInput: false,
                bracketMatching: true,
                closeBrackets: false,
                autocompletion: false,
                searchKeymap: false,
                historyKeymap: false,
                foldKeymap: false,
                completionKeymap: false,
                lintKeymap: false
            }}
            className="code-input model-input"
        />
    );
};
