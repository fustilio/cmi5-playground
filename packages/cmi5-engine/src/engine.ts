/**
 * CMI5 Learning Engine (Framework-Agnostic)
 *
 * Evaluates CMI5 course dependencies, completion, and move-on criteria
 * using CMI5 objective state. Works with CMI5 structures only.
 */

import type {
  CMI5Course,
  CMI5AssignableUnit,
  CMI5Objective,
  CMI5ObjectiveState,
  CMI5State,
  CMI5CompletionCriteria,
} from 'cmi5-core';
import type { CMI5CourseNode } from 'cmi5-core/unist';
import { DEFAULT_MASTERY_SCORE } from 'cmi5-core';
import { flattenCMI5Tree } from 'cmi5-core/unist';

// Type guard to check if a course is a tree node
function isCMI5CourseNode(course: CMI5Course | CMI5CourseNode): course is CMI5CourseNode {
  return 'type' in course && (course as CMI5CourseNode).type === 'cmi5:course';
}

export type LessonStatus = 'locked' | 'available' | 'in-progress' | 'completed' | 'passed';
export type PrerequisitePolicy = 'completion' | 'moveOn';
export type MissingPrerequisiteBehavior = 'ignore' | 'lock';

export interface LessonSignal {
  contentCompleted?: boolean;
  exercisesCompleted?: boolean;
}

export interface CMI5LearningEngineOptions {
  defaultMasteryScore?: number;
  prerequisitePolicy?: PrerequisitePolicy;
  missingPrerequisiteBehavior?: MissingPrerequisiteBehavior;
}

export interface CMI5LearningEngineProgress {
  cmi5State?: CMI5State | null;
  lessonSignals?: Record<string, LessonSignal>;
}

export interface ObjectiveProgress {
  id: string;
  nodeId?: string;
  kubitId?: string; // Backward compatibility
  mastery: number;
  masteryScore: number;
  satisfied: boolean;
  attempts: number;
  source: 'cmi5' | 'none';
}

export interface AUEvaluation {
  auId: string;
  title: string;
  order: number;
  status: LessonStatus;
  started: boolean;
  prerequisites: {
    ids: string[];
    unmetIds: string[];
    missingIds: string[];
    met: boolean;
  };
  objectives: {
    total: number;
    mastered: number;
    masteryAverage: number;
    details: ObjectiveProgress[];
  };
  completion: {
    isComplete: boolean;
    criteria?: CMI5CompletionCriteria;
    fromState: boolean;
    requiresContent: boolean;
    requiresExercises: boolean;
  };
  pass: {
    isPassed: boolean;
    masteryScore: number | null;
    averageMastery: number;
  };
  moveOn: {
    criteria: 'Passed' | 'Completed' | 'CompletedAndPassed' | 'NotApplicable';
    isSatisfied: boolean;
  };
}

export interface CMI5LearningEngineSnapshot {
  aus: Map<string, AUEvaluation>;
  course: {
    id: string;
    title: string;
    status: LessonStatus;
  };
}

interface AUDescriptor {
  id: string;
  title: string;
  order: number;
  prerequisites: string[];
  objectives: CMI5Objective[];
  masteryScore?: number;
  moveOn?: 'Passed' | 'Completed' | 'CompletedAndPassed' | 'NotApplicable';
  completionCriteria?: CMI5CompletionCriteria;
  au: CMI5AssignableUnit;
}

function buildCourseIndex(course: CMI5Course): {
  courseId: string;
  courseTitle: string;
  aus: Map<string, AUDescriptor>;
} {
  const aus = new Map<string, AUDescriptor>();

  for (const au of course.assignableUnits) {
    aus.set(au.id, {
      id: au.id,
      title: au.title,
      order: au.order ?? 0,
      prerequisites: au.prerequisites || [],
      objectives: au.objectives,
      masteryScore: au.masteryScore,
      moveOn: au.moveOn,
      completionCriteria: au.completionCriteria,
      au,
    });
  }

  return {
    courseId: course.id,
    courseTitle: course.title,
    aus,
  };
}

function resolveObjectiveState(
  objective: CMI5Objective,
  objectiveStates: Map<string, CMI5ObjectiveState> | undefined,
  masteryScore: number
): CMI5ObjectiveState | null {
  if (objectiveStates) {
    // Try direct objective ID
    const directState = objectiveStates.get(objective.id);
    if (directState) {
      return directState;
    }

    // Try nodeId if present
    if (objective.nodeId) {
      const nodeState = objectiveStates.get(objective.nodeId);
      if (nodeState) {
        return nodeState;
      }
    }

    // Try kubitId for backward compatibility
    if (objective.kubitId) {
      const kubitState = objectiveStates.get(objective.kubitId);
      if (kubitState) {
        return kubitState;
      }
    }
  }

  return null;
}

