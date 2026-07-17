import { operatorDefinitions } from '../constants';

export const OperatorReference = () => {
    return (
        <section className="reference" aria-labelledby="reference-heading">
            <div>
                <p className="section-kicker">Reference</p>
                <h2 id="reference-heading">Operators</h2>
            </div>
            <div className="operator-table-wrap">
                <table className="operator-table">
                    <thead>
                        <tr>
                            <th>Signature</th>
                            <th>Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        {operatorDefinitions.map((operator) => (
                            <tr key={operator.name}>
                                <td>
                                    <code>{operator.signature}</code>
                                </td>
                                <td>{operator.description}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
};
