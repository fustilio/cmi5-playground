/**
 * FSRS Service
 *
 * Manages FSRS (Free Spaced Repetition Scheduler) state via LRS.
 * Replaces kubyte-store functionality with LRS as the single source of truth.
 */

import type { LRSStore } from 'cmi5-lrs';
import type { Statement, Actor } from '@xapi/xapi';
import type {
  FSRSState,
  FSRSRating,
  ReviewInput,
  ActivityType,
  LearnerState,
} from 'cmi5-fsrs-types';
import { createInitialFSRSState, calculateMastery } from 'cmi5-fsrs-types';
import type { CMI5LaunchParameters } from 'cmi5-core';
import { CMI5_ACTIVITY_TYPES } from 'cmi5-core';
import type { FSRSExtension } from 'cmi5-lrs';
import { FSRS_EXTENSION_IRI, REVIEW_VERB_IRI } from 'cmi5-lrs';

// -----------------------------------------------------------------------------
// Inline Review Statement Generation
// -----------------------------------------------------------------------------

interface ReviewDetails {
  rating: number;
  activity: string;
  responseTime?: number;
  wasCorrect: boolean;
  mastery: number;
  fsrsState: FSRSState;
  milestoneType: 'first-review' | 'mastery-threshold' | 'state-transition' | 'periodic';
  previousMastery?: number;
  previousState?: FSRSState['state'];
}

function parseActorFromCMI5(actorJson: string): Actor {
  try {
    const actor = JSON.parse(actorJson);
    return {
      ...actor,
      objectType: actor.objectType || 'Agent',
    } as Actor;
  } catch {
    throw new Error('Invalid actor JSON in CMI5 launch parameters');
  }
}

function generateReviewStatement(
  itemId: string,
  objectiveId: string,
  launchParams: CMI5LaunchParameters,
  reviewDetails: ReviewDetails,
  auId?: string,
  auTitle?: string
): Statement {
  const actor = parseActorFromCMI5(launchParams.actor);

  const statement: Statement = {
    actor,
    verb: {
      id: REVIEW_VERB_IRI,
      display: { 'en-US': 'reviewed' },
    },
    object: {
      id: objectiveId,
      objectType: 'Activity',
      definition: {
        name: { 'en-US': `Item: ${itemId}` },
        type: CMI5_ACTIVITY_TYPES.OBJECTIVE,
        extensions: {
          'http://cmi5.tools/extensions/itemId': itemId,
        },
      },
    },
    result: {
      score: {
        scaled: reviewDetails.mastery,
        raw: reviewDetails.rating,
        min: 1,
        max: 4,
      },
      success: reviewDetails.wasCorrect,
      extensions: {
        [FSRS_EXTENSION_IRI]: {
          rating: reviewDetails.rating,
          activity: reviewDetails.activity,
          responseTime: reviewDetails.responseTime,
          milestoneType: reviewDetails.milestoneType,
          fsrsState: reviewDetails.fsrsState,
          previousMastery: reviewDetails.previousMastery,
          previousState: reviewDetails.previousState,
        },
      },
    },
    context: {
      registration: launchParams.registration,
      contextActivities: auId && auTitle
        ? {
            parent: [
              {
                id: auId,
                objectType: 'Activity',
                definition: {
                  name: { 'en-US': auTitle },
                  type: CMI5_ACTIVITY_TYPES.COURSE,
                },
              },
            ],
          }
        : undefined,
    },
    timestamp: new Date().toISOString(),
  };

  return statement;
}

// -----------------------------------------------------------------------------

export interface FSRSServiceOptions {
  /** LRS store instance */
  lrs: LRSStore;
  /** CMI5 launch parameters */
  launchParams: CMI5LaunchParameters;
  /** User ID */
  userId: string;
  /** Registration ID (defaults to launchParams.registration) */
  registration?: string;
  /** Mastery threshold for milestone tracking (default: 0.8) */
  masteryThreshold?: number;
  /** Periodic review milestone interval (default: 10) */
  periodicMilestoneInterval?: number;
}

export interface DueQueryOptions {
  /** Only return items due before this date (default: now) */
  before?: Date;
  /** Maximum number of results */
  limit?: number;
  /** Filter by lesson ID */
  lessonId?: string;
  /** Filter by activity type */
  activity?: ActivityType;
}

/**
 * FSRS Service
 * Manages FSRS state and review tracking via LRS
 */
export class FSRSService {
  private lrs: LRSStore;
  private launchParams: CMI5LaunchParameters;
  private userId: string;
  private registration: string;
  private masteryThreshold: number;
  private periodicMilestoneInterval: number;
  private agent: Statement['actor'];

