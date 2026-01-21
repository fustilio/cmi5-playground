/**
 * LRS Store
 *
 * Browser-based SQLite store for xAPI statements and CMI5 state
 * Uses @libsql/client-wasm for browser-native SQLite with Drizzle ORM
 */

// IMPORTANT: Import log suppression FIRST, before @libsql/client-wasm
// This intercepts WASM initialization warnings before they fire
import './suppress-wasm-logs';

import { drizzle } from 'drizzle-orm/sqlite-proxy';
import { createClient, type Client as LibSQLClient } from '@libsql/client-wasm';
import { eq, and, desc, sql } from 'drizzle-orm';
import { statementsTable, cmi5StateTable } from '../db/schema';
import type { Statement, Activity, StatementRef, SubStatement, Agent } from '@xapi/xapi';
import type { StatementQueryParams } from '../types/xapi';
import type { CMI5State } from '../types/cmi5';

// Use @xapi/xapi Statement type directly for compatibility
interface StatementResult {
  statements: Statement[];
  more?: string;
}

/**
 * Generate a UUID (browser-compatible)
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Configuration options for LRS Store
 */
export interface LRSStoreOptions {
  /** Database name (for OPFS file storage) */
  dbName?: string;
  /** Use in-memory database (default: false, uses OPFS) */
  inMemory?: boolean;
}

/**
 * Browser-based LRS Store using SQLite
 */
export class LRSStore {
  private libsqlClient: LibSQLClient | null = null;
  private db: ReturnType<typeof drizzle> | null = null;
  private initialized = false;

  constructor(private options: LRSStoreOptions = {}) {}

