/**
 * FSRS (Free Spaced Repetition Scheduler) Extension Types
 *
 * These types define how FSRS state is stored in CMI5 extensions.
 * Uses ts-fsrs as the canonical source for FSRS algorithm types.
 */

import {
  type Card as TsFsrsCard,
  type Grade as TsFsrsGrade,
  State as TsFsrsState,
} from "ts-fsrs";

// -----------------------------------------------------------------------------
// FSRS Types (derived from ts-fsrs)
// -----------------------------------------------------------------------------

/**
 * Card state in the FSRS algorithm
 * Maps to ts-fsrs State enum: New=0, Learning=1, Review=2, Relearning=3
 */
export type FSRSCardState = "new" | "learning" | "review" | "relearning";

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
      return "new";
    case TsFsrsState.Learning:
      return "learning";
    case TsFsrsState.Review:
      return "review";
    case TsFsrsState.Relearning:
      return "relearning";
    default:
      return "new";
  }
}

/** Convert our string literal type to ts-fsrs State enum */
export function fsrsCardStateToTsFsrsState(state: FSRSCardState): TsFsrsState {
  switch (state) {
    case "new":
      return TsFsrsState.New;
    case "learning":
      return TsFsrsState.Learning;
    case "review":
      return TsFsrsState.Review;
    case "relearning":
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

// -----------------------------------------------------------------------------
// LRS-specific FSRS Extension Types
// -----------------------------------------------------------------------------

/**
 * FSRS Extension stored in CMI5 state extensions
 * Extension IRI: http://polyglot.tools/extensions/fsrs
 */
export interface FSRSExtension {
  /** FSRS algorithm state */
  fsrs: FSRSState;
  /** Overall mastery level (0.0 to 1.0) */
  mastery: number;
  /** Last review timestamp (ISO 8601) */
  lastReview: string;
  /** Next scheduled review timestamp (ISO 8601) */
  nextReview: string;
  /** Total number of reviews */
  reviewCount: number;
  /** First review timestamp (ISO 8601) */
  firstReview?: string;
}

/**
 * Review milestone criteria for generating xAPI statements
 */
export interface ReviewMilestone {
  /** Type of milestone */
  type: 'first-review' | 'mastery-threshold' | 'state-transition' | 'periodic';
  /** Kubit ID */
  kubitId: string;
  /** Review timestamp */
  timestamp: string;
  /** Mastery level at milestone */
  mastery: number;
  /** FSRS state at milestone */
  fsrsState: FSRSState;
  /** Review details */
  review: {
    rating: FSRSRating;
    activity: string;
    responseTime?: number;
    wasCorrect: boolean;
  };
}

/**
 * FSRS extension IRI constant
 */
export const FSRS_EXTENSION_IRI = 'http://polyglot.tools/extensions/fsrs';

/**
 * Review verb IRI constant
 */
export const REVIEW_VERB_IRI = 'http://polyglot.tools/verbs/reviewed';