function aggregateStatus(statuses: LessonStatus[]): LessonStatus {
  if (statuses.length === 0) {
    return 'locked';
  }

  const counts = {
    locked: 0,
    available: 0,
    'in-progress': 0,
    completed: 0,
    passed: 0,
  };

  for (const status of statuses) {
    counts[status]++;
  }

  if (counts.locked === statuses.length) {
    return 'locked';
  }
  if (counts.passed === statuses.length) {
    return 'passed';
  }
  if (counts.completed + counts.passed === statuses.length) {
    return 'completed';
  }
  if (counts['in-progress'] > 0 || (counts.completed + counts.passed > 0 && (counts.locked > 0 || counts.available > 0))) {
    return 'in-progress';
  }
  if (counts.available > 0) {
    return 'available';
  }
  return 'locked';
}

function evaluateCompletionCriteria(
  criteria: CMI5CompletionCriteria | undefined,
  objectiveMasteryAverage: number,
  objectiveMasteredCount: number,
  objectiveTotal: number,
  lessonSignals: LessonSignal | undefined,
  defaultMasteryScore: number
): {
  isComplete: boolean;
  requiresContent: boolean;
  requiresExercises: boolean;
} {
  const requiresContent = Boolean(criteria?.requireAllContent);
  const requiresExercises = Boolean(criteria?.requireAllExercises);
  const checks: boolean[] = [];

  if (criteria?.masteryScore !== undefined) {
    checks.push(objectiveMasteryAverage >= criteria.masteryScore);
  }

  if (criteria?.masteryPercentage !== undefined && objectiveTotal > 0) {
    checks.push(objectiveMasteredCount / objectiveTotal >= criteria.masteryPercentage);
  }

  if (criteria?.minMasteredCount !== undefined) {
    checks.push(objectiveMasteredCount >= criteria.minMasteredCount);
  }

  if (requiresContent) {
    checks.push(Boolean(lessonSignals?.contentCompleted));
  }

  if (requiresExercises) {
    checks.push(Boolean(lessonSignals?.exercisesCompleted));
  }

  if (checks.length === 0) {
    if (objectiveTotal > 0) {
      return {
        isComplete: objectiveMasteredCount === objectiveTotal,
        requiresContent,
        requiresExercises,
      };
    }

    const signalComplete = Boolean(lessonSignals?.contentCompleted || lessonSignals?.exercisesCompleted);
    return {
      isComplete: signalComplete ? true : false,
      requiresContent,
      requiresExercises,
    };
  }

  return {
    isComplete: checks.every(Boolean),
    requiresContent,
    requiresExercises,
  };
}

export class CMI5LearningEngine {
  private index: {
    courseId: string;
    courseTitle: string;
    aus: Map<string, AUDescriptor>;
  };
  private options: Required<Omit<CMI5LearningEngineOptions, 'prerequisitePolicy' | 'missingPrerequisiteBehavior'>> & {
    prerequisitePolicy: PrerequisitePolicy;
    missingPrerequisiteBehavior: MissingPrerequisiteBehavior;
  };

  constructor(course: CMI5Course | CMI5CourseNode, options: CMI5LearningEngineOptions = {}) {
    // Convert tree to flat if needed
    let flatCourse: CMI5Course;
    if (isCMI5CourseNode(course)) {
      flatCourse = flattenCMI5Tree(course as CMI5CourseNode);
    } else {
      flatCourse = course as CMI5Course;
    }

    this.options = {
      defaultMasteryScore: options.defaultMasteryScore ?? DEFAULT_MASTERY_SCORE,
      prerequisitePolicy: options.prerequisitePolicy ?? 'completion',
      missingPrerequisiteBehavior: options.missingPrerequisiteBehavior ?? 'ignore',
    };

    this.index = buildCourseIndex(flatCourse);
  }

