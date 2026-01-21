import { describe, expect, it } from 'vitest';
import type {
  CMI5CourseNode,
  CMI5AssignableUnitNode,
  CMI5ObjectiveNode,
} from './nodes';
import {
  validateCMI5Tree,
  validateCMI5Node,
  getValidationSummary,
} from './validation';

function createValidTree(): CMI5CourseNode {
  return {
    type: 'cmi5:course',
    id: 'course-1',
    title: 'Test Course',
    description: 'A test course',
    children: [
      {
        type: 'cmi5:au',
        id: 'au-1',
        title: 'AU 1',
        launchUrl: 'https://example.com/au-1',
        masteryScore: 0.8,
        moveOn: 'CompletedAndPassed',
        children: [
          {
            type: 'cmi5:objective',
            id: 'obj-1',
            description: 'Objective 1',
            masteryScore: 0.8,
            nodeId: 'node-1',
            value: 'obj-1',
          },
        ],
      },
    ],
  };
}

describe('CMI5 UNIST Validation', () => {
  describe('validateCMI5Tree', () => {
    it('validates a valid tree', () => {
      const tree = createValidTree();
      const result = validateCMI5Tree(tree);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('detects missing course ID', () => {
      const tree = createValidTree();
      tree.id = '';

      const result = validateCMI5Tree(tree);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Course node must have a non-empty ID');
    });

    it('detects missing course title', () => {
      const tree = createValidTree();
      tree.title = '';

      const result = validateCMI5Tree(tree);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Course node must have a non-empty title');
    });

    it('detects invalid launch URL', () => {
      const tree = createValidTree();
      if (tree.children[0]) {
        tree.children[0].launchUrl = 'not-a-url';
      }

      const result = validateCMI5Tree(tree);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid launch URL'))).toBe(true);
    });

    it('detects invalid mastery score', () => {
      const tree = createValidTree();
      if (tree.children[0]) {
        tree.children[0].masteryScore = 1.5; // Invalid: > 1
      }

      const result = validateCMI5Tree(tree);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid mastery score'))).toBe(true);
    });

    it('detects duplicate IDs', () => {
      const tree = createValidTree();
      // Add duplicate objective
      if (tree.children[0]) {
        tree.children[0].children.push({
          type: 'cmi5:objective',
          id: 'obj-1', // Duplicate
          value: 'obj-1',
        });
      }

      const result = validateCMI5Tree(tree);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Duplicate objective ID'))).toBe(true);
    });

    it('warns about AU with no objectives', () => {
      const tree = createValidTree();
      if (tree.children[0]) {
        tree.children[0].children = []; // No objectives
      }

      const result = validateCMI5Tree(tree);
      expect(result.valid).toBe(true); // Still valid, just a warning
      expect(result.warnings.some(w => w.includes('has no objectives'))).toBe(true);
    });

    it('warns about objective with no nodeId or kubitId', () => {
      const tree = createValidTree();
      if (tree.children[0]?.children[0]) {
        tree.children[0].children[0].nodeId = undefined;
        tree.children[0].children[0].kubitId = undefined;
      }

      const result = validateCMI5Tree(tree);
      expect(result.valid).toBe(true); // Still valid, just a warning
      expect(result.warnings.some(w => w.includes('no nodeId or kubitId'))).toBe(true);
    });
  });

  describe('validateCMI5Node', () => {
    it('validates a valid course node', () => {
      const node: CMI5CourseNode = {
        type: 'cmi5:course',
        id: 'course-1',
        title: 'Test Course',
        children: [],
      };

      const result = validateCMI5Node(node);
      expect(result.valid).toBe(true);
    });

    it('validates a valid AU node', () => {
      const node: CMI5AssignableUnitNode = {
        type: 'cmi5:au',
        id: 'au-1',
        title: 'AU 1',
        launchUrl: 'https://example.com/au-1',
        children: [],
      };

      const result = validateCMI5Node(node);
      expect(result.valid).toBe(true);
    });

    it('validates a valid objective node', () => {
      const node: CMI5ObjectiveNode = {
        type: 'cmi5:objective',
        id: 'obj-1',
        value: 'obj-1',
      };

      const result = validateCMI5Node(node);
      expect(result.valid).toBe(true);
    });

    it('detects invalid node structure', () => {
      const invalidNode = {
        type: 'invalid',
        id: 'test',
      } as any;

      const result = validateCMI5Node(invalidNode);
      expect(result.valid).toBe(false);
    });
  });

  describe('getValidationSummary', () => {
    it('returns summary counts', () => {
      const tree = createValidTree();
      tree.id = ''; // Add an error
      if (tree.children[0]) {
        tree.children[0].children = []; // Add a warning
      }

      const result = validateCMI5Tree(tree);
      const summary = getValidationSummary(result);

      expect(summary.valid).toBe(false);
      expect(summary.errorCount).toBeGreaterThan(0);
      expect(summary.warningCount).toBeGreaterThan(0);
    });
  });
});
