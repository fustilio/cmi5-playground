import { describe, expect, it } from 'vitest';
import type { CMI5CourseNode, CMI5AssignableUnitNode } from './nodes';
import { isCMI5CourseNode, isCMI5AUNode } from './nodes';
import {
  serializeCMI5Tree,
  deserializeCMI5Tree,
  serializeCMI5TreeToObject,
  deserializeCMI5TreeFromObject,
  cloneCMI5Tree,
} from './serialization';

function createTestTree(): CMI5CourseNode {
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
        children: [
          {
            type: 'cmi5:objective',
            id: 'obj-1',
            description: 'Objective 1',
            masteryScore: 0.8,
            value: 'obj-1',
          },
        ],
      },
    ],
  };
}

describe('CMI5 UNIST Serialization', () => {
  describe('serializeCMI5Tree', () => {
    it('serializes tree to JSON string', () => {
      const tree = createTestTree();
      const json = serializeCMI5Tree(tree);

      expect(typeof json).toBe('string');
      expect(json).toContain('course-1');
      expect(json).toContain('Test Course');
    });

    it('supports pretty printing', () => {
      const tree = createTestTree();
      const json = serializeCMI5Tree(tree, 2);

      expect(json).toContain('\n');
      expect(json.split('\n').length).toBeGreaterThan(1);
    });
  });

  describe('deserializeCMI5Tree', () => {
    it('deserializes JSON string to tree', () => {
      const originalTree = createTestTree();
      const json = serializeCMI5Tree(originalTree);
      const deserialized = deserializeCMI5Tree(json);

      const deserializedCourse = deserialized as CMI5CourseNode;
      expect(deserializedCourse.id).toBe(originalTree.id);
      expect(deserializedCourse.title).toBe(originalTree.title);
      expect(deserializedCourse.children.length).toBe(originalTree.children.length);
    });

    it('throws error for invalid JSON', () => {
      expect(() => {
        deserializeCMI5Tree('invalid json');
      }).toThrow();
    });

    it('throws error for invalid structure', () => {
      expect(() => {
        deserializeCMI5Tree('{"invalid": "structure"}');
      }).toThrow();
    });

    it('throws error if root is not a course node', () => {
      const invalidJson = JSON.stringify({
        type: 'cmi5:au',
        id: 'au-1',
        title: 'AU',
        launchUrl: 'https://example.com',
        children: [],
      });

      expect(() => {
        deserializeCMI5Tree(invalidJson);
      }).toThrow('Root node must be a CMI5 course node');
    });
  });

  describe('round-trip serialization', () => {
    it('preserves data through serialize -> deserialize', () => {
      const originalTree = createTestTree();
      const json = serializeCMI5Tree(originalTree);
      const deserialized = deserializeCMI5Tree(json);

      const deserializedCourse = deserialized as CMI5CourseNode;
      expect(deserializedCourse.id).toBe(originalTree.id);
      expect(deserializedCourse.title).toBe(originalTree.title);
      expect(deserializedCourse.description).toBe(originalTree.description);
      expect(deserializedCourse.children.length).toBe(originalTree.children.length);
      if (deserializedCourse.children[0] && originalTree.children[0]) {
        const deserializedAU = deserializedCourse.children[0] as CMI5AssignableUnitNode;
        const originalAU = originalTree.children[0] as CMI5AssignableUnitNode;
        expect(deserializedAU.id).toBe(originalAU.id);
        expect(deserializedAU.children.length).toBe(originalAU.children.length);
      }
    });
  });

  describe('serializeCMI5TreeToObject', () => {
    it('serializes tree to plain object', () => {
      const tree = createTestTree();
      const obj = serializeCMI5TreeToObject(tree);

      expect(typeof obj).toBe('object');
      expect(obj).not.toBe(tree); // Different reference
      expect((obj as any).id).toBe('course-1');
    });
  });

  describe('deserializeCMI5TreeFromObject', () => {
    it('deserializes object to tree', () => {
      const originalTree = createTestTree();
      const obj = serializeCMI5TreeToObject(originalTree);
      const deserialized = deserializeCMI5TreeFromObject(obj);

      // Type narrowing: deserialized should be a CMI5CourseNode
      if (isCMI5CourseNode(deserialized)) {
        expect(deserialized.id).toBe(originalTree.id);
        expect(deserialized.title).toBe(originalTree.title);
      } else {
        throw new Error('Deserialized tree should be a CMI5CourseNode');
      }
    });

    it('throws error for invalid object', () => {
      expect(() => {
        deserializeCMI5TreeFromObject({ invalid: 'structure' });
      }).toThrow();
    });
  });

  describe('cloneCMI5Tree', () => {
    it('creates a deep copy', () => {
      const originalTree = createTestTree();
      const cloned = cloneCMI5Tree(originalTree);

      const clonedCourse = cloned as CMI5CourseNode;
      expect(clonedCourse).not.toBe(originalTree); // Different reference
      expect(clonedCourse.id).toBe(originalTree.id);
      expect(clonedCourse.children).not.toBe(originalTree.children); // Different reference
      if (clonedCourse.children[0] && originalTree.children[0]) {
        expect(clonedCourse.children[0]).not.toBe(originalTree.children[0]); // Different reference
      }
    });

    it('modifications to clone do not affect original', () => {
      const originalTree = createTestTree();
      const cloned = cloneCMI5Tree(originalTree);

      // Type narrowing: cloned should be a CMI5CourseNode
      if (isCMI5CourseNode(cloned) && isCMI5CourseNode(originalTree)) {
        cloned.title = 'Modified Title';
        const clonedFirstChild = cloned.children[0];
        const originalFirstChild = originalTree.children[0];
        if (clonedFirstChild && originalFirstChild && isCMI5AUNode(clonedFirstChild) && isCMI5AUNode(originalFirstChild)) {
          clonedFirstChild.title = 'Modified AU';
          expect(originalTree.title).toBe('Test Course');
          expect(originalFirstChild.title).toBe('AU 1');
        }
      } else {
        throw new Error('Cloned tree should be a CMI5CourseNode');
      }
    });
  });
});
