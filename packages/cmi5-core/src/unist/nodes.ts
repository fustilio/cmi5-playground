/**
 * CMI5 UNIST Node Types
 *
 * UNIST-based syntax tree for representing CMI5 course structures.
 * Based on https://github.com/syntax-tree/unist specification.
 *
 * This allows CMI5 structures to be represented as trees, enabling:
 * - Tree traversal and transformation
 * - Serialization/deserialization
 * - Validation
 * - Independent representation from syllst
 */

import type { Node as UnistNode, Parent as UnistParent, Literal as UnistLiteral, Data, Position } from 'unist';
import type { CMI5LaunchParameters, CMI5ObjectiveState } from '../types';

// ============================================================================
// Core UNIST Types (re-exported for convenience)
// ============================================================================

export type { Data, Position };

// ============================================================================
// CMI5 UNIST Node Types
// ============================================================================

/**
 * CMI5 Course Node (root)
 * Represents a complete CMI5 course containing multiple assignable units
 */
export interface CMI5CourseNode extends UnistParent {
  type: 'cmi5:course';
  /** Course ID (unique identifier) */
  id: string;
  /** Course title */
  title: string;
  /** Course description */
  description?: string;
  /** Child nodes (Assignable Units) */
  children: CMI5AssignableUnitNode[];
  /** UNIST position (optional) */
  position?: Position;
  /** UNIST data (extensible metadata) */
  data?: {
    /** Registration ID */
    registration?: string;
    /** Launch mode */
    launchMode?: 'Normal' | 'Browse' | 'Review';
    /** Source syllst node ID (if mapped from syllst) */
    sourceNodeId?: string;
    [key: string]: unknown;
  };
}

/**
 * CMI5 Assignable Unit Node
 * Represents a launchable learning activity (maps to a lesson)
 */
export interface CMI5AssignableUnitNode extends UnistParent {
  type: 'cmi5:au';
  /** AU ID (unique identifier) */
  id: string;
  /** AU title */
  title: string;
  /** Launch URL */
  launchUrl: string;
  /** Mastery score threshold (0-1) */
  masteryScore?: number;
  /** Move-on criteria */
  moveOn?: 'Passed' | 'Completed' | 'CompletedAndPassed' | 'NotApplicable';
  /** Prerequisites - list of AU IDs that must be completed before this AU */
  prerequisites?: string[];
  /** Completion criteria */
  completionCriteria?: {
    /** Mastery score threshold (0-1) */
    masteryScore?: number;
    /** Mastery percentage (0-1) */
    masteryPercentage?: number;
    /** Minimum number of objectives that must be mastered */
    minMasteredCount?: number;
    /** Whether all content must be completed */
    requireAllContent?: boolean;
    /** Whether all exercises must be completed */
    requireAllExercises?: boolean;
  };
  /** Order/sequence number for this AU */
  order?: number;
  /** Child nodes (Objectives) */
  children: CMI5ObjectiveNode[];
  /** UNIST position (optional) */
  position?: Position;
  /** UNIST data (extensible metadata) */
  data?: {
    /** Launch parameters */
    launchParameters?: CMI5LaunchParameters;
    /** Source syllst lesson ID (if mapped from syllst) */
    sourceLessonId?: string;
    [key: string]: unknown;
  };
}

/**
 * CMI5 Objective Node
 * Represents a trackable learning objective (maps to a syllst node or kubit)
 */
export interface CMI5ObjectiveNode extends UnistLiteral {
  type: 'cmi5:objective';
  /** Objective ID (unique identifier) */
  id: string;
  /** Objective description */
  description?: string;
  /** Mastery score threshold (0-1) */
  masteryScore?: number;
  /** Whether this is a primary objective */
  isPrimary?: boolean;
  /** Source syllst node ID (preferred) */
  nodeId?: string;
  /** Source kubit ID (deprecated, use nodeId instead) - kept for backward compatibility */
  kubitId?: string;
  /** Value for UnistLiteral compatibility (objective ID) */
  value: string;
  /** UNIST position (optional) */
  position?: Position;
  /** UNIST data (extensible metadata) */
  data?: {
    /** Current objective state */
    objectiveState?: CMI5ObjectiveState;
    /** Source syllst node ID (if mapped from syllst) */
    sourceNodeId?: string;
    [key: string]: unknown;
  };
}

/**
 * Union type of all CMI5 UNIST nodes
 */
export type CMI5UnistNode = CMI5CourseNode | CMI5AssignableUnitNode | CMI5ObjectiveNode;

/**
 * Union type of CMI5 parent nodes (nodes that can have children)
 */
export type CMI5UnistParent = CMI5CourseNode | CMI5AssignableUnitNode;

/**
 * Type guard: Check if node is a CMI5 Course Node
 */
export function isCMI5CourseNode(node: UnistNode): node is CMI5CourseNode {
  return node.type === 'cmi5:course';
}

/**
 * Type guard: Check if node is a CMI5 Assignable Unit Node
 */
export function isCMI5AUNode(node: UnistNode): node is CMI5AssignableUnitNode {
  return node.type === 'cmi5:au';
}

/**
 * Type guard: Check if node is a CMI5 Objective Node
 */
export function isCMI5ObjectiveNode(node: UnistNode): node is CMI5ObjectiveNode {
  return node.type === 'cmi5:objective';
}

/**
 * Type guard: Check if node is a CMI5 UNIST node
 */
export function isCMI5UnistNode(node: UnistNode): node is CMI5UnistNode {
  return isCMI5CourseNode(node) || isCMI5AUNode(node) || isCMI5ObjectiveNode(node);
}

/**
 * Type guard: Check if node is a CMI5 parent node
 */
export function isCMI5UnistParent(node: UnistNode): node is CMI5UnistParent {
  return isCMI5CourseNode(node) || isCMI5AUNode(node);
}
