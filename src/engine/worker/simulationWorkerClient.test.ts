import { describe, it, expect, vi } from 'vitest';
import type { SimulationResult, AttackConfig } from '../types';
import type { WorkerResponse } from './protocol';
import { SimulationWorkerClient } from './simulationWorkerClient';

// ============================================================================
// Mock Worker
// ============================================================================

/**
 * Minimal mock Worker for testing the client wrapper.
 * Captures postMessage calls and allows manual response injection.
 */
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;

  postMessage = vi.fn();
  terminate = vi.fn();

  /** Simulate a message from the worker */
  simulateResponse(data: WorkerResponse) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data }));
    }
  }
}

// Mock the Worker constructor globally
let mockWorkerInstance: MockWorker;

vi.stubGlobal('Worker', class {
  constructor() {
    mockWorkerInstance = new MockWorker();
    return mockWorkerInstance;
  }
});

// ============================================================================
// Tests
// ============================================================================

describe('SimulationWorkerClient', () => {
  it('posts a run message to the worker', () => {
    const client = new SimulationWorkerClient();
    const config = {} as AttackConfig; // Minimal config for testing

    client.run(config, 1000);

    expect(mockWorkerInstance.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'run',
        config,
        iterations: 1000,
      })
    );
  });

  it('resolves the promise when worker responds with result', async () => {
    const client = new SimulationWorkerClient();
    const config = {} as AttackConfig;

    const resultPromise = client.run(config, 1000);

    // Get the request ID from the posted message
    const postedMessage = mockWorkerInstance.postMessage.mock.calls[0][0];
    const requestId = postedMessage.id;

    // Simulate worker response
    const mockResult = { totalWounds: { mean: 3 } } as SimulationResult;
    mockWorkerInstance.simulateResponse({
      type: 'result',
      id: requestId,
      result: mockResult,
    });

    const result = await resultPromise;
    expect(result.totalWounds.mean).toBe(3);
  });

  it('rejects the promise when worker responds with error', async () => {
    const client = new SimulationWorkerClient();
    const config = {} as AttackConfig;

    const resultPromise = client.run(config, 1000);

    const postedMessage = mockWorkerInstance.postMessage.mock.calls[0][0];

    mockWorkerInstance.simulateResponse({
      type: 'error',
      id: postedMessage.id,
      error: 'Simulation failed',
    });

    await expect(resultPromise).rejects.toThrow('Simulation failed');
  });

  it('ignores results from superseded requests', async () => {
    const client = new SimulationWorkerClient();
    const config = {} as AttackConfig;

    // Start first simulation
    void client.run(config, 1000); // Intentionally not awaited - will be superseded
    const id1 = mockWorkerInstance.postMessage.mock.calls[0][0].id;

    // Start second simulation (supersedes first)
    const promise2 = client.run(config, 2000);
    const id2 = mockWorkerInstance.postMessage.mock.calls[1][0].id;

    // Respond to the FIRST request (should be ignored)
    const staleResult = { totalWounds: { mean: 1 } } as SimulationResult;
    mockWorkerInstance.simulateResponse({
      type: 'result',
      id: id1,
      result: staleResult,
    });

    // Respond to the SECOND request (should be accepted)
    const freshResult = { totalWounds: { mean: 5 } } as SimulationResult;
    mockWorkerInstance.simulateResponse({
      type: 'result',
      id: id2,
      result: freshResult,
    });

    const result = await promise2;
    expect(result.totalWounds.mean).toBe(5);

    // promise1 never resolves (by design)
  });

  it('terminates the worker', () => {
    const client = new SimulationWorkerClient();
    client.terminate();
    expect(mockWorkerInstance.terminate).toHaveBeenCalled();
  });
});
