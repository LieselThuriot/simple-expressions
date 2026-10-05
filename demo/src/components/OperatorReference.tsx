import { operatorCategoryDescriptions, operatorDefinitions } from '../constants';

const operatorCategories = [...new Set(operatorDefinitions.map((operator) => operator.category))];

export const OperatorReference = () => {
    return (
        <section className="reference" aria-labelledby="reference-heading">
            <div className="reference-intro">
                <p className="section-kicker">Reference</p>
                <h2 id="reference-heading">Operators</h2>
                <p>Everything available in the expression language, organized by the job it does.</p>
            </div>
            <div className="operator-catalog">
                {operatorCategories.map((category) => (
                    <section className="operator-subsection" key={category} aria-labelledby={`operator-${category}`}>
                        <div className="operator-category-heading">
                            <h3 id={`operator-${category}`}>{category}</h3>
                            <p>{operatorCategoryDescriptions[category]}</p>
                            {category === 'Arithmetic' && <p className="operator-category-note">Nested lists are flattened depth-first before calculation.</p>}
                        </div>
                        <div className="operator-grid">
                            {operatorDefinitions.filter((operator) => operator.category === category).map((operator) => (
                                <article className="operator-card" key={operator.name}>
                                    <div className="operator-card-topline">
                                        <strong>{operator.name}</strong>
                                        <span>{operator.detail}</span>
                                    </div>
                                    <code className="operator-signature">{operator.signature}</code>
                                    <p>{operator.description}</p>
                                </article>
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        </section>
    );
};
