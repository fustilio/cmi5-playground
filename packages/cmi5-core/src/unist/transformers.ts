/**
 * CMI5 UNIST Tree Transformers
 *
 * Utilities for transforming CMI5 UNIST trees and converting between
 * tree and flat structures
 */

import type {
  CMI5CourseNode,
  CMI5AssignableUnitNode,
  CMI5ObjectiveNode,
  CMI5UnistNode,
} from './nodes';
import type {
  CMI5Course,
  CMI5AssignableUnit,
  CMI5Objective,
} from '../types';
import {
  visitCMI5Tree,
  visitCMI5AUs,
  visitCMI5Objectives,
} from './visitors';

/**
 * Convert CMI5 tree to flat structure
 *
 * @param tree - CMI5 UNIST tree (root course node)
 * @returns Flat CMI5 structure
 */
export function flattenCMI5Tree(tree: CMI5CourseNode): CMI5Course {
  const assignableUnits: CMI5AssignableUnit[] = [];
  const allObjectives: CMI5Objective[] = [];

  // Extract AUs and objectives
  visitCMI5AUs(tree, (auNode) => {
    const objectives: CMI5Objective[] = [];

    visitCMI5Objectives(auNode, (objectiveNode) => {
      const objective: CMI5Objective = {
        id: objectiveNode.id,
        description: objectiveNode.description,
        masteryScore: objectiveNode.masteryScore,
        isPrimary: objectiveNode.isPrimary,
        nodeId: objectiveNode.nodeId,
        kubitId: objectiveNode.kubitId, // Backward compatibility
      };
      objectives.push(objective);
      allObjectives.push(objective);
    });

    const au: CMI5AssignableUnit = {
      id: auNode.id,
      title: auNode.title,
      launchUrl: auNode.launchUrl,
      masteryScore: auNode.masteryScore,
      moveOn: auNode.moveOn,
      objectives,
      prerequisites: auNode.prerequisites,
      completionCriteria: auNode.completionCriteria,
      order: auNode.order,
      launchParameters: auNode.data?.launchParameters,
    };

    assignableUnits.push(au);
  });

  const course: CMI5Course = {
    id: tree.id,
    title: tree.title,
    description: tree.description,
    assignableUnits,
  };

  return course;
}

/**
 * Convert flat CMI5 structure to tree
 *
 * @param course - Flat CMI5 course structure
 * @returns CMI5 UNIST tree
 */
export function buildCMI5Tree(course: CMI5Course): CMI5CourseNode {
  const assignableUnits: CMI5AssignableUnitNode[] = course.assignableUnits.map((au) => {
    const objectives: CMI5ObjectiveNode[] = au.objectives.map((objective) => {
      const objectiveNode: CMI5ObjectiveNode = {
        type: 'cmi5:objective',
        id: objective.id,
        description: objective.description,
        masteryScore: objective.masteryScore,
        isPrimary: objective.isPrimary,
        nodeId: objective.nodeId,
        kubitId: objective.kubitId, // Backward compatibility
        value: objective.id, // For UnistLiteral compatibility
        data: {},
      };
      return objectiveNode;
    });

    const auNode: CMI5AssignableUnitNode = {
      type: 'cmi5:au',
      id: au.id,
      title: au.title,
      launchUrl: au.launchUrl,
      masteryScore: au.masteryScore,
      moveOn: au.moveOn,
      prerequisites: au.prerequisites,
      completionCriteria: au.completionCriteria,
      order: au.order,
      children: objectives,
      data: {
        launchParameters: au.launchParameters,
      },
    };

    return auNode;
  });

  const courseNode: CMI5CourseNode = {
    type: 'cmi5:course',
    id: course.id,
    title: course.title,
    description: course.description,
    children: assignableUnits,
    data: {},
  };

  return courseNode;
}

/**
 * Transform CMI5 tree nodes using a mapper function
 *
 * @param tree - CMI5 UNIST tree
 * @param mapper - Function to transform each node
 * @returns New transformed tree
 */
export function mapCMI5Tree(
  tree: CMI5UnistNode,
  mapper: (node: CMI5UnistNode) => CMI5UnistNode
): CMI5UnistNode {
  // Deep clone and transform
  function transformNode(node: CMI5UnistNode): CMI5UnistNode {
    const transformed = mapper(node);

    // Recursively transform children if it's a parent node
    if ('children' in transformed && transformed.children.length > 0) {
      const transformedChildren = transformed.children.map((child) => transformNode(child));
      return {
        ...transformed,
        children: transformedChildren,
      } as CMI5UnistNode;
    }

    return transformed;
  }

  return transformNode(tree);
}

/**
 * Filter CMI5 tree nodes using a predicate
 *
 * @param tree - CMI5 UNIST tree
 * @param predicate - Function to test each node
 * @returns New filtered tree (removes nodes that don't match)
 */
export function filterCMI5Tree(
  tree: CMI5CourseNode,
  predicate: (node: CMI5UnistNode) => boolean
): CMI5CourseNode {
  function filterNode(node: CMI5UnistNode): CMI5UnistNode | null {
    if (!predicate(node)) {
      return null;
    }

    // Filter children if it's a parent node
    if ('children' in node && node.children.length > 0) {
      const filteredChildren = node.children
        .map((child) => filterNode(child))
        .filter((child): child is CMI5UnistNode => child !== null);

      return {
        ...node,
        children: filteredChildren,
      } as CMI5UnistNode;
    }

    return node;
  }

  const filtered = filterNode(tree);
  if (!filtered || filtered.type !== 'cmi5:course') {
    throw new Error('Filter resulted in invalid tree structure');
  }

  return filtered;
}

/**
 * Extract all node IDs from a CMI5 tree
 *
 * @param tree - CMI5 UNIST tree
 * @returns Map of node type to array of IDs
 */
export function extractCMI5NodeIds(tree: CMI5UnistNode): {
  courses: string[];
  aus: string[];
  objectives: string[];
} {
  const courses: string[] = [];
  const aus: string[] = [];
  const objectives: string[] = [];

  visitCMI5Tree(tree, (node) => {
    if (node.type === 'cmi5:course') {
      courses.push(node.id);
    } else if (node.type === 'cmi5:au') {
      aus.push(node.id);
    } else if (node.type === 'cmi5:objective') {
      objectives.push(node.id);
    }
  });

  return { courses, aus, objectives };
}
