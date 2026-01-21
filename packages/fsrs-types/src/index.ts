/**
 * cmi5-fsrs-types
 *
 * FSRS (Free Spaced Repetition Scheduler) types and utilities.
 * Uses ts-fsrs types as the canonical source for FSRS algorithm types.
 */

import {
  type Card as TsFsrsCard,
  type Grade as TsFsrsGrade,
  State as TsFsrsState,
  createEmptyCard,
} from 'ts-fsrs';

// -----------------------------------------------------------------------------
// Activity Types (for tracking different review activities)
// -----------------------------------------------------------------------------

/**
 * Types of learning activities that can be tracked
 */
export type ActivityType =
  | 'recognition' // See target, recall meaning
  | 'production' // See meaning, recall target
  | 'listening' // Hear audio, identify
  | 'writing' // Practice writing/typing
  | 'speaking' // Practice pronunciation
  | 'reading' // Read and comprehend
  | 'custom'; // Custom activity type

// -----------------------------------------------------------------------------
// FSRS Types (re-exported from ts-fsrs)
// -----------------------------------------------------------------------------

/**
 * Card state in the FSRS algorithm
 * Maps to ts-fsrs State enum: New=0, Learning=1, Review=2, Relearning=3
 */
export type FSRSCardState = 'new' | 'learning' | 'review' | 'relearning';

/**
 * FSRS rating for a review (1-4)
 * Maps to ts-fsrs Grade: Again=1, Hard=2, Good=3, Easy=4
 */
export type FSRSRating = TsFsrsGrade;

/**
 * FSRS algorithm state for spaced repetition
 * This is our interface that wraps ts-fsrs Card properties
 */
export interface FSRSState {
  /** How long (in days) until retention drops to 90% */
  stability: number;

  /** Inherent difficulty (0-10) */
  difficulty: number;

  /** Days since last review */
  elapsedDays: number;

  /** Days until next scheduled review */
  scheduledDays: number;

  /** Total number of reviews */
  reps: number;

  /** Number of times the item was forgotten */
  lapses: number;

  /** Current learning state */
  state: FSRSCardState;
}

// Re-export ts-fsrs types for direct usage
export type { TsFsrsCard, TsFsrsGrade, TsFsrsState };

/** Convert ts-fsrs State enum to our string literal type */
export function tsFsrsStateToFSRSCardState(state: TsFsrsState): FSRSCardState {
  switch (state) {
    case TsFsrsState.New:
      return 'new';
    case TsFsrsState.Learning:
      return 'learning';
    case TsFsrsState.Review:
      return 'review';
    case TsFsrsState.Relearning:
      return 'relearning';
    default:
      return 'new';
  }
}

/** Convert our string literal type to ts-fsrs State enum */
export function fsrsCardStateToTsFsrsState(state: FSRSCardState): TsFsrsState {
  switch (state) {
    case 'new':
      return TsFsrsState.New;
    case 'learning':
      return TsFsrsState.Learning;
    case 'review':
      return TsFsrsState.Review;
    case 'relearning':
      return TsFsrsState.Relearning;
    default:
      return TsFsrsState.New;
  }
}

/** Convert ts-fsrs Card to our FSRSState interface */
export function tsFsrsCardToFSRSState(card: TsFsrsCard): FSRSState {
  return {
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    state: tsFsrsStateToFSRSCardState(card.state),
  };
}

/** Default FSRS state for a new item (uses ts-fsrs createEmptyCard) */
export function createInitialFSRSState(): FSRSState {
  const emptyCard = createEmptyCard();
  return tsFsrsCardToFSRSState(emptyCard);
}

// -----------------------------------------------------------------------------
// Activity Mastery
// -----------------------------------------------------------------------------

/** Performance metrics for a specific activity type */
export interface ActivityMastery {
  /** Total attempts */
  attempts: number;

  /** Correct attempts */
  correct: number;

  /** Last attempt timestamp */
  lastAttempt: Date;

  /** Average response time in milliseconds */
  avgResponseTime: number;
}

/** Map of activity type to mastery metrics */
export type ActivityMasteryMap = Partial<Record<ActivityType, ActivityMastery>>;

