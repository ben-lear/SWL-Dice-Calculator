/// <reference lib="webworker" />

import { simulate } from '../simulator';
import type { WorkerRequest, WorkerResponse } from './protocol';

/**
 * Web Worker entry point for simulation.
 *
 * Receives SimulationRequest messages, runs the simulation synchronously
 * (blocking this thread only — main thread stays responsive), and posts
 * back the results.
 */
self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const message = event.data;

  switch (message.type) {
    case 'run': {
      try {
        const result = simulate(message.config, message.iterations);

        const response: WorkerResponse = {
          type: 'result',
          id: message.id,
          result,
        };
        self.postMessage(response);
      } catch (err) {
        const response: WorkerResponse = {
          type: 'error',
          id: message.id,
          error: err instanceof Error ? err.message : String(err),
        };
        self.postMessage(response);
      }
      break;
    }

    case 'cancel': {
      // MVP: No-op. Cancellation is handled by the main thread
      // discarding results with non-matching IDs.
      // Future: could use AbortController or chunked iteration
      // to actually stop mid-simulation.
      break;
    }
  }
};
