/**
 * LRS Database Schema
 *
 * Stores xAPI statements and CMI5 state
 * Uses SQLite for browser-based storage
 */

import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
import type { Statement, Agent } from '../types/xapi';
import type { CMI5State } from '../types/cmi5';

/**
 * xAPI Statements table
 */
export const statementsTable = sqliteTable('xapi_statements', {
  /** Statement ID (UUID) */
  id: text('id').primaryKey(),
  /** Statement JSON */
  statement: text('statement', { mode: 'json' }).$type<Statement>().notNull(),
  /** Actor JSON (for indexing) */
  actor: text('actor', { mode: 'json' }).$type<Agent>().notNull(),
  /** Verb ID (for indexing) */
  verbId: text('verb_id').notNull(),
  /** Object ID (for indexing) */
  objectId: text('object_id').notNull(),
  /** Registration ID (for CMI5) */
  registration: text('registration'),
  /** Timestamp from statement (ISO 8601) */
  timestamp: text('timestamp'),
  /** Stored timestamp (when LRS received it, ISO 8601) */
  stored: text('stored').notNull(),
  /** Authority JSON (who sent the statement) */
  authority: text('authority', { mode: 'json' }).$type<Agent>(),
  /** Whether statement is voided */
  voided: integer('voided', { mode: 'boolean' }).default(false).notNull(),
}, (table) => ({
  /** Index on verb for queries */
  verbIdx: index('statements_verb_idx').on(table.verbId),
  /** Index on object for queries */
  objectIdx: index('statements_object_idx').on(table.objectId),
  /** Index on registration for CMI5 */
  registrationIdx: index('statements_registration_idx').on(table.registration),
  /** Index on timestamp for time-based queries */
  timestampIdx: index('statements_timestamp_idx').on(table.timestamp),
  /** Index on stored for time-based queries */
  storedIdx: index('statements_stored_idx').on(table.stored),
}));

/**
 * CMI5 State table
 * Stores learner state per registration
 */
export const cmi5StateTable = sqliteTable('cmi5_state', {
  /** State ID (UUID) */
  id: text('id').primaryKey(),
  /** Registration ID */
  registration: text('registration').notNull(),
  /** Activity ID (AU ID) */
  activityId: text('activity_id').notNull(),
  /** Agent JSON (learner) */
  agent: text('agent', { mode: 'json' }).$type<Agent>().notNull(),
  /** State ID (for xAPI State API) */
  stateId: text('state_id').notNull(),
  /** State data JSON (CMI5State) */
  state: text('state', { mode: 'json' }).$type<CMI5State>().notNull(),
  /** Last updated (ISO 8601) */
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  /** Unique constraint on registration + activity + agent + stateId */
  uniqueStateIdx: index('cmi5_state_unique_idx').on(
    table.registration,
    table.activityId,
    table.stateId
  ),
  /** Index on registration for queries */
  registrationIdx: index('cmi5_state_registration_idx').on(table.registration),
  /** Index on activity for queries */
  activityIdx: index('cmi5_state_activity_idx').on(table.activityId),
}));

/**
 * Relations
 */
export const statementsRelations = relations(statementsTable, () => ({}));
export const cmi5StateRelations = relations(cmi5StateTable, () => ({}));
