/**
 * xAPI Client Wrapper
 *
 * Wrapper for xAPI client functionality using @xapi/xapi library.
 * For browser-based apps, can use local LRSStore instead of remote endpoint.
 */

import XAPI from '@xapi/xapi';
import type { Statement, Actor } from '@xapi/xapi';
import type { CMI5LaunchParameters } from 'cmi5-core';
import type { LRSStore } from 'cmi5-lrs';

/**
 * xAPI Client Options
 * 
 * Philosophy: Offline-first by default
 * - useLocalLRS: true (default) - Store data locally (data ownership)
 * - useLocalLRS: false - Use remote endpoint (for LMS integration)
 */
export interface XAPIClientOptions {
  /** Use local browser LRS instead of remote endpoint (default: true - offline-first) */
  useLocalLRS?: boolean;
  /** Local LRS store instance (required if useLocalLRS is true) */
  localLRS?: LRSStore;
}

/**
 * xAPI Client
 * Handles communication with xAPI Learning Record Store (LRS)
 * Uses @xapi/xapi for xAPI 1.0.3 compliance
 * Can use local browser LRS or remote endpoint
 */
export class XAPIClient {
  private xapi: XAPI | null = null;
  private localLRS: LRSStore | null = null;
  private useLocal: boolean;

  constructor(launchParams: CMI5LaunchParameters, options: XAPIClientOptions = {}) {
    // Default to offline-first (local LRS) unless explicitly disabled
    this.useLocal = options.useLocalLRS ?? true;
    
    if (this.useLocal) {
      if (!options.localLRS) {
        throw new Error('localLRS is required when useLocalLRS is true');
      }
      this.localLRS = options.localLRS;
    } else {
      // Use remote xAPI endpoint
      this.xapi = new XAPI({
        endpoint: launchParams.endpoint,
        auth: launchParams.auth,
      });
    }
  }

  /**
   * Send xAPI statement to LRS
   */
  async sendStatement(statement: Statement): Promise<void> {
    try {
      if (this.useLocal && this.localLRS) {
        // Use local browser LRS
        await this.localLRS.storeStatement(statement);
      } else if (this.xapi) {
        // Use remote xAPI endpoint
        await this.xapi.sendStatement({ statement });
      } else {
        throw new Error('No LRS configured');
      }
    } catch (error) {
      console.error('Error sending xAPI statement:', error);
      throw error;
    }
  }

  /**
   * Send multiple statements in batch
   */
  async sendStatements(statements: Statement[]): Promise<void> {
    try {
      if (this.useLocal && this.localLRS) {
        // Use local browser LRS - store sequentially
        for (const statement of statements) {
          await this.localLRS.storeStatement(statement);
        }
      } else if (this.xapi) {
        // Use remote xAPI endpoint
        await this.xapi.sendStatements({ statements });
      } else {
        throw new Error('No LRS configured');
      }
    } catch (error) {
      console.error('Error sending xAPI statements:', error);
      throw error;
    }
  }

  /**
   * Get state from xAPI state API
   */
  async getState(
    activityId: string,
    stateId: string,
    agent: string | Actor
  ): Promise<unknown> {
    try {
      const agentObj = typeof agent === 'string' ? JSON.parse(agent) : agent;
      
      if (this.useLocal && this.localLRS) {
        // Use local browser LRS
        // For CMI5, we need registration - extract from agent or use default
        const registration = 'registration' in (agentObj as any) ? (agentObj as any).registration : 'default';
        const state = await this.localLRS.getCMI5State(registration, activityId, agentObj, stateId);
        return state;
      } else if (this.xapi) {
        // Use remote xAPI endpoint
        const state = await this.xapi.getState({ activityId, stateId, agent: agentObj });
        return state;
      } else {
        throw new Error('No LRS configured');
      }
    } catch (error: any) {
      if (error?.status === 404 || error?.message?.includes('not found')) {
        return null; // State doesn't exist yet
      }
      console.error('Error getting xAPI state:', error);
      throw error;
    }
  }

  /**
   * Save state to xAPI state API
   */
  async saveState(
    activityId: string,
    stateId: string,
    agent: string | Actor,
    state: unknown
  ): Promise<void> {
    try {
      const agentObj = typeof agent === 'string' ? JSON.parse(agent) : agent;
      
      if (this.useLocal && this.localLRS) {
        // Use local browser LRS
        // For CMI5, we need registration - extract from state or use default
        const registration = (state as any)?.registration || 'default';
        await this.localLRS.saveCMI5State(registration, activityId, agentObj, stateId, state as any);
      } else if (this.xapi) {
        // Use remote xAPI endpoint
        await this.xapi.setState({ activityId, stateId, agent: agentObj, state: state as any });
      } else {
        throw new Error('No LRS configured');
      }
    } catch (error) {
      console.error('Error saving xAPI state:', error);
      throw error;
    }
  }

  /**
   * Delete state from xAPI state API
   */
  async deleteState(
    activityId: string,
    stateId: string,
    agent: string | Actor
  ): Promise<void> {
    try {
      const agentObj = typeof agent === 'string' ? JSON.parse(agent) : agent;
      
      if (this.useLocal && this.localLRS) {
        // Use local browser LRS
        const registration = 'registration' in (agentObj as any) ? (agentObj as any).registration : 'default';
        await this.localLRS.deleteCMI5State(registration, activityId, agentObj, stateId);
      } else if (this.xapi) {
        // Use remote xAPI endpoint
        await this.xapi.deleteState({ activityId, stateId, agent: agentObj });
      } else {
        throw new Error('No LRS configured');
      }
    } catch (error) {
      console.error('Error deleting xAPI state:', error);
      throw error;
    }
  }
}
