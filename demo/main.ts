import './styles.css';
import { createExpressionEditor } from './expression-editor';
import {
    evaluatePlayground,
    examples,
    initialExpression,
    initialModel,
    type EvaluationResult
} from './playground';

const getElement = <T extends HTMLElement>(id: string): T => {
    const element = document.getElementById(id);
    if (!element) {
        throw new Error(`Missing demo element: ${id}`);
    }
    return element as T;
};

const modelInput = getElement<HTMLTextAreaElement>('model-input');
const expressionHost = getElement<HTMLDivElement>('expression-input');
const exampleSelect = getElement<HTMLSelectElement>('example-select');
const evaluateButton = getElement<HTMLButtonElement>('evaluate-button');
const resetButton = getElement<HTMLButtonElement>('reset-button');
const output = getElement<HTMLElement>('output');
const outputType = getElement<HTMLElement>('output-type');
const status = getElement<HTMLElement>('status');
const resultPanel = getElement<HTMLElement>('result-panel');

const setStatus = (message: string, state: 'success' | 'error' | 'idle'): void => {
    status.textContent = message;
    status.dataset.state = state;
};

const renderResult = (result: EvaluationResult): void => {
    resultPanel.classList.remove('is-success', 'is-error');

    if (result.ok) {
        output.textContent = result.value.display;
        outputType.textContent = result.value.type;
        resultPanel.classList.add('is-success');
        setStatus('Evaluation successful', 'success');
        return;
    }

    output.textContent = result.error;
    outputType.textContent = 'error';
    resultPanel.classList.add('is-error');
    setStatus('Could not evaluate expression', 'error');
};

const evaluate = (): void => {
    renderResult(evaluatePlayground(modelInput.value, expressionEditor.getValue()));
};

let evaluationTimer: number | undefined;
const scheduleEvaluation = (): void => {
    if (evaluationTimer !== undefined) {
        window.clearTimeout(evaluationTimer);
    }
    evaluationTimer = window.setTimeout(evaluate, 250);
};

const expressionEditor = createExpressionEditor(
    expressionHost,
    initialExpression,
    () => modelInput.value,
    scheduleEvaluation
);

const reset = (): void => {
    modelInput.value = initialModel;
    expressionEditor.setValue(initialExpression);
    exampleSelect.value = '';
    evaluate();
    modelInput.focus();
};

const loadExample = (): void => {
    const example = examples.find((candidate) => candidate.id === exampleSelect.value);
    if (!example) {
        return;
    }

    modelInput.value = example.model;
    expressionEditor.setValue(example.expression);
    evaluate();
};

modelInput.addEventListener('input', scheduleEvaluation);
evaluateButton.addEventListener('click', evaluate);
resetButton.addEventListener('click', reset);
exampleSelect.addEventListener('change', loadExample);

const themeToggle = getElement<HTMLButtonElement>('theme-toggle');
const themeIcon = getElement<HTMLElement>('theme-icon');

type Theme = 'dark' | 'light';

const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

const getEffectiveTheme = (): Theme => {
    const stored = localStorage.getItem('theme');
    if (stored === 'dark' || stored === 'light') return stored as Theme;
    return prefersDark.matches ? 'dark' : 'light';
};

const applyTheme = (theme: Theme): void => {
    document.documentElement.dataset.theme = theme;
    themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    themeIcon.textContent = theme === 'dark' ? '☀' : '☾';
};

const toggleTheme = (): void => {
    const next: Theme = getEffectiveTheme() === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', next);
    applyTheme(next);
};

themeToggle.addEventListener('click', toggleTheme);
applyTheme(getEffectiveTheme());

modelInput.value = initialModel;
evaluate();