// -----------------------------------------------------------------------------
// Review Log
// -----------------------------------------------------------------------------

/** A single review event */
export interface ReviewLogEntry {
  /** When the review occurred */
  timestamp: Date;

  /** Which activity type was used */
  activity: ActivityType;

  /** FSRS rating given */
  rating: FSRSRating;

  /** Response time in milliseconds */
  responseTime: number;

  /** Whether the answer was correct */
  wasCorrect: boolean;
}

// -----------------------------------------------------------------------------
// Learner State (Kubyte equivalent)
// -----------------------------------------------------------------------------

/**
 * A learner's mastery state for a learning item.
 * Generic over item ID type for flexibility.
 */
export interface LearnerState<TItemId extends string = string> {
  /** Which item this tracks */
  itemId: TItemId;

  /** Which learner (or "local" for anonymous) */
  userId: string;

  /** Overall mastery level (0.0 to 1.0) */
  mastery: number;

  /** FSRS algorithm state */
  state: FSRSState;

  /** Activity-specific performance */
  activityMastery: ActivityMasteryMap;

  /** When the learner first encountered this item */
  firstSeen: Date;

  /** Last review timestamp */
  lastReviewed: Date;

  /** Next scheduled review */
  nextReview: Date;

  /** Review history (optional, for analytics) */
  reviewLog?: ReviewLogEntry[];
}

// -----------------------------------------------------------------------------
// Review Input
// -----------------------------------------------------------------------------

/** Input for recording a review */
export interface ReviewInput<TItemId extends string = string> {
  /** Which item was reviewed */
  itemId: TItemId;

  /** Which activity type was used */
  activity: ActivityType;

  /** FSRS rating */
  rating: FSRSRating;

  /** Response time in milliseconds */
  responseTime: number;

  /** Whether the answer was correct */
  wasCorrect: boolean;
}

// -----------------------------------------------------------------------------
// Utilities
// -----------------------------------------------------------------------------

/** Create a new learner state for an item */
export function createLearnerState<TItemId extends string = string>(
  itemId: TItemId,
  userId: string = 'local'
): LearnerState<TItemId> {
  const now = new Date();
  return {
    itemId,
    userId,
    mastery: 0,
    state: createInitialFSRSState(),
    activityMastery: {},
    firstSeen: now,
    lastReviewed: now,
    nextReview: now,
  };
}

/** Calculate overall mastery from learner state */
export function calculateMastery<TItemId extends string = string>(
  learnerState: LearnerState<TItemId>
): number {
  // Base: FSRS retention probability (simplified)
  const daysSinceReview = Math.max(
    0,
    (Date.now() - learnerState.lastReviewed.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Retention decays based on stability
  const retention =
    learnerState.state.stability > 0
      ? Math.exp((-daysSinceReview / learnerState.state.stability) * Math.log(10 / 9))
      : 0;

  // Bonus: Activity coverage (up to 10% bonus for using multiple activities)
  const activitiesUsed = Object.keys(learnerState.activityMastery).length;
  const activityBonus = Math.min(activitiesUsed * 0.02, 0.1);

  // Penalty: Overdue review (small decay if past scheduled date)
  const overdueRatio =
    learnerState.state.scheduledDays > 0 ? daysSinceReview / learnerState.state.scheduledDays : 0;
  const recencyPenalty = overdueRatio > 1 ? Math.min((overdueRatio - 1) * 0.1, 0.2) : 0;

  return Math.max(0, Math.min(1, retention + activityBonus - recencyPenalty));
}

/** Get accuracy rate for a specific activity */
export function getActivityAccuracy<TItemId extends string = string>(
  learnerState: LearnerState<TItemId>,
  activity: ActivityType
): number | null {
  const mastery = learnerState.activityMastery[activity];
  if (!mastery || mastery.attempts === 0) return null;
  return mastery.correct / mastery.attempts;
}

/** Check if a learner state is due for review */
export function isDueForReview<TItemId extends string = string>(
  learnerState: LearnerState<TItemId>,
  asOf: Date = new Date()
): boolean {
  return learnerState.nextReview <= asOf;
}
