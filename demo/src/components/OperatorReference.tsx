import { operatorDefinitions } from '../constants';

const operatorCategories = [...new Set(operatorDefinitions.map((operator) => operator.category))];

export const OperatorReference = () => {
    return (
        <section className="reference" aria-labelledby="reference-heading">
            <div>
                <p className="section-kicker">Reference</p>
                <h2 id="reference-heading">Operators</h2>
            </div>
            <div className="operator-table-wrap">
                {operatorCategories.map((category) => (
                    <section className="operator-subsection" key={category} aria-labelledby={`operator-${category}`}>
                        <h3 id={`operator-${category}`}>{category}</h3>
                        <table className="operator-table">
                            <thead>
                                <tr>
                                    <th>Signature</th>
                                    <th>Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                {operatorDefinitions.filter((operator) => operator.category === category).map((operator) => (
                                    <tr key={operator.name}>
                                        <td><code>{operator.signature}</code></td>
                                        <td>{operator.description}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>
                ))}
            </div>
        </section>
    );
};
