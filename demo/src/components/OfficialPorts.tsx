const ports = [
    {
        name: 'C#',
        platform: '.NET',
        description: 'Use simple expressions in .NET applications.',
        image: 'simple-expressions-sharp.png',
        href: 'https://github.com/LieselThuriot/simple-expressions.sharp'
    },
    {
        name: 'Dart',
        platform: 'Dart / Flutter',
        description: 'Bring the same expression language to Dart and Flutter.',
        image: 'simple-expressions-dart.png',
        href: 'https://github.com/LieselThuriot/simple-expressions.dart'
    }
];

export const OfficialPorts = () => {
    return (
        <section className="ports" aria-labelledby="official-ports-title">
            <div className="ports-heading">
                <div>
                    <div className="section-kicker">Official ports</div>
                    <h2 id="official-ports-title">Use simple expressions beyond JavaScript.</h2>
                </div>
                <p>Maintained implementations for other popular application platforms.</p>
            </div>
            <div className="port-grid">
                {ports.map((port) => (
                    <a className="port-card" href={port.href} target="_blank" rel="noreferrer" key={port.name}>
                        <img
                            className="port-icon"
                            src={`${import.meta.env.BASE_URL}${port.image}`}
                            alt=""
                            aria-hidden="true"
                        />
                        <span className="port-card-content">
                            <span className="port-name-row">
                                <span className="port-name">{port.name}</span>
                                <span className="port-platform">{port.platform}</span>
                            </span>
                            <span className="port-description">{port.description}</span>
                            <span className="port-link">View repository <span aria-hidden="true">↗</span></span>
                        </span>
                    </a>
                ))}
            </div>
        </section>
    );
};