  /**
   * Initialize the LibSQL database
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    const { dbName = 'lrs.db', inMemory = false } = this.options;

    // Create LibSQL client
    // For browser: use OPFS file URL for persistence, or :memory: for in-memory
    // Note: @libsql/client-wasm doesn't support URL query params like ?mode=rwc
    const url = inMemory ? ':memory:' : `file:${dbName}`;

    this.libsqlClient = createClient({
      url,
    });

    // Create Drizzle instance with LibSQL's query interface
    this.db = drizzle(
      async (sqlQuery, params, method) => {
        if (!this.libsqlClient) throw new Error('LibSQL not initialized');

        const result = await this.libsqlClient.execute({
          sql: sqlQuery,
          args: params as any[],
        });

        // Convert libsql result to expected format
        // Handle potential "undefined" strings in JSON columns before Drizzle parses them
        const rows = result.rows.map((row) => {
          const obj: Record<string, unknown> = {};
          result.columns.forEach((col, i) => {
            let value = row[i];
            // Fix "undefined" strings that might be in JSON columns
            // This can happen if undefined values were incorrectly stored as strings
            // JSON columns: statement, actor, authority
            if (typeof value === 'string' && (col === 'statement' || col === 'actor' || col === 'authority')) {
              if (value === 'undefined' || value === 'null' || value.trim() === '') {
                value = null;
              } else {
                // Try to parse as JSON to catch malformed JSON early
                try {
                  JSON.parse(value);
                } catch (e) {
                  // If it's not valid JSON and it's "undefined", set to null
                  if (value === 'undefined') {
                    value = null;
                  }
                  // Otherwise let Drizzle handle the error (it will be more descriptive)
                }
              }
            }
            obj[col] = value;
          });
          return obj;
        });

        return { rows };
      },
      { schema: { statementsTable, cmi5StateTable } }
    );

    // Create tables if they don't exist
    await this.createSchema();

    this.initialized = true;
  }

  /**
   * Create database schema
   */
  private async createSchema(): Promise<void> {
    if (!this.libsqlClient) return;

    // Create statements table
    await this.libsqlClient.execute(`
      CREATE TABLE IF NOT EXISTS xapi_statements (
        id TEXT PRIMARY KEY,
        statement TEXT NOT NULL,
        actor TEXT NOT NULL,
        verb_id TEXT NOT NULL,
        object_id TEXT NOT NULL,
        registration TEXT,
        timestamp TEXT,
        stored TEXT NOT NULL,
        authority TEXT,
        voided INTEGER NOT NULL DEFAULT 0
      )
    `);

    // Create indexes for statements
    await this.libsqlClient.execute(`
      CREATE INDEX IF NOT EXISTS statements_verb_idx ON xapi_statements(verb_id)
    `);
    await this.libsqlClient.execute(`
      CREATE INDEX IF NOT EXISTS statements_object_idx ON xapi_statements(object_id)
    `);
    await this.libsqlClient.execute(`
      CREATE INDEX IF NOT EXISTS statements_registration_idx ON xapi_statements(registration)
    `);
    await this.libsqlClient.execute(`
      CREATE INDEX IF NOT EXISTS statements_timestamp_idx ON xapi_statements(timestamp)
    `);
    await this.libsqlClient.execute(`
      CREATE INDEX IF NOT EXISTS statements_stored_idx ON xapi_statements(stored)
    `);

    // Create CMI5 state table
    await this.libsqlClient.execute(`
      CREATE TABLE IF NOT EXISTS cmi5_state (
        id TEXT PRIMARY KEY,
        registration TEXT NOT NULL,
        activity_id TEXT NOT NULL,
        agent TEXT NOT NULL,
        state_id TEXT NOT NULL,
        state TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // Create indexes for CMI5 state
    await this.libsqlClient.execute(`
      CREATE INDEX IF NOT EXISTS cmi5_state_unique_idx ON cmi5_state(registration, activity_id, state_id)
    `);
    await this.libsqlClient.execute(`
      CREATE INDEX IF NOT EXISTS cmi5_state_registration_idx ON cmi5_state(registration)
    `);
    await this.libsqlClient.execute(`
      CREATE INDEX IF NOT EXISTS cmi5_state_activity_idx ON cmi5_state(activity_id)
    `);
  }

  /**
   * Store an xAPI statement
   */
  async storeStatement(statement: Statement): Promise<string> {
    if (!this.db) throw new Error('LRS not initialized');

    const statementId = statement.id || generateUUID();
    const stored = new Date().toISOString();

    // Extract fields for indexing
    const verbId = statement.verb.id;
    let objectId = '';
    if (typeof statement.object === 'string') {
      objectId = statement.object;
    } else if ('objectType' in statement.object) {
      // Handle different object types
      const obj = statement.object;
      if (obj.objectType === 'Activity' || !obj.objectType) {
        // Activity (default)
        objectId = (obj as Activity).id;
      } else if (obj.objectType === 'StatementRef') {
        // StatementRef
        objectId = (obj as StatementRef).id;
      } else if (obj.objectType === 'SubStatement') {
        // SubStatement - use object's id if it's an Activity
        const subStmt = obj as SubStatement;
        if (typeof subStmt.object === 'string') {
          objectId = subStmt.object;
        } else if ('id' in subStmt.object) {
          objectId = (subStmt.object as Activity).id;
        } else {
          objectId = '';
        }
      } else if (obj.objectType === 'Agent' || obj.objectType === 'Group') {
        // Agent or Group - use mbox, account, or openid as identifier
        const agent = obj as Agent;
        objectId = agent.mbox || agent.account?.name || agent.openid || agent.mbox_sha1sum || '';
      }
    } else {
      // Fallback: try to get id property
      objectId = 'id' in statement.object ? (statement.object as any).id : '';
    }
    const registration = statement.context?.registration;
    const timestamp = statement.timestamp || stored;

    // Use raw SQL to bypass Drizzle's JSON handling issues with sqlite-proxy
    // This ensures proper JSON serialization and avoids "undefined" string issues
    if (!this.libsqlClient) throw new Error('LibSQL not initialized');

    await this.libsqlClient.execute({
      sql: `INSERT INTO xapi_statements (id, statement, actor, verb_id, object_id, registration, timestamp, stored, authority, voided)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        statementId,
        JSON.stringify(statement),
        JSON.stringify(statement.actor),
        verbId,
        objectId,
        registration ?? null,
        timestamp ?? null,
        stored,
        statement.authority ? JSON.stringify(statement.authority) : null,
        0, // voided = false
      ],
    });

    return statementId;
  }

  /**
   * Get a statement by ID
   */
  async getStatement(statementId: string): Promise<Statement | null> {
    if (!this.db) throw new Error('LRS not initialized');

    const result = await this.db
      .select()
      .from(statementsTable)
      .where(eq(statementsTable.id, statementId))
      .limit(1);

    if (result.length === 0) return null;

    return result[0]!.statement as Statement;
  }

  /**
   * Query statements
   */
  async queryStatements(params: StatementQueryParams): Promise<StatementResult> {
    if (!this.db) throw new Error('LRS not initialized');

    // Build query conditions
    const conditions = [];

    if (params.statementId) {
      conditions.push(eq(statementsTable.id, params.statementId));
    }
    if (params.verb) {
      conditions.push(eq(statementsTable.verbId, params.verb));
    }
    if (params.activity) {
      conditions.push(eq(statementsTable.objectId, params.activity));
    }
    if (params.registration) {
      conditions.push(eq(statementsTable.registration, params.registration));
    }
    if (params.since) {
      conditions.push(sql`${statementsTable.stored} >= ${params.since}`);
    }
    if (params.until) {
      conditions.push(sql`${statementsTable.stored} <= ${params.until}`);
    }

    // Build query
    let query = this.db.select().from(statementsTable);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    // Order by stored timestamp
    query = query.orderBy(desc(statementsTable.stored)) as any;

    // Limit
    const limit = params.limit || 100;
    query = query.limit(limit) as any;

    try {
      const results = await query;
      const statements = results.map((r) => r.statement as Statement);

      return {
        statements,
      };
    } catch (error) {
      // Handle JSON parsing errors (e.g., "undefined" strings in JSON columns)
      if (error instanceof Error && error.message.includes('not valid JSON')) {
        console.warn('JSON parsing error in LRS query, attempting to clean database:', error.message);
        // Try to clean up invalid JSON values in the database
        await this.cleanInvalidJSON();
        // Retry the query after cleanup
        const results = await query;
        const statements = results.map((r) => r.statement as Statement);
        return {
          statements,
        };
      }
      throw error;
    }
  }

  /**
   * Clean invalid JSON values from the database
   * Fixes "undefined" strings that might have been incorrectly stored
   */
  private async cleanInvalidJSON(): Promise<void> {
    if (!this.libsqlClient) return;

    try {
      // Update any "undefined" strings in JSON columns to NULL
      // Clean all JSON columns in xapi_statements: statement, actor, authority
      await this.libsqlClient.execute(`
        UPDATE xapi_statements
        SET authority = NULL
        WHERE authority = 'undefined' OR authority = 'null'
      `);

      await this.libsqlClient.execute(`
        UPDATE xapi_statements
        SET actor = NULL
        WHERE actor = 'undefined' OR actor = 'null'
      `);

      // Note: We don't set statement to NULL as it's required,
      // but we can delete rows with invalid statement JSON
      await this.libsqlClient.execute(`
        DELETE FROM xapi_statements
        WHERE statement = 'undefined' OR statement = 'null'
      `);

      await this.libsqlClient.execute(`
        UPDATE cmi5_state
        SET state = NULL
        WHERE state = 'undefined' OR state = 'null'
      `);
    } catch (error) {
      console.error('Failed to clean invalid JSON:', error);
    }
  }

  /**
   * Save CMI5 state
   */
  async saveCMI5State(
    registration: string,
    activityId: string,
    agent: Agent,
    stateId: string,
    state: CMI5State
  ): Promise<void> {
    if (!this.db) throw new Error('LRS not initialized');

    const id = generateUUID();
    const updatedAt = new Date().toISOString();

    await this.db.insert(cmi5StateTable).values({
      id,
      registration,
      activityId,
      agent: agent as any,
      stateId,
      state: state as any,
      updatedAt,
    });
  }

  /**
   * Get CMI5 state
   */
  async getCMI5State(
    registration: string,
    activityId: string,
    agent: Statement['actor'],
    stateId: string
  ): Promise<CMI5State | null> {
    if (!this.db) throw new Error('LRS not initialized');

    const result = await this.db
      .select()
      .from(cmi5StateTable)
      .where(
        and(
          eq(cmi5StateTable.registration, registration),
          eq(cmi5StateTable.activityId, activityId),
          eq(cmi5StateTable.stateId, stateId)
        )
      )
      .limit(1);

    if (result.length === 0) return null;

    return result[0]!.state as CMI5State;
  }

  /**
   * Delete CMI5 state
   */
  async deleteCMI5State(
    registration: string,
    activityId: string,
    agent: Statement['actor'],
    stateId: string
  ): Promise<void> {
    if (!this.db) throw new Error('LRS not initialized');

    await this.db
      .delete(cmi5StateTable)
      .where(
        and(
          eq(cmi5StateTable.registration, registration),
          eq(cmi5StateTable.activityId, activityId),
          eq(cmi5StateTable.stateId, stateId)
        )
      );
  }

  /**
   * Clear all statements from the database
   * USE WITH CAUTION - this is destructive and cannot be undone
   */
  async clearAllStatements(): Promise<void> {
    if (!this.libsqlClient) throw new Error('LRS not initialized');

    await this.libsqlClient.execute('DELETE FROM xapi_statements');
  }

  /**
   * Clear all CMI5 state from the database
   * USE WITH CAUTION - this is destructive and cannot be undone
   */
  async clearAllCMI5State(): Promise<void> {
    if (!this.libsqlClient) throw new Error('LRS not initialized');

    await this.libsqlClient.execute('DELETE FROM cmi5_state');
  }

  // ---------------------------------------------------------------------------
  // FSRS State Methods
  // ---------------------------------------------------------------------------

  /**
   * Save FSRS state for a kubit
   * Uses CMI5 state storage with stateId = 'fsrs:{kubitId}'
   */
  async saveFSRSState(
    registration: string,
    kubitId: string,
    agent: Statement['actor'],
    fsrsState: import('../types/fsrs').FSRSState,
    mastery: number,
    lastReview: string,
    nextReview: string,
    reviewCount: number,
    firstReview?: string
  ): Promise<void> {
    if (!this.db) throw new Error('LRS not initialized');

    const stateId = `fsrs:${kubitId}`;
    const activityId = `https://polyglot.tools/kubits/${kubitId.replace(/:/g, '/')}`;

    const fsrsExtension: import('../types/fsrs').FSRSExtension = {
      fsrs: fsrsState,
      mastery,
      lastReview,
      nextReview,
      reviewCount,
      firstReview,
    };

    // Use upsert pattern - delete existing and insert new
    const id = generateUUID();
    const updatedAt = new Date().toISOString();

    // Delete existing state first
    await this.db
      .delete(cmi5StateTable)
      .where(
        and(
          eq(cmi5StateTable.registration, registration),
          eq(cmi5StateTable.activityId, activityId),
          eq(cmi5StateTable.stateId, stateId)
        )
      );

    // Insert new state
    await this.db.insert(cmi5StateTable).values({
      id,
      registration,
      activityId,
      agent: agent as any,
      stateId,
      state: fsrsExtension as any,
      updatedAt,
    });
  }

  /**
   * Get FSRS state for a kubit
   */
  async getFSRSState(
    registration: string,
    kubitId: string,
    agent: Statement['actor']
  ): Promise<import('../types/fsrs').FSRSExtension | null> {
    if (!this.db) throw new Error('LRS not initialized');

    const stateId = `fsrs:${kubitId}`;
    const activityId = `https://polyglot.tools/kubits/${kubitId.replace(/:/g, '/')}`;

    const result = await this.db
      .select()
      .from(cmi5StateTable)
      .where(
        and(
          eq(cmi5StateTable.registration, registration),
          eq(cmi5StateTable.activityId, activityId),
          eq(cmi5StateTable.stateId, stateId)
        )
      )
      .limit(1);

    if (result.length === 0) return null;

    // The state column stores FSRSExtension for FSRS states (keyed by 'fsrs:{kubitId}')
    return result[0]!.state as unknown as import('../types/fsrs').FSRSExtension;
  }

  /**
   * Get all FSRS states for a registration
   * Returns a Map of kubitId -> FSRSExtension
   */
  async getAllFSRSStates(
    registration: string,
    agent: Statement['actor']
  ): Promise<Map<string, import('../types/fsrs').FSRSExtension>> {
    if (!this.db) throw new Error('LRS not initialized');

    // Query all states that start with 'fsrs:'
    const results = await this.db
      .select()
      .from(cmi5StateTable)
      .where(
        and(
          eq(cmi5StateTable.registration, registration),
          sql`${cmi5StateTable.stateId} LIKE 'fsrs:%'`
        )
      );

    const statesMap = new Map<string, import('../types/fsrs').FSRSExtension>();

    for (const row of results) {
      // Extract kubitId from stateId (format: 'fsrs:{kubitId}')
      const kubitId = row.stateId.replace('fsrs:', '');
      // The state column stores FSRSExtension for FSRS states
      statesMap.set(kubitId, row.state as unknown as import('../types/fsrs').FSRSExtension);
    }

    return statesMap;
  }
}
