/**
 * CMI5 UNIST Serialization
 *
 * Utilities for serializing and deserializing CMI5 UNIST trees
 */

import type {
  CMI5CourseNode,
  CMI5AssignableUnitNode,
  CMI5ObjectiveNode,
  CMI5UnistNode,
} from './nodes';
import { validateCMI5UnistNode } from './schemas';

/**
 * Serialize CMI5 tree to JSON string
 *
 * @param tree - CMI5 UNIST tree
 * @param space - Optional indentation space (for pretty printing)
 * @returns JSON string representation
 */
export function serializeCMI5Tree(
  tree: CMI5UnistNode,
  space?: number
): string {
  return JSON.stringify(tree, null, space);
}

/**
 * Deserialize JSON string to CMI5 tree
 *
 * @param json - JSON string representation
 * @returns CMI5 UNIST tree
 * @throws Error if JSON is invalid or doesn't match CMI5 structure
 */
export function deserializeCMI5Tree(json: string): CMI5UnistNode {
  try {
    const parsed = JSON.parse(json);

    // Validate the parsed structure
    if (!validateCMI5UnistNode(parsed)) {
      throw new Error('Invalid CMI5 UNIST structure');
    }

    // Ensure it's a course node (root)
    if (parsed.type !== 'cmi5:course') {
      throw new Error('Root node must be a CMI5 course node');
    }

    return parsed as CMI5CourseNode;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Serialize CMI5 tree to JSON object (not string)
 *
 * @param tree - CMI5 UNIST tree
 * @returns Plain JavaScript object
 */
export function serializeCMI5TreeToObject(tree: CMI5UnistNode): unknown {
  // Use JSON serialization to handle circular references and ensure deep copy
  return JSON.parse(JSON.stringify(tree));
}

/**
 * Deserialize JSON object to CMI5 tree
 *
 * @param obj - Plain JavaScript object
 * @returns CMI5 UNIST tree
 * @throws Error if object doesn't match CMI5 structure
 */
export function deserializeCMI5TreeFromObject(obj: unknown): CMI5UnistNode {
  // Validate the object structure
  if (!validateCMI5UnistNode(obj)) {
    throw new Error('Invalid CMI5 UNIST structure');
  }

  // Ensure it's a course node (root)
  if (typeof obj === 'object' && obj !== null && 'type' in obj) {
    if (obj.type !== 'cmi5:course') {
      throw new Error('Root node must be a CMI5 course node');
    }
  }

  return obj as CMI5CourseNode;
}

/**
 * Clone a CMI5 tree (deep copy)
 *
 * @param tree - CMI5 UNIST tree to clone
 * @returns New cloned tree
 */
export function cloneCMI5Tree(tree: CMI5UnistNode): CMI5UnistNode {
  return JSON.parse(JSON.stringify(tree)) as CMI5UnistNode;
}