  constructor(options: FSRSServiceOptions) {
    this.lrs = options.lrs;
    this.launchParams = options.launchParams;
    this.userId = options.userId;
    this.registration = options.registration || options.launchParams.registration || 'local-registration';
    this.masteryThreshold = options.masteryThreshold ?? 0.8;
    this.periodicMilestoneInterval = options.periodicMilestoneInterval ?? 10;

    // Parse actor from launch params
    try {
      this.agent = JSON.parse(options.launchParams.actor) as Statement['actor'];
    } catch {
      this.agent = {
        objectType: 'Agent',
        name: 'Local User',
        mbox: 'mailto:local@cmi5.tools',
      } as Statement['actor'];
    }
  }

  /**
   * Record a review and update FSRS state
   * Returns updated learner state
   */
  async recordReview(review: ReviewInput, auId?: string, auTitle?: string): Promise<LearnerState | null> {
    // Get existing FSRS state
    const existing = await this.getFSRSState(review.itemId);

    // Create initial state if needed
    let fsrsState: FSRSState;
    let previousMastery = 0;
    let previousState: FSRSState['state'] = 'new';
    let reviewCount = 0;
    let firstReview: string | undefined;

    if (existing) {
      fsrsState = existing.fsrs;
      previousMastery = existing.mastery;
      previousState = existing.fsrs.state;
      reviewCount = existing.reviewCount;
    } else {
      fsrsState = createInitialFSRSState();
      firstReview = new Date().toISOString();
    }

    // Apply FSRS algorithm
    const updatedFsrsState = this.applyFSRS(fsrsState, review);

    // Calculate new mastery
    const now = new Date();
    const lastReview = now.toISOString();
    const nextReview = new Date(
      now.getTime() + updatedFsrsState.scheduledDays * 24 * 60 * 60 * 1000
    ).toISOString();

    // Create temporary learner state for mastery calculation
    const tempState: LearnerState = {
      itemId: review.itemId,
      userId: this.userId,
      mastery: 0, // Will be calculated
      state: updatedFsrsState,
      activityMastery: {},
      firstSeen: existing?.firstReview ? new Date(existing.firstReview) : now,
      lastReviewed: now,
      nextReview: new Date(nextReview),
    };

    const newMastery = calculateMastery(tempState);
    const newReviewCount = reviewCount + 1;

    // Determine if this is a milestone
    const milestoneType = this.detectMilestone(
      reviewCount === 0,
      previousMastery,
      newMastery,
      previousState,
      updatedFsrsState.state,
      newReviewCount
    );

    // Save FSRS state to LRS
    await this.lrs.saveFSRSState(
      this.registration,
      review.itemId,
      this.agent,
      updatedFsrsState,
      newMastery,
      lastReview,
      nextReview,
      newReviewCount,
      firstReview || existing?.firstReview
    );

    // Generate and store milestone statement if needed
    if (milestoneType) {
      // Get objective ID for this item
      const objectiveId = this.getObjectiveIdForItem(review.itemId);

      const statement = generateReviewStatement(
        review.itemId,
        objectiveId,
        this.launchParams,
        {
          rating: review.rating,
          activity: review.activity,
          responseTime: review.responseTime,
          wasCorrect: review.wasCorrect,
          mastery: newMastery,
          fsrsState: updatedFsrsState,
          milestoneType,
          previousMastery: reviewCount === 0 ? undefined : previousMastery,
          previousState: reviewCount === 0 ? undefined : previousState,
        },
        auId,
        auTitle
      );

      await this.lrs.storeStatement(statement);
    }

    // Return updated learner state
    return {
      itemId: review.itemId,
      userId: this.userId,
      mastery: newMastery,
      state: updatedFsrsState,
      activityMastery: {}, // Activity mastery would need separate tracking
      firstSeen: existing?.firstReview ? new Date(existing.firstReview) : now,
      lastReviewed: now,
      nextReview: new Date(nextReview),
    };
  }

  /**
   * Get learner state for an item
   */
  async getLearnerState(itemId: string): Promise<LearnerState | null> {
    const fsrsExtension = await this.lrs.getFSRSState(
      this.registration,
      itemId,
      this.agent
    );

    if (!fsrsExtension) return null;

    return {
      itemId,
      userId: this.userId,
      mastery: fsrsExtension.mastery,
      state: fsrsExtension.fsrs,
      activityMastery: {}, // Activity mastery would need separate tracking
      firstSeen: fsrsExtension.firstReview
        ? new Date(fsrsExtension.firstReview)
        : new Date(),
      lastReviewed: new Date(fsrsExtension.lastReview),
      nextReview: new Date(fsrsExtension.nextReview),
    };
  }

  /**
   * Get learner states due for review
   */
  async getDueLearnerStates(options: DueQueryOptions = {}): Promise<LearnerState[]> {
    const before = options.before || new Date();
    const allStates = await this.lrs.getAllFSRSStates(this.registration, this.agent);

    const dueStates: LearnerState[] = [];

    for (const [itemId, fsrsExtension] of allStates.entries()) {
      const nextReview = new Date(fsrsExtension.nextReview);

      if (nextReview <= before) {
        const learnerState = await this.getLearnerState(itemId);
        if (learnerState) {
          // Apply filters
          if (options.lessonId && !itemId.includes(options.lessonId)) continue;
          // Activity filter would need additional data

          dueStates.push(learnerState);
        }
      }
    }

    // Sort by due date (earliest first)
    dueStates.sort((a, b) => a.nextReview.getTime() - b.nextReview.getTime());

    // Apply limit
    if (options.limit) {
      return dueStates.slice(0, options.limit);
    }

    return dueStates;
  }

