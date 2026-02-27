import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Footer from './Footer';

vi.mock('@emailjs/browser', () => ({
  default: {
    send: vi.fn(() => Promise.resolve({ status: 200, text: 'OK' })),
  },
}));

const emailjs = vi.mocked(
  (await import('@emailjs/browser')).default
);

beforeEach(() => {
  vi.stubEnv('VITE_EMAILJS_SERVICE_ID', 'test_service');
  vi.stubEnv('VITE_EMAILJS_TEMPLATE_ID', 'test_template');
  vi.stubEnv('VITE_EMAILJS_PUBLIC_KEY', 'test_key');
  vi.mocked(emailjs.send).mockImplementation(() =>
    Promise.resolve({ status: 200, text: 'OK' })
  );
});

function renderFooter() {
  return render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>
  );
}

describe('Footer', () => {
  it('renders the contact email as a mailto link', () => {
    renderFooter();
    const emailLink = screen.getByRole('link', {
      name: 'imperialsympathizer@gmail.com',
    });
    expect(emailLink).toHaveAttribute(
      'href',
      'mailto:imperialsympathizer@gmail.com'
    );
  });

  it('renders the disclaimer text', () => {
    renderFooter();
    expect(
      screen.getByText(/not affiliated with or endorsed by Atomic Mass Games/i)
    ).toBeInTheDocument();
  });

  it('renders the app name and tagline', () => {
    renderFooter();
    expect(screen.getByText('Just Roll Crits')).toBeInTheDocument();
    expect(
      screen.getByText('Star Wars: Legion attack sequence simulator')
    ).toBeInTheDocument();
  });

  it('renders a copyright line', () => {
    renderFooter();
    const year = new Date().getFullYear();
    expect(
      screen.getByText(`© ${year} Just Roll Crits`)
    ).toBeInTheDocument();
  });

  it('opens the bug report modal when clicking "Report a Bug"', async () => {
    const user = userEvent.setup();
    renderFooter();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /report a bug/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('Summary')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
  });

  it('closes the modal when pressing Escape', async () => {
    const user = userEvent.setup();
    renderFooter();

    await user.click(screen.getByRole('button', { name: /report a bug/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes the modal when clicking the backdrop', async () => {
    const user = userEvent.setup();
    renderFooter();

    await user.click(screen.getByRole('button', { name: /report a bug/i }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();

    // Click the backdrop (the dialog's outer container)
    await user.click(dialog);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes the modal when clicking the close button', async () => {
    const user = userEvent.setup();
    renderFooter();

    await user.click(screen.getByRole('button', { name: /report a bug/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /close dialog/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('sends a bug report via EmailJS on form submit', async () => {
    const user = userEvent.setup();
    renderFooter();

    await user.click(screen.getByRole('button', { name: /report a bug/i }));

    await user.type(screen.getByLabelText('Summary'), 'Test bug report');
    await user.type(
      screen.getByLabelText('Description'),
      'Steps to reproduce'
    );
    await user.click(screen.getByRole('button', { name: /send report/i }));

    expect(emailjs.send).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      {
        subject: 'Test bug report',
        message: 'Steps to reproduce',
      },
      expect.objectContaining({ publicKey: expect.any(String) })
    );

    // Should show success message
    await waitFor(() => {
      expect(
        screen.getByText(/bug report sent successfully/i)
      ).toBeInTheDocument();
    });
  });

  it('shows an error message when EmailJS fails', async () => {
    vi.mocked(emailjs.send).mockRejectedValueOnce(new Error('Network error'));

    const user = userEvent.setup();
    renderFooter();

    await user.click(screen.getByRole('button', { name: /report a bug/i }));

    const summaryInput = screen.getByLabelText('Summary');
    const descInput = screen.getByLabelText('Description');
    await user.type(summaryInput, 'Failing report test');
    await user.type(descInput, 'Some description text');

    const submitBtn = screen.getByRole('button', { name: /send report/i });
    expect(submitBtn).not.toBeDisabled();
    
    await user.click(submitBtn);

    // Wait for the emailjs.send to have been called
    await waitFor(() => {
      expect(emailjs.send).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    // Modal should still be open so user can retry
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('disables submit when summary is too short', async () => {
    const user = userEvent.setup();
    renderFooter();

    await user.click(screen.getByRole('button', { name: /report a bug/i }));

    // Type only 3 characters (below minimum of 5)
    await user.type(screen.getByLabelText('Summary'), 'abc');
    expect(screen.getByText(/minimum 5 characters required/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send report/i })).toBeDisabled();
  });

  it('shows character counts for summary and description', async () => {
    const user = userEvent.setup();
    renderFooter();

    await user.click(screen.getByRole('button', { name: /report a bug/i }));

    // Initially 0/100 and 0/2000
    expect(screen.getByText('0/100')).toBeInTheDocument();
    expect(screen.getByText('0/2000')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Summary'), 'Hello');
    expect(screen.getByText('5/100')).toBeInTheDocument();
  });

  it('sanitizes HTML entities in submitted values', async () => {
    const user = userEvent.setup();
    renderFooter();

    await user.click(screen.getByRole('button', { name: /report a bug/i }));

    await user.type(
      screen.getByLabelText('Summary'),
      '<script>alert("xss")'
    );
    await user.click(screen.getByRole('button', { name: /send report/i }));

    expect(emailjs.send).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        subject: '&lt;script&gt;alert(&quot;xss&quot;)',
      }),
      expect.objectContaining({ publicKey: expect.any(String) })
    );
  });

  it('enforces max length on summary input', async () => {
    const user = userEvent.setup();
    renderFooter();

    await user.click(screen.getByRole('button', { name: /report a bug/i }));

    const longString = 'a'.repeat(120);
    await user.type(screen.getByLabelText('Summary'), longString);

    // Should be capped at 100
    expect(screen.getByLabelText('Summary')).toHaveValue('a'.repeat(100));
  });
});
