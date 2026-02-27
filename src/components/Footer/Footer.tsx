import { useState } from 'react';
import { BugReportModal } from './BugReportModal';

const CONTACT_EMAIL = 'imperialsympathizer@gmail.com';
const CURRENT_YEAR = new Date().getFullYear();

export default function Footer() {
  const [isBugReportOpen, setIsBugReportOpen] = useState(false);

  return (
    <footer className="border-t border-gray-700 bg-gray-900">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-3 sm:gap-6">
        {/* Contact */}
        <div className="flex flex-col gap-1">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Contact</h3>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-sm text-blue-400 underline transition-colors hover:text-blue-300"
          >
            {CONTACT_EMAIL}
          </a>
        </div>

        {/* Bug Report */}
        <div className="flex flex-col gap-1">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Found a Bug?</h3>
          <p className="text-xs text-gray-400">
            Help us improve by reporting issues you encounter.
          </p>
          <button
            onClick={() => setIsBugReportOpen(true)}
            className="mt-1 w-fit rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-500"
          >
            Report a Bug
          </button>
        </div>

        {/* About */}
        <div className="flex flex-col gap-1">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Just Roll Crits
          </h3>
          <p className="text-xs text-gray-400">
            Star Wars: Legion attack sequence simulator
          </p>
          <p className="text-xs text-gray-500">
            This tool is not affiliated with or endorsed by Atomic Mass Games or
            Lucasfilm Ltd.
          </p>
          <p className="text-xs text-gray-500">
            &copy; {CURRENT_YEAR} Just Roll Crits
          </p>
        </div>
      </div>

      <BugReportModal
        isOpen={isBugReportOpen}
        onClose={() => setIsBugReportOpen(false)}
      />
    </footer>
  );
}
