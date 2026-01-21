/**
 * CMI5 Constants
 *
 * Default values and constants for CMI5 integration
 */

/**
 * Default mastery score (0-1)
 * Used when no mastery score is specified
 */
export const DEFAULT_MASTERY_SCORE = 0.8;

/**
 * Default objective base URL
 * Used for generating objective IDs
 */
export const DEFAULT_OBJECTIVE_BASE_URL = 'https://polyglot.tools';

/**
 * Default state ID for CMI5 runtime state
 */
export const DEFAULT_STATE_ID = 'cmi5.runtime';

/**
 * CMI5 verb IDs (xAPI verbs)
 */
export const CMI5_VERBS = {
  LAUNCHED: 'http://adlnet.gov/expapi/verbs/launched',
  COMPLETED: 'http://adlnet.gov/expapi/verbs/completed',
  EXPERIENCED: 'http://adlnet.gov/expapi/verbs/experienced',
  MASTERED: 'http://adlnet.gov/expapi/verbs/mastered',
  REVIEWED: 'http://polyglot.tools/verbs/reviewed',
} as const;

/**
 * CMI5 activity types (xAPI activity types)
 */
export const CMI5_ACTIVITY_TYPES = {
  COURSE: 'http://adlnet.gov/expapi/activities/course',
  OBJECTIVE: 'http://adlnet.gov/expapi/activities/objective',
} as const;

/**
 * CMI5 move-on criteria values
 */
export const CMI5_MOVE_ON_CRITERIA = {
  PASSED: 'Passed',
  COMPLETED: 'Completed',
  COMPLETED_AND_PASSED: 'CompletedAndPassed',
  NOT_APPLICABLE: 'NotApplicable',
} as const;

/**
 * CMI5 launch modes
 */
export const CMI5_LAUNCH_MODES = {
  NORMAL: 'Normal',
  BROWSE: 'Browse',
  REVIEW: 'Review',
} as const;
