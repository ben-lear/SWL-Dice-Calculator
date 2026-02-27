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

export interface BatchSimulationRequest {
  type: 'batch';
  id: string;
  jobs: Array<{ jobId: string; config: AttackConfig; iterations: number }>;
}

export type WorkerRequest = SimulationRequest | CancelRequest | BatchSimulationRequest;

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

export interface BatchSimulationResponse {
  type: 'batch-result';
  id: string;
  results: Array<{ jobId: string; result: SimulationResult }>;
}

export interface BatchSimulationError {
  type: 'batch-error';
  id: string;
  error: string;
}

export type WorkerResponse = SimulationResponse | SimulationError | SimulationProgress
  | BatchSimulationResponse | BatchSimulationError;
