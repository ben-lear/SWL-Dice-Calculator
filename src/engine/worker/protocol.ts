import type { AttackConfig, SimulationResult } from '../types';

// ============================================================================
// Main Thread → Worker Messages
// ============================================================================

export interface SimulationRequest {
  type: 'run';
  id: string;                // Unique request ID for result matching
  config: AttackConfig;
  iterations: number;
}

export interface CancelRequest {
  type: 'cancel';
  id: string;                // ID of the request to cancel
}

export type WorkerRequest = SimulationRequest | CancelRequest;

// ============================================================================
// Worker → Main Thread Messages
// ============================================================================

export interface SimulationResponse {
  type: 'result';
  id: string;                // Matches the request ID
  result: SimulationResult;
}

export interface SimulationError {
  type: 'error';
  id: string;
  error: string;
}

export interface SimulationProgress {
  type: 'progress';
  id: string;
  completed: number;         // Iterations completed so far
  total: number;             // Total iterations
}

export type WorkerResponse = SimulationResponse | SimulationError | SimulationProgress;