  /**
   * Get review history for an item
   * Queries xAPI statements for review milestones
   */
  async getReviewHistory(itemId: string, limit: number = 50): Promise<Array<{
    timestamp: Date;
    rating: FSRSRating;
    activity: string;
    mastery: number;
    milestoneType: string;
  }>> {
    const objectiveId = this.getObjectiveIdForItem(itemId);

    const results = await this.lrs.queryStatements({
      verb: REVIEW_VERB_IRI,
      activity: objectiveId,
      registration: this.registration,
      limit,
    });

    return results.statements.map((stmt) => {
      const extensions = stmt.result?.extensions?.[FSRS_EXTENSION_IRI] as any;
      return {
        timestamp: new Date(stmt.timestamp || stmt.stored || Date.now()),
        rating: extensions?.rating || 3,
        activity: extensions?.activity || 'unknown',
        mastery: stmt.result?.score?.scaled || 0,
        milestoneType: extensions?.milestoneType || 'unknown',
      };
    });
  }

  /**
   * Check if an item has been reviewed
   */
  async hasLearnerState(itemId: string): Promise<boolean> {
    const state = await this.lrs.getFSRSState(
      this.registration,
      itemId,
      this.agent
    );
    return state !== null;
  }

  /**
   * Get FSRS extension state
   */
  private async getFSRSState(itemId: string): Promise<FSRSExtension | null> {
    return await this.lrs.getFSRSState(this.registration, itemId, this.agent);
  }

  /**
   * Apply FSRS algorithm to update state
   */
  private applyFSRS(fsrsState: FSRSState, review: ReviewInput): FSRSState {
    const rating = typeof review.rating === 'string'
      ? (review.rating === 'again' ? 1 : review.rating === 'hard' ? 2 : review.rating === 'good' ? 3 : 4)
      : review.rating;

    const newFsrs = { ...fsrsState };

    // Calculate elapsed days
    const now = Date.now();
    const lastReviewTime = fsrsState.reps > 0
      ? now - (fsrsState.scheduledDays * 24 * 60 * 60 * 1000)
      : now;
    newFsrs.elapsedDays = Math.floor((now - lastReviewTime) / (24 * 60 * 60 * 1000));

    if (rating === 1) {
      // Again - item was forgotten
      newFsrs.lapses += 1;
      newFsrs.difficulty = Math.min(10, newFsrs.difficulty + 0.5);
      newFsrs.stability = Math.max(0.1, newFsrs.stability * 0.5);
      newFsrs.state = 'relearning';
    } else {
      // Hard, Good, or Easy
      newFsrs.reps += 1;
      const stabilityMultiplier = 1 + (rating - 2) * 0.5;
      newFsrs.stability = Math.max(0.1, newFsrs.stability * stabilityMultiplier);
      newFsrs.difficulty = Math.max(1, Math.min(10, newFsrs.difficulty - 0.1 * (rating - 2)));

      // Update state based on stability
      if (newFsrs.stability < 1) {
        newFsrs.state = 'learning';
      } else if (newFsrs.state === 'new' || newFsrs.state === 'learning') {
        newFsrs.state = 'review';
      }
    }

    // Calculate next scheduled review interval
    newFsrs.scheduledDays = Math.max(1, Math.round(newFsrs.stability));

    return newFsrs;
  }

  /**
   * Detect if this review is a milestone
   */
  private detectMilestone(
    isFirstReview: boolean,
    previousMastery: number,
    newMastery: number,
    previousState: FSRSState['state'],
    newState: FSRSState['state'],
    reviewCount: number
  ): 'first-review' | 'mastery-threshold' | 'state-transition' | 'periodic' | null {
    if (isFirstReview) {
      return 'first-review';
    }

    // Mastery threshold crossing
    if (
      (previousMastery < this.masteryThreshold && newMastery >= this.masteryThreshold) ||
      (previousMastery < 1.0 && newMastery >= 1.0)
    ) {
      return 'mastery-threshold';
    }

    // State transition
    if (previousState !== newState &&
        (newState === 'review' || newState === 'learning')) {
      return 'state-transition';
    }

    // Periodic milestone
    if (reviewCount % this.periodicMilestoneInterval === 0) {
      return 'periodic';
    }

    return null;
  }

  /**
   * Get objective ID for an item
   */
  private getObjectiveIdForItem(itemId: string): string {
    // Use same format as CMI5 objective generation
    return `https://cmi5.tools/objectives/${itemId.replace(/:/g, '-')}`;
  }
}
