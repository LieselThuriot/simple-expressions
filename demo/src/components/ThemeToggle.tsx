import { useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

const getStoredTheme = (): Theme | null => {
    const stored = localStorage.getItem('theme');
    if (stored === 'dark' || stored === 'light') {
        return stored;
    }
    return null;
};

const getEffectiveTheme = (prefersDark: boolean): Theme => {
    return getStoredTheme() ?? (prefersDark ? 'dark' : 'light');
};

export const ThemeToggle = () => {
    const [theme, setTheme] = useState<Theme>(() =>
        getEffectiveTheme(window.matchMedia('(prefers-color-scheme: dark)').matches)
    );

    useEffect(() => {
        document.documentElement.dataset.theme = theme;
    }, [theme]);

    useEffect(() => {
        const media = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = (event: MediaQueryListEvent): void => {
            if (!getStoredTheme()) {
                setTheme(event.matches ? 'dark' : 'light');
            }
        };
        media.addEventListener('change', handler);
        return () => media.removeEventListener('change', handler);
    }, []);

    const toggleTheme = (): void => {
        const next: Theme = theme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('theme', next);
        setTheme(next);
    };

    return (
        <button
            className="theme-toggle"
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
            <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
        </button>
    );
};
