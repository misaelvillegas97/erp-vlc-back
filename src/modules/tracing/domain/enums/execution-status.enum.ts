/**
 * Status of step execution
 * PENDING: Step is waiting to be started
 * IN_PROGRESS: Step is currently being executed
 * DONE: Step has been completed successfully
 * SKIPPED: Step was skipped due to conditions
 * FAILED: Step execution failed
 * RESTARTED: Step was restarted after failure
 */
export enum StepExecutionStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
  SKIPPED = 'SKIPPED',
  FAILED = 'FAILED',
  RESTARTED = 'RESTARTED',
}

/**
 * Status of flow instance execution
 * ACTIVE: Flow instance is currently being executed
 * CANCELLED: Flow instance was cancelled before completion
 * FINISHED: Flow instance completed successfully
 */
export enum FlowInstanceStatus {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  FINISHED = 'FINISHED',
}
