import Layout from './Layout';
import { AttackerPanel, DefenderPanel } from './components';

export default function App() {
  return (
    <Layout>
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-0 lg:divide-x lg:divide-gray-800">
        <div className="min-h-0 lg:overflow-y-auto lg:pr-4">
          <AttackerPanel />
        </div>

        <div className="flex min-h-0 items-center justify-center rounded-lg border border-gray-800 bg-gray-900 p-8 text-gray-500 lg:mx-4 lg:overflow-y-auto">
          <p className="text-sm italic">Results will appear here</p>
        </div>

        <div className="min-h-0 lg:overflow-y-auto lg:pl-4">
          <DefenderPanel />
        </div>
      </div>
    </Layout>
  );
}
