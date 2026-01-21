/**
 * CMI5 UNIST Validation Schemas
 *
 * Zod schemas for runtime validation of CMI5 UNIST nodes
 */

import { z } from 'zod';
import type { CMI5CourseNode, CMI5AssignableUnitNode, CMI5ObjectiveNode } from './nodes';

// ============================================================================
// Base UNIST Schemas
// ============================================================================

/**
 * UNIST Point schema (line, column, offset)
 */
export const PointSchema = z.object({
  line: z.number().positive(),
  column: z.number().nonnegative(),
  offset: z.number().nonnegative(),
});

/**
 * UNIST Position schema (start, end)
 */
export const PositionSchema = z.object({
  start: PointSchema,
  end: PointSchema,
});

/**
 * UNIST Data schema (extensible key-value store)
 */
export const DataSchema = z.record(z.unknown()).optional();

// ============================================================================
// CMI5 UNIST Node Schemas
// ============================================================================

/**
 * CMI5 Objective Node schema
 */
export const CMI5ObjectiveNodeSchema: z.ZodType<CMI5ObjectiveNode> = z.object({
  type: z.literal('cmi5:objective'),
  id: z.string().min(1),
  description: z.string().optional(),
  masteryScore: z.number().min(0).max(1).optional(),
  isPrimary: z.boolean().optional(),
  nodeId: z.string().optional(),
  kubitId: z.string().optional(),
  value: z.string(),
  position: PositionSchema.optional(),
  data: z.object({
    objectiveState: z.any().optional(), // CMI5ObjectiveState - avoid circular dependency
    sourceNodeId: z.string().optional(),
  }).passthrough().optional(),
});

/**
 * CMI5 Assignable Unit Node schema
 */
export const CMI5AssignableUnitNodeSchema: z.ZodType<CMI5AssignableUnitNode> = z.object({
  type: z.literal('cmi5:au'),
  id: z.string().min(1),
  title: z.string().min(1),
  launchUrl: z.string().url(),
  masteryScore: z.number().min(0).max(1).optional(),
  moveOn: z.enum(['Passed', 'Completed', 'CompletedAndPassed', 'NotApplicable']).optional(),
  children: z.array(CMI5ObjectiveNodeSchema),
  position: PositionSchema.optional(),
  data: z.object({
    launchParameters: z.any().optional(), // CMI5LaunchParameters - avoid circular dependency
    sourceLessonId: z.string().optional(),
  }).passthrough().optional(),
});

/**
 * CMI5 Course Node schema
 */
export const CMI5CourseNodeSchema: z.ZodType<CMI5CourseNode> = z.object({
  type: z.literal('cmi5:course'),
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  children: z.array(CMI5AssignableUnitNodeSchema),
  position: PositionSchema.optional(),
  data: z.object({
    registration: z.string().optional(),
    launchMode: z.enum(['Normal', 'Browse', 'Review']).optional(),
    sourceNodeId: z.string().optional(),
  }).passthrough().optional(),
});

/**
 * CMI5 UNIST Node schema (union of all node types)
 */
export const CMI5UnistNodeSchema = z.union([
  CMI5CourseNodeSchema,
  CMI5AssignableUnitNodeSchema,
  CMI5ObjectiveNodeSchema,
]);

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate a CMI5 Course Node
 */
export function validateCMI5CourseNode(node: unknown): node is CMI5CourseNode {
  return CMI5CourseNodeSchema.safeParse(node).success;
}

/**
 * Validate a CMI5 Assignable Unit Node
 */
export function validateCMI5AUNode(node: unknown): node is CMI5AssignableUnitNode {
  return CMI5AssignableUnitNodeSchema.safeParse(node).success;
}

/**
 * Validate a CMI5 Objective Node
 */
export function validateCMI5ObjectiveNode(node: unknown): node is CMI5ObjectiveNode {
  return CMI5ObjectiveNodeSchema.safeParse(node).success;
}

/**
 * Validate a CMI5 UNIST Node
 */
export function validateCMI5UnistNode(node: unknown): node is CMI5CourseNode | CMI5AssignableUnitNode | CMI5ObjectiveNode {
  return CMI5UnistNodeSchema.safeParse(node).success;
}
