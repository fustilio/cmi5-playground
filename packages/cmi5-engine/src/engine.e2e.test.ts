import { describe, expect, it } from 'vitest';
import { CMI5LearningEngine } from './engine';
import type { CMI5Course, CMI5ObjectiveState } from '@lalia/cmi5-core';
import type { CMI5State } from '@lalia/cmi5-core';

function createObjectiveState(
  objectiveId: string,
  nodeId: string,
  mastery: number,
  satisfied = mastery >= 0.8
): CMI5ObjectiveState {
  const timestamp = new Date().toISOString();
  return {
    objectiveId,
    nodeId,
    mastery,
    satisfied,
    lastAttempted: timestamp,
    attempts: mastery > 0 ? 1 : 0,
  };
}

const au1: CMI5Course['assignableUnits'][0] = {
  id: 'au-1',
  title: 'AU 1',
  launchUrl: 'https://example.com/au-1',
  order: 1,
  objectives: [
    {
      id: 'obj-1',
      description: 'Master objective 1',
      masteryScore: 0.8,
      nodeId: 'node-1',
    },
    {
      id: 'obj-2',
      description: 'Master objective 2',
      masteryScore: 0.8,
      nodeId: 'node-2',
    },
  ],
  completionCriteria: {
    masteryPercentage: 1,
  },
  moveOn: 'CompletedAndPassed',
};

const au2: CMI5Course['assignableUnits'][0] = {
  id: 'au-2',
  title: 'AU 2',
  launchUrl: 'https://example.com/au-2',
  order: 2,
  prerequisites: ['au-1'],
  objectives: [
    {
      id: 'obj-3',
      description: 'Master objective 3',
      masteryScore: 0.8,
      nodeId: 'node-3',
    },
  ],
  completionCriteria: {
    masteryPercentage: 1,
    requireAllContent: true,
  },
  moveOn: 'Completed',
};

const au3: CMI5Course['assignableUnits'][0] = {
  id: 'au-3',
  title: 'AU 3',
  launchUrl: 'https://example.com/au-3',
  order: 3,
  prerequisites: ['au-2'],
  objectives: [
    {
      id: 'obj-4',
      description: 'Master objective 4',
      masteryScore: 0.8,
      nodeId: 'node-4',
    },
  ],
  moveOn: 'Completed',
};

const course: CMI5Course = {
  id: 'course-1',
  title: 'Test Course',
  assignableUnits: [au1, au2, au3],
};

