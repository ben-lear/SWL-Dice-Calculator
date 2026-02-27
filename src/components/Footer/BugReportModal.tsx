import emailjs from '@emailjs/browser';
import { useCallback, useEffect, useId, useRef, useState } from 'react';

interface BugReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SubmitStatus = 'idle' | 'sending' | 'success' | 'error' | 'cooldown';

const SUMMARY_MIN = 5;
const SUMMARY_MAX = 100;
const DESCRIPTION_MAX = 2000;

/** Escape HTML entities to prevent XSS when values are rendered in email templates. */
function sanitize(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/** Strip control characters (except newline/tab) that could be used for injection. */
function stripControlChars(input: string): string {
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

const COOLDOWN_MS = 60_000;

export function BugReportModal({ isOpen, onClose }: BugReportModalProps) {
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const summaryId = useId();
  const descriptionId = useId();
  const titleId = useId();
  const summaryRef = useRef<HTMLInputElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus the summary input when modal opens
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => summaryRef.current?.focus());
    }
  }, [isOpen]);

  // Reset status when modal is re-opened
  const prevIsOpenRef = useRef(false);
  useEffect(() => {
    // Only reset when transitioning from closed → open
    if (isOpen && !prevIsOpenRef.current) {
      setStatus('idle');
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  // Cleanup cooldown timer on unmount
  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    };
  }, []);

  const startCooldown = useCallback(() => {
    setStatus('cooldown');
    setCooldownRemaining(COOLDOWN_MS);
    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    cooldownTimerRef.current = setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1000) {
          if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
          setStatus('idle');
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);
  }, []);

  if (!isOpen) return null;

  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
  const isConfigured = Boolean(serviceId && templateId && publicKey);

  const trimmedSummary = summary.trim();
  const trimmedDescription = description.trim();
  const isSummaryValid =
    trimmedSummary.length >= SUMMARY_MIN &&
    trimmedSummary.length <= SUMMARY_MAX;
  const isDescriptionValid = trimmedDescription.length <= DESCRIPTION_MAX;
  const isFormValid = isSummaryValid && isDescriptionValid;

  const handleSummaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = stripControlChars(e.target.value);
    if (cleaned.length <= SUMMARY_MAX) setSummary(cleaned);
  };

  const handleDescriptionChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const cleaned = stripControlChars(e.target.value);
    if (cleaned.length <= DESCRIPTION_MAX) setDescription(cleaned);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConfigured || !isFormValid) {
      setStatus('error');
      return;
    }

    setStatus('sending');

    try {
      await emailjs.send(
        serviceId,
        templateId,
        {
          subject: sanitize(trimmedSummary),
          message: sanitize(trimmedDescription),
        },
        { publicKey }
      );
      setStatus('success');
      setSummary('');
      setDescription('');
      startCooldown();
    } catch {
      setStatus('error');
    }
  };

  const handleBackdropClick = () => {
    onClose();
  };

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const isSending = status === 'sending';
  const isCooldown = status === 'cooldown';
  const isDisabled = isSending || isCooldown;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/70 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        className="mx-4 w-full max-w-lg rounded-lg border border-gray-700 bg-gray-900 p-6"
        onClick={handleCardClick}
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 id={titleId} className="text-lg font-semibold text-gray-100">
            Report a Bug
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 transition-colors hover:text-gray-100"
            aria-label="Close dialog"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* Form */}
        {status === 'success' || status === 'cooldown' ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <p className="text-sm text-green-400">
              Bug report sent successfully! Thank you for your feedback.
            </p>
            {isCooldown && (
              <p className="text-xs text-gray-500">
                You can submit another report in{' '}
                {Math.ceil(cooldownRemaining / 1000)}s.
              </p>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between">
                <label htmlFor={summaryId} className="text-sm text-gray-300">
                  Summary
                </label>
                <span
                  className={`text-xs ${
                    trimmedSummary.length > 0 && !isSummaryValid
                      ? 'text-red-400'
                      : 'text-gray-500'
                  }`}
                >
                  {trimmedSummary.length}/{SUMMARY_MAX}
                </span>
              </div>
              <input
                ref={summaryRef}
                id={summaryId}
                type="text"
                value={summary}
                onChange={handleSummaryChange}
                placeholder="Brief description of the issue"
                maxLength={SUMMARY_MAX}
                disabled={isDisabled}
                className="rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
              />
              {trimmedSummary.length > 0 &&
                trimmedSummary.length < SUMMARY_MIN && (
                  <p className="text-xs text-red-400">
                    Minimum {SUMMARY_MIN} characters required.
                  </p>
                )}
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between">
                <label
                  htmlFor={descriptionId}
                  className="text-sm text-gray-300"
                >
                  Description
                </label>
                <span
                  className={`text-xs ${
                    trimmedDescription.length > DESCRIPTION_MAX
                      ? 'text-red-400'
                      : 'text-gray-500'
                  }`}
                >
                  {trimmedDescription.length}/{DESCRIPTION_MAX}
                </span>
              </div>
              <textarea
                id={descriptionId}
                value={description}
                onChange={handleDescriptionChange}
                placeholder="Steps to reproduce, expected vs. actual behavior, etc."
                rows={5}
                maxLength={DESCRIPTION_MAX}
                disabled={isDisabled}
                className="rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>

            {status === 'error' && (
              <p className="text-sm text-red-400" role="alert">
                {isConfigured
                  ? 'Failed to send report. Please try again.'
                  : 'Bug reporting is not configured. Please contact us via email.'}
              </p>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSending}
                className="rounded px-4 py-2 text-sm text-gray-400 transition-colors hover:text-gray-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isDisabled || !isFormValid}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
              >
                {isSending ? 'Sending...' : 'Send Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
