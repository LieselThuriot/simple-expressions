import { usageSnippet } from '../constants';
import type { EvaluationResult } from '../playground';

interface ResultPanelProps {
    result: EvaluationResult;
}

export const ResultPanel = ({ result }: ResultPanelProps) => {
    const panelClass = result.ok ? 'is-success' : 'is-error';
    const status = result.ok ? 'Evaluation successful' : 'Could not evaluate expression';
    const state = result.ok ? 'success' : 'error';
    const output = result.ok ? result.value.display : result.error;
    const outputType = result.ok ? result.value.type : 'error';

    return (
        <aside id="result-panel" className={`result-panel ${panelClass}`} aria-labelledby="result-heading">
            <div className="result-topline">
                <div>
                    <p className="section-kicker">Output</p>
                    <h2 id="result-heading">Result</h2>
                </div>
                <span id="output-type" className="result-type" title={outputType}>
                    {outputType}
                </span>
            </div>
            <pre id="output" className="output" aria-live="polite" aria-atomic="true">
                {output}
            </pre>
            <p id="status" className="status" data-state={state} role="status">
                {status}
            </p>
            <pre className="usage-snippet">{usageSnippet}</pre>
        </aside>
    );
};
