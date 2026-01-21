import { describe, expect, it } from 'vitest';
import type {
  CMI5CourseNode,
  CMI5AssignableUnitNode,
  CMI5ObjectiveNode,
} from './nodes';
import type { CMI5Course, CMI5AssignableUnit, CMI5Objective } from '../types';
import {
  flattenCMI5Tree,
  buildCMI5Tree,
  mapCMI5Tree,
  filterCMI5Tree,
  extractCMI5NodeIds,
} from './transformers';

function createTestTree(): CMI5CourseNode {
  const objective1: CMI5ObjectiveNode = {
    type: 'cmi5:objective',
    id: 'obj-1',
    description: 'Objective 1',
    masteryScore: 0.8,
    nodeId: 'node-1',
    value: 'obj-1',
  };

  const objective2: CMI5ObjectiveNode = {
    type: 'cmi5:objective',
    id: 'obj-2',
    description: 'Objective 2',
    masteryScore: 0.9,
    nodeId: 'node-2',
    value: 'obj-2',
  };

  const au: CMI5AssignableUnitNode = {
    type: 'cmi5:au',
    id: 'au-1',
    title: 'AU 1',
    launchUrl: 'https://example.com/au-1',
    masteryScore: 0.8,
    moveOn: 'CompletedAndPassed',
    children: [objective1, objective2],
  };

  const course: CMI5CourseNode = {
    type: 'cmi5:course',
    id: 'course-1',
    title: 'Test Course',
    description: 'A test course',
    children: [au],
  };

  return course;
}

describe('CMI5 UNIST Transformers', () => {
  describe('flattenCMI5Tree', () => {
    it('converts tree to flat structure', () => {
      const tree = createTestTree();
      const flat = flattenCMI5Tree(tree);

      expect(flat.id).toBe('course-1');
      expect(flat.title).toBe('Test Course');
      expect(flat.description).toBe('A test course');
      expect(flat.assignableUnits.length).toBe(1);
      expect(flat.assignableUnits[0]?.id).toBe('au-1');
      expect(flat.assignableUnits[0]?.objectives.length).toBe(2);
      expect(flat.assignableUnits[0]?.objectives[0]?.id).toBe('obj-1');
      expect(flat.assignableUnits[0]?.objectives[1]?.id).toBe('obj-2');
    });
  });

  describe('buildCMI5Tree', () => {
    it('converts flat structure to tree', () => {
      const flat: CMI5Course = {
        id: 'course-1',
        title: 'Test Course',
        description: 'A test course',
        assignableUnits: [
          {
            id: 'au-1',
            title: 'AU 1',
            launchUrl: 'https://example.com/au-1',
            masteryScore: 0.8,
            moveOn: 'CompletedAndPassed',
            objectives: [
              {
                id: 'obj-1',
                description: 'Objective 1',
                masteryScore: 0.8,
                nodeId: 'node-1',
              },
              {
                id: 'obj-2',
                description: 'Objective 2',
                masteryScore: 0.9,
                nodeId: 'node-2',
              },
            ],
          },
        ],
      };

      const tree = buildCMI5Tree(flat);

      expect(tree.type).toBe('cmi5:course');
      expect(tree.id).toBe('course-1');
      expect(tree.title).toBe('Test Course');
      expect(tree.children.length).toBe(1);
      if (tree.children[0]) {
        expect(tree.children[0].type).toBe('cmi5:au');
        expect(tree.children[0].children.length).toBe(2);
        if (tree.children[0].children[0]) {
          expect(tree.children[0].children[0].type).toBe('cmi5:objective');
        }
      }
    });
  });

  describe('round-trip conversion', () => {
    it('preserves data through tree -> flat -> tree conversion', () => {
      const originalTree = createTestTree();
      const flat = flattenCMI5Tree(originalTree);
      const reconstructedTree = buildCMI5Tree(flat);

      expect(reconstructedTree.id).toBe(originalTree.id);
      expect(reconstructedTree.title).toBe(originalTree.title);
      expect(reconstructedTree.children.length).toBe(originalTree.children.length);
      if (reconstructedTree.children[0] && originalTree.children[0]) {
        expect(reconstructedTree.children[0].id).toBe(originalTree.children[0].id);
        expect(reconstructedTree.children[0].children.length).toBe(originalTree.children[0].children.length);
      }
    });
  });

  describe('mapCMI5Tree', () => {
    it('transforms tree nodes', () => {
      const tree = createTestTree();

      const transformed = mapCMI5Tree(tree, (node) => {
        if (node.type === 'cmi5:objective') {
          return {
            ...node,
            description: `Modified: ${node.description}`,
          };
        }
        return node;
      }) as CMI5CourseNode;

      const au = transformed.children[0];
      expect(au).toBeDefined();
      if (au) {
        const obj1 = au.children[0];
        const obj2 = au.children[1];
        expect(obj1).toBeDefined();
        expect(obj2).toBeDefined();
        if (obj1) expect(obj1.description).toBe('Modified: Objective 1');
        if (obj2) expect(obj2.description).toBe('Modified: Objective 2');
      }
    });
  });

  describe('filterCMI5Tree', () => {
    it('filters tree nodes', () => {
      const tree = createTestTree();

      const filtered = filterCMI5Tree(tree, (node) => {
        // Keep only objectives with masteryScore >= 0.9
        if (node.type === 'cmi5:objective') {
          return (node.masteryScore || 0) >= 0.9;
        }
        return true; // Keep all other nodes
      });

      if (filtered.children[0]) {
      const filteredAU = filtered.children[0];
      if (filteredAU) {
        expect(filteredAU.children.length).toBe(1);
        const filteredObjective = filteredAU.children[0];
        if (filteredObjective) {
          expect(filteredObjective.id).toBe('obj-2');
        }
      }
      }
    });
  });

  describe('extractCMI5NodeIds', () => {
    it('extracts all node IDs', () => {
      const tree = createTestTree();
      const ids = extractCMI5NodeIds(tree);

      expect(ids.courses).toContain('course-1');
      expect(ids.aus).toContain('au-1');
      expect(ids.objectives).toContain('obj-1');
      expect(ids.objectives).toContain('obj-2');
    });
  });
});
