/**
 * xAPI (Experience API) Type Definitions
 *
 * Based on xAPI 1.0.3 specification
 * https://github.com/adlnet/xAPI-Spec
 */

/**
 * xAPI Statement
 */
export interface Statement {
  /** Statement ID (UUID) */
  id?: string;
  /** Actor (learner) */
  actor: Agent | Group;
  /** Verb (action) */
  verb: Verb;
  /** Object (activity, agent, etc.) */
  object: Activity | Agent | Group | StatementRef | SubStatement;
  /** Result (score, success, completion) */
  result?: Result;
  /** Context (registration, parent activities) */
  context?: Context;
  /** Timestamp */
  timestamp?: string;
  /** Stored timestamp (when LRS received it) */
  stored?: string;
  /** Authority (who sent the statement) */
  authority?: Agent | Group;
  /** Version */
  version?: string;
  /** Attachments */
  attachments?: Attachment[];
}

/**
 * Agent (learner or instructor)
 */
export interface Agent {
  objectType?: 'Agent';
  /** Name */
  name?: string | string[];
  /** Email (mbox) */
  mbox?: string;
  /** Email SHA1 */
  mbox_sha1sum?: string;
  /** OpenID */
  openid?: string;
  /** Account */
  account?: {
    homePage: string;
    name: string;
  };
}

/**
 * Group (team or organization)
 */
export interface Group {
  objectType: 'Group';
  /** Name */
  name?: string | string[];
  /** Email (mbox) */
  mbox?: string;
  /** Email SHA1 */
  mbox_sha1sum?: string;
  /** OpenID */
  openid?: string;
  /** Account */
  account?: {
    homePage: string;
    name: string;
  };
  /** Group members */
  member?: Agent[];
}

/**
 * Verb (action performed)
 */
export interface Verb {
  /** Verb ID (IRI) */
  id: string;
  /** Display name */
  display: LanguageMap;
}

/**
 * Language Map (localized strings)
 */
export interface LanguageMap {
  [language: string]: string;
}

/**
 * Activity (learning content)
 */
export interface Activity {
  objectType?: 'Activity';
  /** Activity ID (IRI) */
  id: string;
  /** Activity definition */
  definition?: ActivityDefinition;
}

/**
 * Activity Definition
 */
export interface ActivityDefinition {
  /** Name */
  name?: LanguageMap;
  /** Description */
  description?: LanguageMap;
  /** Type (IRI) */
  type?: string;
  /** More info URL */
  moreInfo?: string;
  /** Extensions */
  extensions?: Record<string, unknown>;
  /** Interaction type (for interactions) */
  interactionType?: string;
  /** Correct responses pattern */
  correctResponsesPattern?: string[];
  /** Choices (for choice interactions) */
  choices?: InteractionComponent[];
  /** Scale (for scale interactions) */
  scale?: InteractionComponent[];
  /** Source (for matching interactions) */
  source?: InteractionComponent[];
  /** Target (for matching interactions) */
  target?: InteractionComponent[];
  /** Steps (for performance interactions) */
  steps?: InteractionComponent[];
}

/**
 * Interaction Component
 */
export interface InteractionComponent {
  id: string;
  description?: LanguageMap;
}

/**
 * Statement Reference
 */
export interface StatementRef {
  objectType: 'StatementRef';
  id: string;
}

/**
 * Sub-Statement
 */
export interface SubStatement {
  objectType: 'SubStatement';
  actor: Agent | Group;
  verb: Verb;
  object: Activity | Agent | Group | StatementRef;
  result?: Result;
  context?: Context;
  timestamp?: string;
}

/**
 * Result (outcome)
 */
export interface Result {
  /** Score */
  score?: Score;
  /** Success (boolean) */
  success?: boolean;
  /** Completion (boolean) */
  completion?: boolean;
  /** Response */
  response?: string;
  /** Duration (ISO 8601) */
  duration?: string;
  /** Extensions */
  extensions?: Record<string, unknown>;
}

/**
 * Score
 */
export interface Score {
  /** Scaled score (0-1) */
  scaled?: number;
  /** Raw score */
  raw?: number;
  /** Minimum score */
  min?: number;
  /** Maximum score */
  max?: number;
}

/**
 * Context
 */
export interface Context {
  /** Registration ID (UUID) */
  registration?: string;
  /** Instructor */
  instructor?: Agent | Group;
  /** Team */
  team?: Group;
  /** Context activities */
  contextActivities?: ContextActivities;
  /** Revision */
  revision?: string;
  /** Platform */
  platform?: string;
  /** Language */
  language?: string;
  /** Statement */
  statement?: StatementRef;
  /** Extensions */
  extensions?: Record<string, unknown>;
}

/**
 * Context Activities
 */
export interface ContextActivities {
  /** Parent activities */
  parent?: Activity[];
  /** Grouping activities */
  grouping?: Activity[];
  /** Category activities */
  category?: Activity[];
  /** Other activities */
  other?: Activity[];
}

/**
 * Attachment
 */
export interface Attachment {
  usageType: string;
  display: LanguageMap;
  description?: LanguageMap;
  contentType: string;
  length: number;
  sha2: string;
  fileUrl?: string;
}

/**
 * Statement Query Parameters
 */
export interface StatementQueryParams {
  /** Statement ID */
  statementId?: string;
  /** Voided statement ID */
  voidedStatementId?: string;
  /** Agent (JSON) */
  agent?: string;
  /** Verb ID */
  verb?: string;
  /** Activity ID */
  activity?: string;
  /** Registration ID */
  registration?: string;
  /** Related activities */
  related_activities?: boolean;
  /** Related agents */
  related_agents?: boolean;
  /** Since (ISO 8601) */
  since?: string;
  /** Until (ISO 8601) */
  until?: string;
  /** Limit */
  limit?: number;
  /** Format */
  format?: 'ids' | 'exact' | 'canonical';
  /** Attachments */
  attachments?: boolean;
  /** Ascending */
  ascending?: boolean;
}

/**
 * Statement Result
 */
export interface StatementResult {
  /** Statements */
  statements: Statement[];
  /** More URL (for pagination) */
  more?: string;
}
