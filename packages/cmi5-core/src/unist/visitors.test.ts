import { describe, expect, it } from 'vitest';
import type {
  CMI5CourseNode,
  CMI5AssignableUnitNode,
  CMI5ObjectiveNode,
} from './nodes';
import {
  visitCMI5Tree,
  visitCMI5Objectives,
  visitCMI5AUs,
  findCMI5NodeById,
  findCMI5ObjectiveById,
  findCMI5AUById,
  collectCMI5Objectives,
  collectCMI5AUs,
  filterCMI5Objectives,
  filterCMI5AUs,
} from './visitors';

function createTestTree(): CMI5CourseNode {
  const objective1: CMI5ObjectiveNode = {
    type: 'cmi5:objective',
    id: 'obj-1',
    description: 'Objective 1',
    masteryScore: 0.8,
    value: 'obj-1',
  };

  const objective2: CMI5ObjectiveNode = {
    type: 'cmi5:objective',
    id: 'obj-2',
    description: 'Objective 2',
    masteryScore: 0.9,
    value: 'obj-2',
  };

  const au1: CMI5AssignableUnitNode = {
    type: 'cmi5:au',
    id: 'au-1',
    title: 'AU 1',
    launchUrl: 'https://example.com/au-1',
    children: [objective1],
  };

  const au2: CMI5AssignableUnitNode = {
    type: 'cmi5:au',
    id: 'au-2',
    title: 'AU 2',
    launchUrl: 'https://example.com/au-2',
    children: [objective2],
  };

  const course: CMI5CourseNode = {
    type: 'cmi5:course',
    id: 'course-1',
    title: 'Test Course',
    children: [au1, au2],
  };

  return course;
}

describe('CMI5 UNIST Visitors', () => {
  describe('visitCMI5Tree', () => {
    it('visits all nodes in the tree', () => {
      const tree = createTestTree();
      const visited: string[] = [];

      visitCMI5Tree(tree, (node) => {
        visited.push(node.id);
      });

      expect(visited).toContain('course-1');
      expect(visited).toContain('au-1');
      expect(visited).toContain('au-2');
      expect(visited).toContain('obj-1');
      expect(visited).toContain('obj-2');
      expect(visited.length).toBe(5);
    });

    it('can stop traversal early', () => {
      const tree = createTestTree();
      const visited: string[] = [];

      visitCMI5Tree(tree, (node) => {
        visited.push(node.id);
        if (node.id === 'au-1') {
          return false; // Stop
        }
      });

      expect(visited.length).toBeLessThan(5);
    });
  });

  describe('visitCMI5Objectives', () => {
    it('visits only objective nodes', () => {
      const tree = createTestTree();
      const visited: string[] = [];

      visitCMI5Objectives(tree, (objective) => {
        visited.push(objective.id);
      });

      expect(visited).toContain('obj-1');
      expect(visited).toContain('obj-2');
      expect(visited.length).toBe(2);
    });
  });

  describe('visitCMI5AUs', () => {
    it('visits only AU nodes', () => {
      const tree = createTestTree();
      const visited: string[] = [];

      visitCMI5AUs(tree, (au) => {
        visited.push(au.id);
      });

      expect(visited).toContain('au-1');
      expect(visited).toContain('au-2');
      expect(visited.length).toBe(2);
    });
  });

  describe('findCMI5NodeById', () => {
    it('finds a node by ID', () => {
      const tree = createTestTree();

      const found = findCMI5NodeById(tree, 'au-1');
      expect(found).toBeDefined();
      expect(found?.id).toBe('au-1');
      expect(found?.type).toBe('cmi5:au');
    });

    it('returns undefined if not found', () => {
      const tree = createTestTree();

      const found = findCMI5NodeById(tree, 'nonexistent');
      expect(found).toBeUndefined();
    });
  });

  describe('findCMI5ObjectiveById', () => {
    it('finds an objective by ID', () => {
      const tree = createTestTree();

      const found = findCMI5ObjectiveById(tree, 'obj-1');
      expect(found).toBeDefined();
      expect(found?.id).toBe('obj-1');
      expect(found?.type).toBe('cmi5:objective');
    });
  });

  describe('findCMI5AUById', () => {
    it('finds an AU by ID', () => {
      const tree = createTestTree();

      const found = findCMI5AUById(tree, 'au-1');
      expect(found).toBeDefined();
      expect(found?.id).toBe('au-1');
      expect(found?.type).toBe('cmi5:au');
    });
  });

  describe('collectCMI5Objectives', () => {
    it('collects all objectives', () => {
      const tree = createTestTree();

      const objectives = collectCMI5Objectives(tree);
      expect(objectives.length).toBe(2);
      expect(objectives.map(o => o.id)).toContain('obj-1');
      expect(objectives.map(o => o.id)).toContain('obj-2');
    });
  });

  describe('collectCMI5AUs', () => {
    it('collects all AUs', () => {
      const tree = createTestTree();

      const aus = collectCMI5AUs(tree);
      expect(aus.length).toBe(2);
      const auIds = aus.map(au => au.id);
      expect(auIds).toContain('au-1');
      expect(auIds).toContain('au-2');
    });
  });

  describe('filterCMI5Objectives', () => {
    it('filters objectives by predicate', () => {
      const tree = createTestTree();

      const highMastery = filterCMI5Objectives(tree, (obj) => {
        return (obj.masteryScore || 0) >= 0.9;
      });

      expect(highMastery.length).toBe(1);
      expect(highMastery[0]?.id).toBe('obj-2');
    });
  });

  describe('filterCMI5AUs', () => {
    it('filters AUs by predicate', () => {
      const tree = createTestTree();

      const filtered = filterCMI5AUs(tree, (au) => {
        return au.id === 'au-1';
      });

      expect(filtered.length).toBe(1);
      if (filtered[0]) {
        expect(filtered[0].id).toBe('au-1');
      }
    });
  });
});
