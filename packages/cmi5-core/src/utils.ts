/**
 * CMI5 Utilities
 *
 * Helper functions for CMI5 operations
 */

import type { CMI5LaunchParameters } from './types';

/**
 * Generate objective ID from node ID
 *
 * @param nodeId - Node ID (e.g., syllst node ID or kubit ID)
 * @param baseUrl - Base URL for objectives (default: DEFAULT_OBJECTIVE_BASE_URL)
 * @returns Objective ID
 */
export function generateObjectiveId(
  nodeId: string,
  baseUrl: string = 'https://polyglot.tools'
): string {
  return `${baseUrl}/objectives/${nodeId}`;
}

/**
 * Generate AU ID from lesson ID
 *
 * @param lessonId - Lesson ID
 * @param prefix - Prefix for AU ID (default: 'au')
 * @returns AU ID
 */
export function generateAUID(lessonId: string, prefix: string = 'au'): string {
  return `${prefix}-${lessonId}`;
}

/**
 * Validate CMI5 launch parameters
 *
 * @param params - Launch parameters to validate
 * @returns Validation result with errors array
 */
export function validateLaunchParameters(
  params: Partial<CMI5LaunchParameters>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!params.endpoint) {
    errors.push('Missing required parameter: endpoint');
  } else {
    try {
      new URL(params.endpoint);
    } catch {
      errors.push('Invalid endpoint URL format');
    }
  }

  if (!params.auth) {
    errors.push('Missing required parameter: auth');
  }

  if (!params.actor) {
    errors.push('Missing required parameter: actor');
  } else {
    try {
      JSON.parse(params.actor);
    } catch {
      errors.push('Invalid actor JSON format');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Parse actor from JSON string
 *
 * @param actorJson - Actor JSON string
 * @returns Parsed actor object
 * @throws Error if JSON is invalid
 */
export function parseActor(actorJson: string): unknown {
  try {
    return JSON.parse(actorJson);
  } catch {
    throw new Error('Invalid actor JSON in CMI5 launch parameters');
  }
}
