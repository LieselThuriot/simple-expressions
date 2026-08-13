import { Footer } from './components/Footer';
import { Hero } from './components/Hero';
import { OfficialPorts } from './components/OfficialPorts';
import { OperatorReference } from './components/OperatorReference';
import { Playground } from './components/Playground';
import { ThemeToggle } from './components/ThemeToggle';
import { ExpressionBuilder } from './components/ExpressionBuilder';

export const App = () => {
    return (
        <>
            <ThemeToggle />
            <main className="page-shell">
                <Hero />
                <Playground />
                <OperatorReference />
                <ExpressionBuilder />
                <OfficialPorts />
                <Footer />
            </main>
        </>
    );
};
