import type { AttackConfig, SimulationResult } from '../types';
import type { SimulationRequest, WorkerResponse } from './protocol';

// Vite requires the literal `new Worker(new URL(...))` pattern to detect and
// bundle the worker for production builds. The webworker lib reference in
// simulation.worker.ts conflicts with DOM Worker types across the compilation,
// so we declare the constructor locally.
declare const Worker: {
  new (scriptURL: URL, options: { type: string }): unknown;
};

interface WorkerMessageEvent<T> {
  data: T;
}

interface WorkerErrorEvent {
  message?: string;
}

export interface WorkerLike {
  onmessage: ((event: WorkerMessageEvent<WorkerResponse>) => void) | null;
  onerror: ((event: WorkerErrorEvent) => void) | null;
  postMessage(message: SimulationRequest): void;
  terminate(): void;
}

/**
 * Client wrapper for the simulation Web Worker.
 *
 * Provides a Promise-based API for running simulations off the main thread.
 * Handles request ID tracking to discard stale results when a new simulation
 * supersedes a previous one.
 *
 * Accepts an optional pre-constructed worker for testing. When omitted,
 * creates a real Web Worker using the standard `new Worker(...)` pattern
 * that Vite can statically detect and bundle for production.
 */
export class SimulationWorkerClient {
  private worker: WorkerLike;
  private currentRequestId: string | null = null;
  private pendingResolve: ((result: SimulationResult) => void) | null = null;
  private pendingReject: ((error: Error) => void) | null = null;
  private requestCounter = 0;

  constructor(injectedWorker?: WorkerLike) {
    // Use the literal `new Worker(new URL(...), ...)` pattern so Vite can
    // statically detect and bundle the worker file for production builds.
    // In tests, pass an injected mock worker instead.
    this.worker = injectedWorker ?? new Worker(
      new URL('./simulation.worker.ts', import.meta.url),
      { type: 'module' }
    ) as unknown as WorkerLike;

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
   * Run a simulation in the worker thread.
   *
   * If a previous simulation is still running, its result will be discarded
   * (the Promise from the previous call will never resolve).
   *
   * @returns Promise that resolves with the SimulationResult
   */
  run(config: AttackConfig, iterations: number): Promise<SimulationResult> {
    // Generate a unique request ID
    const id = `sim-${++this.requestCounter}-${Date.now()}`;

    // If there's a pending request, it's now superseded.
    // We don't reject it — we just let it be garbage collected.
    // The worker will still complete the old simulation, but we'll
    // ignore its result in handleMessage.

    return new Promise<SimulationResult>((resolve, reject) => {
      this.currentRequestId = id;
      this.pendingResolve = resolve;
      this.pendingReject = reject;

      const request: SimulationRequest = {
        type: 'run',
        id,
        config,
        iterations,
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
      case 'result': {
        if (this.pendingResolve) {
          this.pendingResolve(message.result);
        }
        this.pendingResolve = null;
        this.pendingReject = null;
        this.currentRequestId = null;
        break;
      }

      case 'error': {
        if (this.pendingReject) {
          this.pendingReject(new Error(message.error));
        }
        this.pendingResolve = null;
        this.pendingReject = null;
        this.currentRequestId = null;
        break;
      }

      case 'progress': {
        // MVP: progress events are received but not surfaced.
        // Future: pass to a progress callback for UI display.
        break;
      }
    }
  }
}
