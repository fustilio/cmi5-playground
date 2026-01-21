/**
 * CMI5 Core Types
 *
 * Type definitions for CMI5 (Computer Managed Instruction 5) integration.
 * CMI5 is an xAPI profile for launching and tracking learning content.
 *
 * These types are framework-agnostic and do not depend on syllst or other packages.
 */

/**
 * CMI5 Launch Parameters
 * Extracted from URL query string when LMS launches content
 */
export interface CMI5LaunchParameters {
  /** xAPI endpoint URL */
  endpoint: string;
  /** Authorization token (Bearer token) */
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
 * CMI5 Objective
 * Represents a learning objective that can be tracked
 */
export interface CMI5Objective {
  /** Objective ID */
  id: string;
  /** Objective description */
  description?: string;
  /** Mastery score (0-1) */
  masteryScore?: number;
  /** Whether this is a primary objective */
  isPrimary?: boolean;
  /** Source node ID (e.g., syllst node ID) - preferred */
  nodeId?: string;
  /** Source kubit ID (deprecated, use nodeId instead) - kept for backward compatibility */
  kubitId?: string;
}

/**
 * Completion Criteria for CMI5 AU
 * Defines what is required to complete an AU
 */
export interface CMI5CompletionCriteria {
  /** Mastery score threshold (0-1) */
  masteryScore?: number;
  /** Mastery percentage (0-1) - e.g., 0.8 means 80% of objectives must be mastered */
  masteryPercentage?: number;
  /** Minimum number of objectives that must be mastered */
  minMasteredCount?: number;
  /** Whether all content must be completed */
  requireAllContent?: boolean;
  /** Whether all exercises must be completed */
  requireAllExercises?: boolean;
}

/**
 * CMI5 Assignable Unit (AU)
 * Represents a launchable learning activity
 */
export interface CMI5AssignableUnit {
  /** AU ID (unique identifier) */
  id: string;
  /** AU title */
  title: string;
  /** Launch URL */
  launchUrl: string;
  /** Launch parameters */
  launchParameters?: CMI5LaunchParameters;
  /** Mastery score (0-1) */
  masteryScore?: number;
  /** Move on criteria */
  moveOn?: 'Passed' | 'Completed' | 'CompletedAndPassed' | 'NotApplicable';
  /** Objectives */
  objectives: CMI5Objective[];
  /** Prerequisites - list of AU IDs that must be completed before this AU */
  prerequisites?: string[];
  /** Completion criteria */
  completionCriteria?: CMI5CompletionCriteria;
  /** Order/sequence number for this AU */
  order?: number;
}

/**
 * CMI5 Course
 * Represents a course containing multiple assignable units
 */
export interface CMI5Course {
  /** Course ID */
  id: string;
  /** Course title */
  title: string;
  /** Course description */
  description?: string;
  /** Assignable Units (lessons) */
  assignableUnits: CMI5AssignableUnit[];
}

/**
 * CMI5 State
 * Tracks learner progress and mastery
 */
export interface CMI5State {
  /** Registration ID */
  registration: string;
  /** Launch mode */
  launchMode: 'Normal' | 'Browse' | 'Review';
  /** Mastery state per objective */
  objectiveStates: Map<string, CMI5ObjectiveState>;
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
 * Tracks mastery for a single objective
 */
export interface CMI5ObjectiveState {
  /** Objective ID */
  objectiveId: string;
  /** Source node ID (e.g., syllst node ID) - preferred */
  nodeId?: string;
  /** Source kubit ID (deprecated, use nodeId instead) - kept for backward compatibility */
  kubitId?: string;
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
 * CMI5 Mapping Result
 * Result of mapping content structure to CMI5 structure
 */
export interface CMI5MappingResult {
  /** CMI5 course */
  course: CMI5Course;
  /** All assignable units */
  assignableUnits: CMI5AssignableUnit[];
  /** All objectives (across all AUs) */
  objectives: CMI5Objective[];
  /** Mapping from node IDs to objective IDs */
  nodeIdToObjectiveMap: Map<string, string>;
}
