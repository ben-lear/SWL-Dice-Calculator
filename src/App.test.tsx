import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import SimulatorPage from './pages/SimulatorPage';

// Mock the useSimulation hook to avoid Web Worker in test environment
vi.mock('./hooks/useSimulation', () => ({
  useSimulation: () => ({ runSimulation: vi.fn() }),
}));

function renderWithRouter(initialPath = '/') {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <App />,
        children: [{ index: true, element: <SimulatorPage /> }],
      },
    ],
    { initialEntries: [initialPath] },
  );
  return render(<RouterProvider router={router} />);
}

describe('App', () => {
  it('renders the app shell', () => {
    renderWithRouter();

    expect(screen.getByText(/Just Roll Crits/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Attack Type')).toBeInTheDocument();
    expect(screen.getByText('Attacker')).toBeInTheDocument();
    expect(screen.getByText('Defender')).toBeInTheDocument();
    expect(screen.getByText('Results')).toBeInTheDocument();
  });
});