  evaluate(progress: CMI5LearningEngineProgress = {}): CMI5LearningEngineSnapshot {
    const objectiveStates = progress.cmi5State?.objectiveStates;
    const completedAUs = progress.cmi5State?.progress.completedLessons || [];
    const currentAU = progress.cmi5State?.progress.currentLesson;
    const lessonSignals = progress.lessonSignals || {};

    const auEvaluations = new Map<string, AUEvaluation>();

    // First pass: evaluate each AU
    for (const auDescriptor of this.index.aus.values()) {
      const objectives = auDescriptor.objectives.map((objective) => {
        const masteryScore = objective.masteryScore ?? auDescriptor.masteryScore ?? this.options.defaultMasteryScore;

        const state = resolveObjectiveState(objective, objectiveStates, masteryScore);

        const mastery = state?.mastery ?? 0;
        const satisfied = state?.satisfied ?? mastery >= masteryScore;
        const attempts = state?.attempts ?? 0;
        const source = state ? 'cmi5' : 'none';

        return {
          id: objective.id,
          nodeId: objective.nodeId,
          kubitId: objective.kubitId, // Backward compatibility
          mastery,
          masteryScore,
          satisfied,
          attempts,
          source,
        } satisfies ObjectiveProgress;
      });

      const objectiveTotal = objectives.length;
      const objectiveMasteredCount = objectives.filter((objective) => objective.satisfied).length;
      const masteryAverage =
        objectiveTotal > 0
          ? objectives.reduce((sum, objective) => sum + objective.mastery, 0) / objectiveTotal
          : 0;

      const completionCriteria = auDescriptor.completionCriteria;
      const completionResult = evaluateCompletionCriteria(
        completionCriteria,
        masteryAverage,
        objectiveMasteredCount,
        objectiveTotal,
        lessonSignals[auDescriptor.id],
        this.options.defaultMasteryScore
      );

      const completedByState = completedAUs.includes(auDescriptor.id);
      const isComplete = completedByState ? true : completionResult.isComplete;

      const passThreshold =
        completionCriteria?.masteryScore ?? auDescriptor.masteryScore ?? this.options.defaultMasteryScore;
      const isPassed = objectiveTotal > 0 ? masteryAverage >= passThreshold : false;

      const started =
        completedByState ||
        currentAU === auDescriptor.id ||
        objectives.some((objective) => objective.attempts > 0) ||
        Boolean(lessonSignals[auDescriptor.id]?.contentCompleted || lessonSignals[auDescriptor.id]?.exercisesCompleted);

      const moveOnCriteria = auDescriptor.moveOn ?? 'NotApplicable';
      const moveOnSatisfied =
        moveOnCriteria === 'NotApplicable'
          ? true
          : moveOnCriteria === 'Completed'
            ? isComplete
            : moveOnCriteria === 'Passed'
              ? isPassed
              : isComplete && isPassed;

      auEvaluations.set(auDescriptor.id, {
        auId: auDescriptor.id,
        title: auDescriptor.title,
        order: auDescriptor.order,
        status: 'available', // Will be updated in second pass
        started,
        prerequisites: {
          ids: auDescriptor.prerequisites,
          unmetIds: [],
          missingIds: [],
          met: true,
        },
        objectives: {
          total: objectiveTotal,
          mastered: objectiveMasteredCount,
          masteryAverage,
          details: objectives,
        },
        completion: {
          isComplete,
          criteria: completionCriteria,
          fromState: completedByState,
          requiresContent: completionResult.requiresContent,
          requiresExercises: completionResult.requiresExercises,
        },
        pass: {
          isPassed,
          masteryScore: passThreshold ?? null,
          averageMastery: masteryAverage,
        },
        moveOn: {
          criteria: moveOnCriteria,
          isSatisfied: moveOnSatisfied,
        },
      });
    }

    // Second pass: evaluate prerequisites and determine status
    for (const auDescriptor of this.index.aus.values()) {
      const evaluation = auEvaluations.get(auDescriptor.id);
      if (!evaluation) {
        continue;
      }

      const unmetIds: string[] = [];
      const missingIds: string[] = [];

      for (const prereqId of auDescriptor.prerequisites) {
        const prereqEvaluation = auEvaluations.get(prereqId);
        if (!prereqEvaluation) {
          missingIds.push(prereqId);
          if (this.options.missingPrerequisiteBehavior === 'lock') {
            unmetIds.push(prereqId);
          }
          continue;
        }

        const satisfied =
          this.options.prerequisitePolicy === 'moveOn'
            ? prereqEvaluation.moveOn.isSatisfied
            : prereqEvaluation.completion.isComplete;

        if (!satisfied) {
          unmetIds.push(prereqId);
        }
      }

      const prerequisitesMet = unmetIds.length === 0;

      let status: LessonStatus = 'available';
      if (!prerequisitesMet) {
        status = 'locked';
      } else {
        const moveOnCriteria = evaluation.moveOn.criteria;
        if (moveOnCriteria === 'Passed') {
          status = evaluation.pass.isPassed ? 'passed' : evaluation.started ? 'in-progress' : 'available';
        } else if (moveOnCriteria === 'CompletedAndPassed') {
          status =
            evaluation.completion.isComplete && evaluation.pass.isPassed
              ? 'passed'
              : evaluation.started
                ? 'in-progress'
                : 'available';
        } else if (evaluation.completion.isComplete) {
          status = 'completed';
        } else if (evaluation.started) {
          status = 'in-progress';
        }
      }

      evaluation.status = status;
      evaluation.prerequisites = {
        ids: auDescriptor.prerequisites,
        unmetIds,
        missingIds,
        met: prerequisitesMet,
      };
    }

    // Aggregate course status
    const auStatuses = Array.from(auEvaluations.values())
      .sort((a, b) => a.order - b.order)
      .map((au) => au.status);
    const courseStatus = aggregateStatus(auStatuses);

    return {
      aus: auEvaluations,
      course: {
        id: this.index.courseId,
        title: this.index.courseTitle,
        status: courseStatus,
      },
    };
  }
}
