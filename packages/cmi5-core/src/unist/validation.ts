/**
 * CMI5 UNIST Tree Validation
 *
 * Utilities for validating CMI5 UNIST tree structures
 */

import type {
  CMI5CourseNode,
  CMI5AssignableUnitNode,
  CMI5ObjectiveNode,
  CMI5UnistNode,
} from './nodes';
import {
  validateCMI5CourseNode,
  validateCMI5AUNode,
  validateCMI5ObjectiveNode,
} from './schemas';
import { visitCMI5Tree, visitCMI5AUs, visitCMI5Objectives } from './visitors';
import { isCMI5CourseNode, isCMI5AUNode, isCMI5ObjectiveNode } from './nodes';

/**
 * Validation result
 */
export interface CMI5ValidationResult {
  /** Whether the tree is valid */
  valid: boolean;
  /** Array of validation errors */
  errors: string[];
  /** Array of validation warnings */
  warnings: string[];
}

/**
 * Validate a complete CMI5 tree structure
 *
 * @param tree - CMI5 UNIST tree to validate
 * @returns Validation result with errors and warnings
 */
export function validateCMI5Tree(tree: CMI5UnistNode): CMI5ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Must be a course node at root
  if (!validateCMI5CourseNode(tree)) {
    errors.push('Root node must be a CMI5 course node');
    return { valid: false, errors, warnings };
  }

  const courseNode = tree as CMI5CourseNode;

  // Validate root course node
  if (!courseNode.id || courseNode.id.trim() === '') {
    errors.push('Course node must have a non-empty ID');
  }

  if (!courseNode.title || courseNode.title.trim() === '') {
    errors.push('Course node must have a non-empty title');
  }

  // Track IDs for uniqueness checking
  const courseIds = new Set<string>();
  const auIds = new Set<string>();
  const objectiveIds = new Set<string>();

  courseIds.add(courseNode.id);

  // Validate all nodes in the tree
  visitCMI5Tree(tree, (node: CMI5UnistNode) => {
    // Check ID uniqueness and validate based on type
    // Use type guards for proper narrowing
    if (isCMI5CourseNode(node)) {
      if (courseIds.has(node.id)) {
        errors.push(`Duplicate course ID: ${node.id}`);
      } else {
        courseIds.add(node.id);
      }
    } else if (isCMI5AUNode(node)) {
      // Type guard ensures correct narrowing to CMI5AssignableUnitNode
      if (auIds.has(node.id)) {
        errors.push(`Duplicate AU ID: ${node.id}`);
      } else {
        auIds.add(node.id);
      }

      // Validate AU node structure
      const auId = node.id; // Store id before validation (which may narrow incorrectly)
      if (!validateCMI5AUNode(node)) {
        errors.push(`Invalid AU node structure: ${auId}`);
      }

      // Validate AU-specific fields
      if (!node.launchUrl || !isValidUrl(node.launchUrl)) {
        errors.push(`Invalid launch URL for AU ${node.id}: ${node.launchUrl}`);
      }

      if (node.masteryScore !== undefined) {
        if (node.masteryScore < 0 || node.masteryScore > 1) {
          errors.push(`Invalid mastery score for AU ${node.id}: ${node.masteryScore} (must be 0-1)`);
        }
      }

      // Check if AU has objectives
      if (node.children.length === 0) {
        warnings.push(`AU ${node.id} has no objectives`);
      }
    } else if (isCMI5ObjectiveNode(node)) {
      // Type guard ensures correct narrowing to CMI5ObjectiveNode
      if (objectiveIds.has(node.id)) {
        errors.push(`Duplicate objective ID: ${node.id}`);
      } else {
        objectiveIds.add(node.id);
      }

      // Validate objective node structure
      const objectiveId = node.id; // Store id before validation (which may narrow incorrectly)
      if (!validateCMI5ObjectiveNode(node)) {
        errors.push(`Invalid objective node structure: ${objectiveId}`);
      }

      // Validate objective-specific fields
      if (node.masteryScore !== undefined) {
        if (node.masteryScore < 0 || node.masteryScore > 1) {
          errors.push(`Invalid mastery score for objective ${node.id}: ${node.masteryScore} (must be 0-1)`);
        }
      }

      if (!node.nodeId && !node.kubitId) {
        warnings.push(`Objective ${node.id} has no nodeId or kubitId (no source mapping)`);
      }
    }
  });

  // Validate tree structure
  visitCMI5AUs(courseNode, (au) => {
    const auNode = au as CMI5AssignableUnitNode;
    // Check that objectives belong to this AU
    visitCMI5Objectives(auNode, (objective) => {
      // Objectives should be direct children of AU
      if (!auNode.children.includes(objective)) {
        errors.push(`Objective ${objective.id} is not a direct child of AU ${auNode.id}`);
      }
    });
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate a single CMI5 node
 *
 * @param node - CMI5 UNIST node to validate
 * @returns Validation result
 */
export function validateCMI5Node(node: CMI5UnistNode): CMI5ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate based on node type
  if (node.type === 'cmi5:course') {
    if (!validateCMI5CourseNode(node)) {
      errors.push('Invalid course node structure');
    }
    if (!node.id || node.id.trim() === '') {
      errors.push('Course node must have a non-empty ID');
    }
    if (!node.title || node.title.trim() === '') {
      errors.push('Course node must have a non-empty title');
    }
  } else if (node.type === 'cmi5:au') {
    if (!validateCMI5AUNode(node)) {
      errors.push('Invalid AU node structure');
    }
    if (!node.id || node.id.trim() === '') {
      errors.push('AU node must have a non-empty ID');
    }
    if (!node.title || node.title.trim() === '') {
      errors.push('AU node must have a non-empty title');
    }
    if (!node.launchUrl || !isValidUrl(node.launchUrl)) {
      errors.push(`Invalid launch URL: ${node.launchUrl}`);
    }
  } else if (node.type === 'cmi5:objective') {
    if (!validateCMI5ObjectiveNode(node)) {
      errors.push('Invalid objective node structure');
    }
    if (!node.id || node.id.trim() === '') {
      errors.push('Objective node must have a non-empty ID');
    }
    if (!node.value || node.value.trim() === '') {
      errors.push('Objective node must have a non-empty value');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Check if a string is a valid URL
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get validation summary (counts of errors and warnings)
 *
 * @param result - Validation result
 * @returns Summary object
 */
export function getValidationSummary(result: CMI5ValidationResult): {
  valid: boolean;
  errorCount: number;
  warningCount: number;
} {
  return {
    valid: result.valid,
    errorCount: result.errors.length,
    warningCount: result.warnings.length,
  };
}
