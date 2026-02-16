import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders the app shell', () => {
    render(<App />);

    expect(screen.getByText(/Just Roll Crits/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Attack Type')).toBeInTheDocument();
    expect(screen.getByText('Attacker')).toBeInTheDocument();
    expect(screen.getByText('Defender')).toBeInTheDocument();
    expect(screen.getByText('Results will appear here')).toBeInTheDocument();
  });
});
