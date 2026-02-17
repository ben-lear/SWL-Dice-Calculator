import Layout from './Layout';
import { AttackerPanel, DefenderPanel, ResultsPanel } from './components';

export default function App() {
  return (
    <Layout>
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:auto-rows-fr lg:grid-cols-3 lg:gap-0 lg:divide-x lg:divide-gray-800">
        <div className="order-1 flex min-h-0 flex-col lg:pr-4">
          <div className="flex-1 overflow-y-auto">
            <AttackerPanel />
          </div>
        </div>

        <div className="order-3 flex min-h-0 flex-col lg:order-2 lg:px-4">
          <div className="flex-1 overflow-y-auto">
            <ResultsPanel />
          </div>
        </div>

        <div className="order-2 flex min-h-0 flex-col lg:order-3 lg:pl-4">
          <div className="flex-1 overflow-y-auto">
            <DefenderPanel />
          </div>
        </div>
      </div>
    </Layout>
  );
}
