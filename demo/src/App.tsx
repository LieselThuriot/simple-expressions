import { Footer } from './components/Footer';
import { Hero } from './components/Hero';
import { OperatorReference } from './components/OperatorReference';
import { Playground } from './components/Playground';
import { ThemeToggle } from './components/ThemeToggle';

export const App = () => {
    return (
        <>
            <ThemeToggle />
            <main className="page-shell">
                <Hero />
                <Playground />
                <OperatorReference />
                <Footer />
            </main>
        </>
    );
};
