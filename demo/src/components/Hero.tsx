import { heroSnippet } from '../constants';

export const Hero = () => {
    return (
        <header className="hero">
            <div className="brand-row">
                <img
                    className="brand-logo"
                    src={`${import.meta.env.BASE_URL}simple-expressions.png`}
                    alt="simple-expressions logo"
                />
                <div className="brand-details">
                    <div className="eyebrow">
                        <span className="eyebrow-dot"></span> simple-expressions <span className="version">v0.1.1</span>
                    </div>
                    <p className="brand-tagline">A small expression evaluator. No dependencies.</p>
                </div>
            </div>
            <h1>Parse and evaluate simple expressions.</h1>
            <p className="hero-copy">
                Pass a JSON model, write an expression, get back a typed result. Dependency-free, works in any
                JavaScript or TypeScript app.
            </p>
            <pre className="hero-snippet">{heroSnippet}</pre>
            <div className="hero-footer">
                <a
                    className="text-link"
                    href="https://github.com/LieselThuriot/simple-expressions"
                    target="_blank"
                    rel="noreferrer"
                >
                    See it on GitHub <span aria-hidden="true">↗</span>
                </a>
            </div>
        </header>
    );
};
