import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import App from './App';

// Mock the useSimulation hook to avoid Web Worker in test environment
vi.mock('./hooks/useSimulation', () => ({
  useSimulation: vi.fn(),
}));

describe('App', () => {
  it('renders the app shell', () => {
    render(<App />);

    expect(screen.getByText(/Just Roll Crits/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Attack Type')).toBeInTheDocument();
    expect(screen.getByText('Attacker')).toBeInTheDocument();
    expect(screen.getByText('Defender')).toBeInTheDocument();
    expect(screen.getByText('Results')).toBeInTheDocument();
  });
});
