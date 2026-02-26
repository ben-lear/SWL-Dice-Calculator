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
    <div className="flex min-h-screen flex-col overflow-x-clip bg-gray-950 text-gray-100">
      {/* Row 1 — Branding (scrolls away) */}
      <div className="border-b border-gray-800 bg-gray-950 px-4 py-2">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <img src="/justrollcrits_compressed.png" alt="Just Roll Crits logo" className="h-8 w-8 shrink-0 sm:h-16 sm:w-16" />
          <div className="flex flex-col">
            <h1 className="text-lg font-bold tracking-tight">
              Just Roll Crits
            </h1>
            <p className="text-xs text-gray-400">
              A SW:Legion Dice Calculator
            </p>
          </div>
        </div>
      </div>

      {/* Row 2 — Navigation + Attack Type (sticky) */}
      <header className="sticky top-0 z-20 border-b border-gray-800 bg-gray-950/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-1.5 px-4 py-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
          <nav className="flex items-center justify-end gap-2 sm:justify-start">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
                }`
              }
            >
              Simulator
            </NavLink>
            <NavLink
              to="/list"
              className={({ isActive }) =>
                `rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
                }`
              }
            >
              List Analyzer
            </NavLink>
          </nav>
          {isSimulator && (
            <div className="self-end sm:self-auto">
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
