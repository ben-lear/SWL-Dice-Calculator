import Layout from './Layout';
import { AttackerPanel, DefenderPanel, ResultsPanel } from './components';

export default function App() {
  return (
    <Layout>
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-0 lg:divide-x lg:divide-gray-800">
        <div className="min-h-0 lg:overflow-y-auto lg:pr-4">
          <AttackerPanel />
        </div>

        <div className="min-h-0 lg:overflow-y-auto lg:px-4">
          <ResultsPanel />
        </div>

        <div className="min-h-0 lg:overflow-y-auto lg:pl-4">
          <DefenderPanel />
        </div>
      </div>
    </Layout>
  );
}
