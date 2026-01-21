/**
 * CMI5 UNIST Tree Visitors
 *
 * Utilities for traversing CMI5 UNIST trees
 */

import { visit } from 'unist-util-visit';
import type { Node as UnistNode } from 'unist';
import type {
  CMI5CourseNode,
  CMI5AssignableUnitNode,
  CMI5ObjectiveNode,
  CMI5UnistNode,
} from './nodes';
import {
  isCMI5CourseNode,
  isCMI5AUNode,
  isCMI5ObjectiveNode,
  isCMI5UnistNode,
} from './nodes';

/**
 * Visit all nodes in a CMI5 tree
 *
 * @param tree - Root CMI5 node (usually CMI5CourseNode)
 * @param visitor - Function called for each node
 */
export function visitCMI5Tree(
  tree: CMI5UnistNode,
  visitor: (node: CMI5UnistNode) => void | boolean
): void {
  visit(tree as UnistNode, (node: UnistNode) => {
    if (isCMI5UnistNode(node)) {
      const result = visitor(node);
      if (result === false) {
        return false; // Stop traversal
      }
    }
  });
}

/**
 * Visit only CMI5 Objective nodes
 *
 * @param tree - Root CMI5 node
 * @param visitor - Function called for each objective node
 */
export function visitCMI5Objectives(
  tree: CMI5UnistNode,
  visitor: (objective: CMI5ObjectiveNode) => void | boolean
): void {
  visit(tree as UnistNode, (node: UnistNode) => {
    if (isCMI5ObjectiveNode(node)) {
      const result = visitor(node);
      if (result === false) {
        return false; // Stop traversal
      }
    }
  });
}

/**
 * Visit only CMI5 Assignable Unit nodes
 *
 * @param tree - Root CMI5 node
 * @param visitor - Function called for each AU node
 */
export function visitCMI5AUs(
  tree: CMI5UnistNode,
  visitor: (au: CMI5AssignableUnitNode) => void | boolean
): void {
  visit(tree as UnistNode, (node: UnistNode) => {
    if (isCMI5AUNode(node)) {
      const result = visitor(node);
      if (result === false) {
        return false; // Stop traversal
      }
    }
  });
}

/**
 * Visit only CMI5 Course nodes (usually just the root)
 *
 * @param tree - Root CMI5 node
 * @param visitor - Function called for each course node
 */
export function visitCMI5Courses(
  tree: CMI5UnistNode,
  visitor: (course: CMI5CourseNode) => void | boolean
): void {
  visit(tree as UnistNode, (node: UnistNode) => {
    if (isCMI5CourseNode(node)) {
      const result = visitor(node);
      if (result === false) {
        return false; // Stop traversal
      }
    }
  });
}

/**
 * Find a CMI5 node by ID
 *
 * @param tree - Root CMI5 node
 * @param id - Node ID to find
 * @returns Found node or undefined
 */
export function findCMI5NodeById(
  tree: CMI5UnistNode,
  id: string
): CMI5UnistNode | undefined {
  let found: CMI5UnistNode | undefined;

  visitCMI5Tree(tree, (node) => {
    if (node.id === id) {
      found = node;
      return false; // Stop traversal
    }
  });

  return found;
}

/**
 * Find a CMI5 Objective by ID
 *
 * @param tree - Root CMI5 node
 * @param id - Objective ID to find
 * @returns Found objective or undefined
 */
export function findCMI5ObjectiveById(
  tree: CMI5UnistNode,
  id: string
): CMI5ObjectiveNode | undefined {
  let found: CMI5ObjectiveNode | undefined;

  visitCMI5Objectives(tree, (objective) => {
    if (objective.id === id) {
      found = objective;
      return false; // Stop traversal
    }
  });

  return found;
}

/**
 * Find a CMI5 AU by ID
 *
 * @param tree - Root CMI5 node
 * @param id - AU ID to find
 * @returns Found AU or undefined
 */
export function findCMI5AUById(
  tree: CMI5UnistNode,
  id: string
): CMI5AssignableUnitNode | undefined {
  let found: CMI5AssignableUnitNode | undefined;

  visitCMI5AUs(tree, (au) => {
    if (au.id === id) {
      found = au;
      return false; // Stop traversal
    }
  });

  return found;
}

/**
 * Collect all objectives from a CMI5 tree
 *
 * @param tree - Root CMI5 node
 * @returns Array of all objective nodes
 */
export function collectCMI5Objectives(tree: CMI5UnistNode): CMI5ObjectiveNode[] {
  const objectives: CMI5ObjectiveNode[] = [];

  visitCMI5Objectives(tree, (objective) => {
    objectives.push(objective);
  });

  return objectives;
}

/**
 * Collect all AUs from a CMI5 tree
 *
 * @param tree - Root CMI5 node
 * @returns Array of all AU nodes
 */
export function collectCMI5AUs(tree: CMI5UnistNode): CMI5AssignableUnitNode[] {
  const aus: CMI5AssignableUnitNode[] = [];

  visitCMI5AUs(tree, (au) => {
    aus.push(au);
  });

  return aus;
}

/**
 * Filter objectives by a predicate
 *
 * @param tree - Root CMI5 node
 * @param predicate - Function to test each objective
 * @returns Array of matching objectives
 */
export function filterCMI5Objectives(
  tree: CMI5UnistNode,
  predicate: (objective: CMI5ObjectiveNode) => boolean
): CMI5ObjectiveNode[] {
  const objectives: CMI5ObjectiveNode[] = [];

  visitCMI5Objectives(tree, (objective) => {
    if (predicate(objective)) {
      objectives.push(objective);
    }
  });

  return objectives;
}

/**
 * Filter AUs by a predicate
 *
 * @param tree - Root CMI5 node
 * @param predicate - Function to test each AU
 * @returns Array of matching AUs
 */
export function filterCMI5AUs(
  tree: CMI5UnistNode,
  predicate: (au: CMI5AssignableUnitNode) => boolean
): CMI5AssignableUnitNode[] {
  const aus: CMI5AssignableUnitNode[] = [];

  visitCMI5AUs(tree, (au) => {
    if (predicate(au)) {
      aus.push(au);
    }
  });

  return aus;
}
