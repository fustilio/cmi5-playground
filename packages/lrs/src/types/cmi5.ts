/**
 * CMI5-specific types for LRS
 */

import type { Statement, Agent, Activity } from './xapi';

/**
 * CMI5 State
 * Stored via xAPI State API or local LRS
 * Note: objectiveStates is stored as Record for JSON serialization
 */
export interface CMI5State {
  /** Registration ID */
  registration: string;
  /** Launch mode */
  launchMode: 'Normal' | 'Browse' | 'Review';
  /** Mastery state per objective (stored as Record for JSON) */
  objectiveStates: Record<string, CMI5ObjectiveState>;
  /** Lesson progress */
  progress: {
    currentLesson?: string;
    completedLessons: string[];
    timeSpent: number; // milliseconds
  };
  /** Completion status */
  completed: boolean;
  /** Completion timestamp */
  completedAt?: string;
  /** Extensions for additional data (e.g., FSRS state) */
  extensions?: Record<string, unknown>;
}

/**
 * CMI5 Objective State
 */
export interface CMI5ObjectiveState {
  /** Objective ID */
  objectiveId: string;
  /** Kubit ID */
  kubitId: string;
  /** Mastery level (0-1) */
  mastery: number;
  /** Last attempted timestamp */
  lastAttempted: string; // ISO timestamp
  /** Number of attempts */
  attempts: number;
  /** Whether objective is satisfied */
  satisfied: boolean;
  /** Extensions for additional data (e.g., FSRS state per kubit) */
  extensions?: Record<string, unknown>;
}

/**
 * CMI5 Launch Parameters
 */
export interface CMI5LaunchParameters {
  /** xAPI endpoint URL */
  endpoint: string;
  /** Authorization token */
  auth: string;
  /** Actor (learner) JSON string */
  actor: string;
  /** Registration ID */
  registration?: string;
  /** Activity ID (AU ID) */
  activityId?: string;
  /** Fetch URL for state retrieval */
  fetch?: string;
}

/**
 * CMI5 Statement Extensions
 */
export interface CMI5Extensions {
  /** CMI5 session ID */
  sessionId?: string;
  /** CMI5 launch mode */
  launchMode?: 'Normal' | 'Browse' | 'Review';
  /** CMI5 mastery score */
  masteryScore?: number;
  /** CMI5 move-on criteria */
  moveOn?: 'Passed' | 'Completed' | 'CompletedAndPassed' | 'NotApplicable';
}

/**
 * CMI5-specific statement helpers
 */
export interface CMI5Statement extends Statement {
  /** CMI5 extensions in context */
  context?: (Statement['context'] & {
    extensions?: (Statement['context'] extends { extensions?: infer E } ? E : Record<string, unknown>) & {
      'https://w3id.org/xapi/cmi5/context/extensions/sessionid'?: string;
      'https://w3id.org/xapi/cmi5/context/extensions/launchmode'?: string;
    };
  }) | undefined;
}
