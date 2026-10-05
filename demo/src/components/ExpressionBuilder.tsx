import { lazy, Suspense, useState } from 'react';
import { evaluatePlayground } from '../playground';
import { builderOperatorDefinitions, builderOperatorGroups, builderSamples, changeBuilderOperator, createBuilderNode, getBuilderReferencePaths, serializeBuilder, type BuilderNode, type BuilderValue } from '../expression-builder';
const ModelEditor = lazy(() => import('./ModelEditor').then(({ ModelEditor }) => ({ default: ModelEditor })));
const ExpressionEditor = lazy(() => import('./ExpressionEditor').then(({ ExpressionEditor }) => ({ default: ExpressionEditor })));

const updateValue = (values: BuilderValue[], index: number, value: BuilderValue): BuilderValue[] => values.map((item, itemIndex) => itemIndex === index ? value : item);
const createValue = (kind: string, referencePaths: string[]): BuilderValue => {
    if (kind === 'reference') return { kind: 'reference', value: referencePaths[0] ?? '#field' };
    if (kind === 'number') return { kind: 'number', value: '0' };
    if (kind === 'boolean') return { kind: 'boolean', value: true };
    if (kind === 'list') return { kind: 'list', items: [{ kind: 'string', value: 'value' }] };
    if (kind === 'call') return createBuilderNode();
    return { kind: 'string', value: 'value' };
};

const ValueBlock = ({ value, referencePaths, onChange, onRemove }: { value: BuilderValue; referencePaths: string[]; onChange: (value: BuilderValue) => void; onRemove?: () => void }) => {
    if (value.kind === 'call') return <NodeBlock node={value} referencePaths={referencePaths} onChange={onChange} onRemove={onRemove} />;
    if (value.kind === 'list') return <div className="builder-value builder-list"><div className="builder-list-heading"><select aria-label="Value type" value={value.kind} onChange={(event) => onChange(createValue(event.target.value, referencePaths))}><option value="string">string</option><option value="number">number</option><option value="boolean">boolean</option><option value="reference">reference</option><option value="list">list</option><option value="call">expression</option></select><span className="builder-value-title">list</span>{onRemove && <button className="builder-remove" type="button" onClick={onRemove}>remove</button>}</div>{value.items.map((item, index) => <ValueBlock key={index} value={item} referencePaths={referencePaths} onChange={(next) => onChange({ ...value, items: updateValue(value.items, index, next) })} onRemove={() => onChange({ ...value, items: value.items.filter((_, itemIndex) => itemIndex !== index) })} />)}<button className="builder-add" type="button" onClick={() => onChange({ ...value, items: [...value.items, { kind: 'string', value: 'value' }] })}>+ item</button></div>;
    if (value.kind === 'reference') {
        const options = referencePaths.includes(value.value) ? referencePaths : [value.value, ...referencePaths];
        return <div className="builder-value builder-reference"><select aria-label="Value type" value={value.kind} onChange={(event) => onChange(createValue(event.target.value, referencePaths))}><option value="string">string</option><option value="number">number</option><option value="boolean">boolean</option><option value="reference">reference</option><option value="list">list</option><option value="call">expression</option></select><select aria-label="Reference field" value={value.value} onChange={(event) => onChange({ ...value, value: event.target.value })}>{options.map((path) => <option key={path} value={path}>{path}</option>)}</select>{onRemove && <button className="builder-remove" type="button" onClick={onRemove}>remove</button>}</div>;
    }
    if (value.kind === 'string' || value.kind === 'number') return <div className="builder-value"><select aria-label="Value type" value={value.kind} onChange={(event) => onChange(createValue(event.target.value, referencePaths))}><option value="string">string</option><option value="number">number</option><option value="boolean">boolean</option><option value="reference">reference</option><option value="list">list</option><option value="call">expression</option></select><input aria-label={`${value.kind} value`} type={value.kind === 'number' ? 'number' : 'text'} value={value.value} onChange={(event) => onChange({ ...value, value: event.target.value })} />{onRemove && <button className="builder-remove" type="button" onClick={onRemove}>remove</button>}</div>;
    if (value.kind === 'boolean') return <div className="builder-value"><select aria-label="Value type" value={value.kind} onChange={(event) => onChange(createValue(event.target.value, referencePaths))}><option value="string">string</option><option value="number">number</option><option value="boolean">boolean</option><option value="reference">reference</option><option value="list">list</option><option value="call">expression</option></select><select aria-label="Boolean value" value={String(value.value)} onChange={(event) => onChange({ ...value, value: event.target.value === 'true' })}><option value="true">true</option><option value="false">false</option></select>{onRemove && <button className="builder-remove" type="button" onClick={onRemove}>remove</button>}</div>;
};

