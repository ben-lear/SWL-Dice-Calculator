import type { AttackConfig, SimulationResult } from '../types';
import type { BatchSimulationRequest, WorkerResponse } from './protocol';
import type { WorkerLike } from './simulationWorkerClient';

// Vite requires the literal `new Worker(new URL(...))` pattern to detect and
// bundle the worker for production builds. Declare constructor locally to
// avoid DOM/webworker type conflicts (matching simulationWorkerClient.ts).
declare const Worker: {
  new (scriptURL: URL, options: { type: string }): unknown;
};

/**
 * A single job in a batch simulation request.
 */
export interface BatchJob {
  jobId: string;
  config: AttackConfig;
  iterations: number;
}

/**
 * Batch-aware worker client for running multiple simulations in a single
 * round-trip. Uses the same Web Worker as SimulationWorkerClient, but sends
 * a 'batch' message type and receives an atomic 'batch-result' response.
 *
 * "Latest wins" design: calling runBatch() while a prior batch is pending
 * silently supersedes it (old promise never resolves).
 */
export class BatchSimulationClient {
  private worker: WorkerLike;
  private currentRequestId: string | null = null;
  private pendingResolve: ((results: Map<string, SimulationResult>) => void) | null = null;
  private pendingReject: ((error: Error) => void) | null = null;
  private requestCounter = 0;

  constructor(injectedWorker?: WorkerLike) {
    // Use the literal `new Worker(new URL(...), ...)` pattern so Vite can
    // statically detect and bundle the worker file for production builds.
    // In tests, pass an injected mock worker instead.
    if (injectedWorker) {
      this.worker = injectedWorker;
    } else {
      this.worker = new Worker(
        new URL('./simulation.worker.ts', import.meta.url),
        { type: 'module' },
      ) as unknown as WorkerLike;
    }

    this.worker.onmessage = (event) => {
      this.handleMessage(event.data);
    };

    this.worker.onerror = (event) => {
      if (this.pendingReject) {
        const message = event.message ?? 'Unknown worker error';
        this.pendingReject(new Error(`Worker error: ${message}`));
        this.pendingResolve = null;
        this.pendingReject = null;
        this.currentRequestId = null;
      }
    };
  }

  /**
   * Run a batch of simulations in the worker thread.
   *
   * If a previous batch is still running, its result will be discarded
   * (the Promise from the previous call will never resolve).
   *
   * @returns Promise that resolves with a Map of jobId → SimulationResult
   */
  runBatch(jobs: BatchJob[]): Promise<Map<string, SimulationResult>> {
    const id = `batch-${++this.requestCounter}-${Date.now()}`;

    return new Promise<Map<string, SimulationResult>>((resolve, reject) => {
      this.currentRequestId = id;
      this.pendingResolve = resolve;
      this.pendingReject = reject;

      const request: BatchSimulationRequest = {
        type: 'batch',
        id,
        jobs: jobs.map((j) => ({
          jobId: j.jobId,
          config: j.config,
          iterations: j.iterations,
        })),
      };

      this.worker.postMessage(request);
    });
  }

  /**
   * Terminate the worker. Call this when the component unmounts
   * or the worker is no longer needed.
   */
  terminate(): void {
    this.worker.terminate();
    this.pendingResolve = null;
    this.pendingReject = null;
    this.currentRequestId = null;
  }

  // ── Private ──────────────────────────────────────────────────────

  private handleMessage(message: WorkerResponse): void {
    // Ignore results from superseded requests
    if (message.id !== this.currentRequestId) {
      return;
    }

    switch (message.type) {
      case 'batch-result': {
        if (this.pendingResolve) {
          const resultMap = new Map<string, SimulationResult>();
          for (const entry of message.results) {
            resultMap.set(entry.jobId, entry.result);
          }
          this.pendingResolve(resultMap);
        }
        this.pendingResolve = null;
        this.pendingReject = null;
        this.currentRequestId = null;
        break;
      }

      case 'batch-error': {
        if (this.pendingReject) {
          this.pendingReject(new Error(message.error));
        }
        this.pendingResolve = null;
        this.pendingReject = null;
        this.currentRequestId = null;
        break;
      }

      // Ignore non-batch messages (result, error, progress) — they're for SimulationWorkerClient
      default:
        break;
    }
  }
}