describe('CMI5LearningEngine', () => {
  describe('constructor', () => {
    it('accepts CMI5Course', () => {
      const engine = new CMI5LearningEngine(course);
      expect(engine).toBeDefined();
    });

    it('accepts CMI5CourseNode', async () => {
      const { buildCMI5Tree } = await import('@lalia/cmi5-core/unist');
      const tree = buildCMI5Tree(course);
      const engine = new CMI5LearningEngine(tree);
      expect(engine).toBeDefined();
    });
  });

  describe('evaluate', () => {
    it('evaluates course with no progress', () => {
      const engine = new CMI5LearningEngine(course);
      const snapshot = engine.evaluate();

      expect(snapshot.aus.size).toBe(3);
      expect(snapshot.course.id).toBe('course-1');
      expect(snapshot.course.title).toBe('Test Course');

      const au1Eval = snapshot.aus.get('au-1');
      expect(au1Eval).toBeDefined();
      expect(au1Eval?.status).toBe('available');
      expect(au1Eval?.objectives.total).toBe(2);
    });

    it('evaluates prerequisites correctly', () => {
      const engine = new CMI5LearningEngine(course);
      const snapshot = engine.evaluate();

      const au2Eval = snapshot.aus.get('au-2');
      expect(au2Eval).toBeDefined();
      expect(au2Eval?.prerequisites.ids).toContain('au-1');
      expect(au2Eval?.prerequisites.met).toBe(false); // au-1 not completed
      expect(au2Eval?.status).toBe('locked');
    });

    it('evaluates completion with mastery', () => {
      const objectiveStates = new Map<string, CMI5ObjectiveState>();
      objectiveStates.set('obj-1', createObjectiveState('obj-1', 'node-1', 0.9));
      objectiveStates.set('obj-2', createObjectiveState('obj-2', 'node-2', 0.9));

      const state: CMI5State = {
        registration: 'reg-1',
        launchMode: 'Normal',
        objectiveStates,
        progress: {
          completedLessons: [],
          timeSpent: 0,
        },
        completed: false,
      };

      const engine = new CMI5LearningEngine(course);
      const snapshot = engine.evaluate({ cmi5State: state });

      const au1Eval = snapshot.aus.get('au-1');
      expect(au1Eval).toBeDefined();
      expect(au1Eval?.objectives.mastered).toBe(2);
      expect(au1Eval?.objectives.masteryAverage).toBeGreaterThan(0.8);
      expect(au1Eval?.completion.isComplete).toBe(true);
    });

    it('evaluates move-on criteria', () => {
      const objectiveStates = new Map<string, CMI5ObjectiveState>();
      objectiveStates.set('obj-1', createObjectiveState('obj-1', 'node-1', 0.9));
      objectiveStates.set('obj-2', createObjectiveState('obj-2', 'node-2', 0.9));

      const state: CMI5State = {
        registration: 'reg-1',
        launchMode: 'Normal',
        objectiveStates,
        progress: {
          completedLessons: [],
          timeSpent: 0,
        },
        completed: false,
      };

      const engine = new CMI5LearningEngine(course);
      const snapshot = engine.evaluate({ cmi5State: state });

      const au1Eval = snapshot.aus.get('au-1');
      expect(au1Eval).toBeDefined();
      expect(au1Eval?.moveOn.isSatisfied).toBe(true); // CompletedAndPassed
      expect(au1Eval?.status).toBe('passed');
    });

    it('unlocks AU when prerequisites are met', () => {
      const objectiveStates = new Map<string, CMI5ObjectiveState>();
      objectiveStates.set('obj-1', createObjectiveState('obj-1', 'node-1', 0.9));
      objectiveStates.set('obj-2', createObjectiveState('obj-2', 'node-2', 0.9));

      const state: CMI5State = {
        registration: 'reg-1',
        launchMode: 'Normal',
        objectiveStates,
        progress: {
          completedLessons: ['au-1'],
          timeSpent: 0,
        },
        completed: false,
      };

      const engine = new CMI5LearningEngine(course);
      const snapshot = engine.evaluate({ cmi5State: state });

      const au2Eval = snapshot.aus.get('au-2');
      expect(au2Eval).toBeDefined();
      expect(au2Eval?.prerequisites.met).toBe(true);
      expect(au2Eval?.status).toBe('available');
    });

    it('evaluates completion criteria with content requirements', () => {
      const objectiveStates = new Map<string, CMI5ObjectiveState>();
      objectiveStates.set('obj-3', createObjectiveState('obj-3', 'node-3', 0.9));

      const state: CMI5State = {
        registration: 'reg-1',
        launchMode: 'Normal',
        objectiveStates,
        progress: {
          completedLessons: ['au-1'],
          timeSpent: 0,
        },
        completed: false,
      };

      const engine = new CMI5LearningEngine(course);
      const snapshot = engine.evaluate({
        cmi5State: state,
        lessonSignals: {
          'au-2': {
            contentCompleted: true,
            exercisesCompleted: false,
          },
        },
      });

      const au2Eval = snapshot.aus.get('au-2');
      expect(au2Eval).toBeDefined();
      expect(au2Eval?.completion.requiresContent).toBe(true);
      expect(au2Eval?.completion.isComplete).toBe(true); // Mastery + content completed
    });
  });
});
