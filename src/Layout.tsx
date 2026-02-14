interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <h1 className="text-lg font-bold tracking-tight">
            ⚔️ Just Roll Crits
          </h1>
          {/* Attack type selector goes here (Phase 6C) */}
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl p-4">
        {children}
      </main>
    </div>
  );
}
