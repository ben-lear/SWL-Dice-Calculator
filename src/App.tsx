import Layout from './Layout';

export default function App() {
  return (
    <Layout>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto_1fr]">
        {/* Attacker Panel */}
        <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-red-400">
            Attacker
          </h2>
          <p className="text-sm text-gray-500">Attacker inputs go here</p>
        </section>

        {/* Results Panel */}
        <section className="rounded-lg border border-gray-800 bg-gray-900 p-4 lg:w-72">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-yellow-400">
            Results
          </h2>
          <p className="text-sm text-gray-500">Simulation results go here</p>
        </section>

        {/* Defender Panel */}
        <section className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-blue-400">
            Defender
          </h2>
          <p className="text-sm text-gray-500">Defender inputs go here</p>
        </section>
      </div>
    </Layout>
  );
}
