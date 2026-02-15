import type { AttackConfig, SimulationResult } from '../types';
import type { SimulationRequest, WorkerResponse } from './protocol';

interface WorkerMessageEvent<T> {
  data: T;
}

interface WorkerErrorEvent {
  message?: string;
}

interface WorkerLike {
  onmessage: ((event: WorkerMessageEvent<WorkerResponse>) => void) | null;
  onerror: ((event: WorkerErrorEvent) => void) | null;
  postMessage(message: SimulationRequest): void;
  terminate(): void;
}

interface WorkerConstructorLike {
  new (url: URL, options: { type: 'module' }): WorkerLike;
}

/**
 * Client wrapper for the simulation Web Worker.
 *
 * Provides a Promise-based API for running simulations off the main thread.
 * Handles request ID tracking to discard stale results when a new simulation
 * supersedes a previous one.
 */
export class SimulationWorkerClient {
  private worker: WorkerLike;
  private currentRequestId: string | null = null;
  private pendingResolve: ((result: SimulationResult) => void) | null = null;
  private pendingReject: ((error: Error) => void) | null = null;
  private requestCounter = 0;

  constructor() {
    const WorkerCtor = (globalThis as { Worker?: WorkerConstructorLike }).Worker;
    if (!WorkerCtor) {
      throw new Error('Web Worker is not supported in this environment.');
    }

    this.worker = new WorkerCtor(
      new URL('./simulation.worker.ts', import.meta.url),
      { type: 'module' }
    );

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
