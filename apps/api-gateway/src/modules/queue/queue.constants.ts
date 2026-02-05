/**
 * Queue names used in the application
 */
export const QUEUE_NAMES = {
  CALLBACK: 'callback',
  TX_CONFIRM: 'tx-confirm',
  SETTLEMENT: 'settlement',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

/**
 * Job names for each queue
 */
export const JOB_NAMES = {
  CALLBACK: {
    PROCESS: 'process-callback',
  },
  TX_CONFIRM: {
    CHECK: 'check-transaction',
  },
  SETTLEMENT: {
    PROCESS: 'process-settlement',
  },
} as const;
