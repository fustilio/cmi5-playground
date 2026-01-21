import { describe, expect, it } from 'vitest';
import type {
  CMI5CourseNode,
  CMI5AssignableUnitNode,
  CMI5ObjectiveNode,
} from './nodes';
import {
  isCMI5CourseNode,
  isCMI5AUNode,
  isCMI5ObjectiveNode,
  isCMI5UnistNode,
  isCMI5UnistParent,
} from './nodes';

describe('CMI5 UNIST Node Types', () => {
  describe('Type Guards', () => {
    it('identifies CMI5 course nodes', () => {
      const course: CMI5CourseNode = {
        type: 'cmi5:course',
        id: 'course-1',
        title: 'Test Course',
        children: [],
      };

      expect(isCMI5CourseNode(course)).toBe(true);
      expect(isCMI5AUNode(course)).toBe(false);
      expect(isCMI5ObjectiveNode(course)).toBe(false);
      expect(isCMI5UnistNode(course)).toBe(true);
      expect(isCMI5UnistParent(course)).toBe(true);
    });

    it('identifies CMI5 AU nodes', () => {
      const au: CMI5AssignableUnitNode = {
        type: 'cmi5:au',
        id: 'au-1',
        title: 'Test AU',
        launchUrl: 'https://example.com/au-1',
        children: [],
      };

      expect(isCMI5CourseNode(au)).toBe(false);
      expect(isCMI5AUNode(au)).toBe(true);
      expect(isCMI5ObjectiveNode(au)).toBe(false);
      expect(isCMI5UnistNode(au)).toBe(true);
      expect(isCMI5UnistParent(au)).toBe(true);
    });

    it('identifies CMI5 objective nodes', () => {
      const objective: CMI5ObjectiveNode = {
        type: 'cmi5:objective',
        id: 'obj-1',
        value: 'obj-1',
      };

      expect(isCMI5CourseNode(objective)).toBe(false);
      expect(isCMI5AUNode(objective)).toBe(false);
      expect(isCMI5ObjectiveNode(objective)).toBe(true);
      expect(isCMI5UnistNode(objective)).toBe(true);
      expect(isCMI5UnistParent(objective)).toBe(false);
    });
  });

  describe('Node Structure', () => {
    it('creates a complete CMI5 tree', () => {
      const objective: CMI5ObjectiveNode = {
        type: 'cmi5:objective',
        id: 'obj-1',
        description: 'Master vocabulary',
        masteryScore: 0.8,
        nodeId: 'vocab-1',
        value: 'obj-1',
      };

      const au: CMI5AssignableUnitNode = {
        type: 'cmi5:au',
        id: 'au-1',
        title: 'Lesson 1',
        launchUrl: 'https://example.com/lesson-1',
        masteryScore: 0.8,
        moveOn: 'CompletedAndPassed',
        children: [objective],
      };

      const course: CMI5CourseNode = {
        type: 'cmi5:course',
        id: 'course-1',
        title: 'Test Course',
        description: 'A test course',
        children: [au],
      };

      expect(course.children.length).toBe(1);
      expect(course.children[0]?.children.length).toBe(1);
      expect(course.children[0]?.children[0]?.id).toBe('obj-1');
    });
  });
});