const NodeBlock = ({ node, referencePaths, onChange, onRemove }: { node: BuilderNode; referencePaths: string[]; onChange: (node: BuilderNode) => void; onRemove?: () => void }) => {
    const definition = builderOperatorDefinitions.find((item) => item.name === node.operator);
    const canAdd = definition?.arity === 'variadic' || node.args.length < (definition?.arity ?? 0);
    return <div className="builder-node"><div className="builder-node-heading"><select className="builder-operator-select" aria-label="Operator" value={node.operator} onChange={(event) => onChange(changeBuilderOperator(node, event.target.value))}>{builderOperatorGroups.map((group) => <optgroup key={group.category} label={group.category}>{group.operators.map((item) => <option key={item.name} value={item.name}>{item.name} · {item.detail}</option>)}</optgroup>)}</select>{onRemove && <button className="builder-remove" type="button" onClick={onRemove}>remove</button>}</div><div className="builder-args">{node.args.map((arg, index) => <ValueBlock key={index} value={arg} referencePaths={referencePaths} onChange={(next) => onChange({ ...node, args: updateValue(node.args, index, next) })} onRemove={node.args.length > 1 ? () => onChange({ ...node, args: node.args.filter((_, itemIndex) => itemIndex !== index) }) : undefined} />)}</div>{canAdd && <button className="builder-add" type="button" onClick={() => onChange({ ...node, args: [...node.args, createValue('string', referencePaths)] })}>+ argument</button>}</div>;
};

export const ExpressionBuilder = () => {
    const firstSample = builderSamples[0]!;
    const [node, setNode] = useState<BuilderNode>(firstSample.node);
    const [model, setModel] = useState(firstSample.model);
    const [sample, setSample] = useState(firstSample.id);
    const expression = serializeBuilder(node);
    const referencePaths = getBuilderReferencePaths(model);
    const result = evaluatePlayground(model, expression);
    const panelClass = result.ok ? 'is-success' : 'is-error';
    const output = result.ok ? result.value.display : result.error;
    const outputType = result.ok ? result.value.type : 'error';
    const loadSample = (id: string) => { const item = builderSamples.find((candidate) => candidate.id === id); if (item) { setSample(id); setNode(item.node); setModel(item.model); } };
    return (
        <section className="feature-section" aria-labelledby="builder-heading">
            <div className="builder-grid">
                <div className="builder-card">
                    <div className="section-heading">
                        <div>
                            <p className="section-kicker">Builder</p>
                            <h2 id="builder-heading">Assemble an expression visually</h2>
                            <p className="builder-description">Choose operators, compose nested blocks, and see the expression evaluate against your sample model.</p>
                        </div>
                        <label className="example-picker">Load a sample<select value={sample} onChange={(event) => loadSample(event.target.value)}>{builderSamples.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
                    </div>
                    <div className="field-label"><span>Expression blocks</span><span className="field-hint">ALL OPERATORS</span></div>
                    <NodeBlock node={node} referencePaths={referencePaths} onChange={setNode} />
                    <div className="builder-actions"><button className="button button-quiet" type="button" onClick={() => setNode(createBuilderNode())}>Clear blocks</button></div>
                </div>
                <aside className={`builder-card builder-result-panel result-panel ${panelClass}`} aria-labelledby="builder-result-heading">
                    <div className="result-topline">
                        <div>
                            <p className="section-kicker">Output</p>
                        </div>
                        <span className="result-type" title={outputType}>{outputType}</span>
                    </div>
                    <div className="builder-inputs">
                        <div className="field-label"><span id="builder-expression-label">Created expression</span><span className="field-hint">PREVIEW</span></div>
                        <Suspense fallback={<div className="expression-editor expression-input editor-loading" role="status" aria-label="Loading editor" />}><ExpressionEditor value={expression} onChange={() => undefined} getModelText={() => model} readOnly /></Suspense>
                        <div className="field-label"><span id="builder-model-label">Sample model</span><span className="field-hint">JSON</span></div>
                        <Suspense fallback={<div className="code-input model-input editor-loading" role="status" aria-label="Loading editor" />}><ModelEditor value={model} onChange={setModel} /></Suspense>
                    </div>
                    <div className="field-label"><span id="builder-result-heading">Result</span></div>
                    <pre className="output builder-output" aria-live="polite" aria-atomic="true">{output}</pre>
                    <p className="status" data-state={result.ok ? 'success' : 'error'} role="status">{result.ok ? 'Evaluation successful' : 'Could not evaluate expression'}</p>
                </aside>
            </div>
        </section>
    );
};
