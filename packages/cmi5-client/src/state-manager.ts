/**
 * CMI5 State Manager
 *
 * Manages CMI5 state for learner progress and mastery tracking.
 * Handles state persistence and retrieval via xAPI state API or local LRS.
 * 
 * Philosophy: Offline-first by default
 * - All state is stored locally (data ownership)
 * - Works seamlessly in Next.js serverless environments
 * - Cloud sync is optional and separate (via CloudSyncManager)
 */

import type {
  CMI5State,
  CMI5ObjectiveState,
  CMI5LaunchParameters,
} from 'cmi5-core';
import { DEFAULT_STATE_ID } from 'cmi5-core';
import { XAPIClient, type XAPIClientOptions } from './xapi-client';

/**
 * CMI5 State Manager Options
 */
export interface CMI5StateManagerOptions extends XAPIClientOptions {
  /** Activity ID (AU ID) for state management */
  activityId: string;
  /** State ID for xAPI state API (default: 'cmi5.runtime') */
  stateId?: string;
}

/**
 * CMI5 State Manager
 * Manages learner state for CMI5 AUs
 * Works with browser-based LRS or remote xAPI endpoint
 */
export class CMI5StateManager {
  private state: CMI5State;
  private launchParams: CMI5LaunchParameters;
  private xapiClient: XAPIClient;
  private activityId: string;
  private stateId: string;
  private actor: any; // Parsed actor object

  constructor(launchParams: CMI5LaunchParameters, options: CMI5StateManagerOptions) {
    this.launchParams = launchParams;
    this.activityId = options.activityId;
    this.stateId = options.stateId || DEFAULT_STATE_ID;
    
    // Parse actor
    try {
      this.actor = JSON.parse(launchParams.actor);
    } catch {
      throw new Error('Invalid actor JSON in CMI5 launch parameters');
    }

    // Initialize xAPI client
    this.xapiClient = new XAPIClient(launchParams, options);

    // Initialize state
    this.state = {
      registration: launchParams.registration || 'unknown',
      launchMode: 'Normal',
      objectiveStates: new Map(),
      progress: {
        completedLessons: [],
        timeSpent: 0,
      },
      completed: false,
    };
  }

  /**
   * Initialize state from xAPI state API or local LRS
   */
  async initialize(): Promise<void> {
    try {
      const savedState = await this.xapiClient.getState(
        this.activityId,
        this.stateId,
        this.actor
      );

      if (savedState) {
        // Convert saved state to CMI5State format
        const state = savedState as any;
        this.state = {
          registration: state.registration || this.launchParams.registration || 'unknown',
          launchMode: state.launchMode || 'Normal',
          objectiveStates: new Map(
            Object.entries(state.objectiveStates || {}).map(([key, value]: [string, any]) => [
              key,
              {
                objectiveId: value.objectiveId || key,
                nodeId: value.nodeId || value.kubitId, // Support both for backward compatibility
                kubitId: value.kubitId || value.nodeId, // Support both for backward compatibility
                mastery: value.mastery || 0,
                satisfied: value.satisfied || false,
                lastAttempted: value.lastAttempted || new Date().toISOString(),
                attempts: value.attempts || 0,
              },
            ])
          ),
          progress: state.progress || {
            completedLessons: [],
            timeSpent: 0,
          },
          completed: state.completed || false,
          completedAt: state.completedAt,
        };
      }
    } catch (error) {
      console.warn('Failed to load CMI5 state, starting with empty state:', error);
      // Continue with empty state
    }
  }

  /**
   * Update objective mastery state
   */
  updateObjectiveState(
    objectiveId: string,
    nodeId: string | undefined,
    mastery: number,
    satisfied: boolean
  ): void {
    const existing = this.state.objectiveStates.get(objectiveId);
    
    this.state.objectiveStates.set(objectiveId, {
      objectiveId,
      nodeId,
      kubitId: nodeId, // Also set kubitId for backward compatibility
      mastery,
      satisfied,
      lastAttempted: new Date().toISOString(),
      attempts: (existing?.attempts || 0) + 1,
    });
  }

  /**
   * Get objective state
   */
  getObjectiveState(objectiveId: string): CMI5ObjectiveState | undefined {
    return this.state.objectiveStates.get(objectiveId);
  }

  /**
   * Update lesson progress
   */
  updateProgress(lessonId: string, timeSpent: number): void {
    this.state.progress.currentLesson = lessonId;
    this.state.progress.timeSpent += timeSpent;
    
    if (!this.state.progress.completedLessons.includes(lessonId)) {
      this.state.progress.completedLessons.push(lessonId);
    }
  }

  /**
   * Mark AU as completed
   */
  markCompleted(): void {
    this.state.completed = true;
    this.state.completedAt = new Date().toISOString();
  }

  /**
   * Get current state
   */
  getState(): CMI5State {
    return { ...this.state };
  }

  /**
   * Save state to xAPI state API or local LRS
   */
  async saveState(): Promise<void> {
    try {
      // Convert Map to plain object for JSON serialization
      const stateToSave: any = {
        ...this.state,
        objectiveStates: Object.fromEntries(this.state.objectiveStates),
      };

      await this.xapiClient.saveState(
        this.activityId,
        this.stateId,
        this.actor,
        stateToSave
      );
    } catch (error) {
      console.error('Failed to save CMI5 state:', error);
      throw error;
    }
  }

  /**
   * Check if all objectives are satisfied
   */
  areAllObjectivesSatisfied(objectiveIds: string[]): boolean {
    return objectiveIds.every((id) => {
      const state = this.state.objectiveStates.get(id);
      return state?.satisfied === true;
    });
  }

  /**
   * Get overall mastery score (average of all objectives)
   */
  getOverallMastery(objectiveIds: string[]): number {
    if (objectiveIds.length === 0) return 0;

    const masteries = objectiveIds
      .map((id) => this.state.objectiveStates.get(id)?.mastery || 0)
      .filter((m) => m > 0);

    if (masteries.length === 0) return 0;

    return masteries.reduce((sum, m) => sum + m, 0) / masteries.length;
  }
}
