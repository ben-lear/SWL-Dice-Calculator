import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AttackTypeSelector } from './components';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const isSimulator = location.pathname === '/';

  useEffect(() => {
    document.title = isSimulator
      ? 'Just Roll Crits — Simulator'
      : 'Just Roll Crits — List Analyzer';
  }, [isSimulator]);

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-gray-800 bg-gray-950/95 px-4 py-2 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 px-4">
          <div className="flex items-center gap-3">
            <img src="/justrollcrits_compressed.png" alt="Just Roll Crits logo" className="hidden sm:block h-16 w-16" />
            <div className="flex flex-col">
              <h1 className="text-lg font-bold tracking-tight">
                Just Roll Crits
              </h1>
              <p className="hidden sm:block text-xs text-gray-400">
                A SW:Legion Dice Calculator
              </p>
            </div>
            <nav className="ml-4 flex items-center gap-2">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `rounded px-2 py-1 text-sm transition-colors ${
                    isActive
                      ? 'font-semibold text-white'
                      : 'text-gray-400 hover:text-gray-200'
                  }`
                }
              >
                Simulator
              </NavLink>
              <NavLink
                to="/list"
                className={({ isActive }) =>
                  `rounded px-2 py-1 text-sm transition-colors ${
                    isActive
                      ? 'font-semibold text-white'
                      : 'text-gray-400 hover:text-gray-200'
                  }`
                }
              >
                List Analyzer
              </NavLink>
            </nav>
          </div>
          {isSimulator && (
            <div className="w-full sm:w-auto">
              <AttackTypeSelector />
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 p-4">
        {children}
      </main>
    </div>
  );
}
