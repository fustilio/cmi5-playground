/**
 * CMI5 Launch Parameter Parser
 *
 * Parses CMI5 launch parameters from URL query string.
 */

import type { CMI5LaunchParameters } from 'cmi5-core';
import { validateLaunchParameters } from 'cmi5-core';

/**
 * Parse CMI5 launch parameters from URL query string
 *
 * @param queryString - URL query string (e.g., "?endpoint=...&auth=...")
 * @returns Parsed launch parameters
 */
export function parseCMI5LaunchParameters(queryString: string): CMI5LaunchParameters {
  const params = new URLSearchParams(queryString);
  
  const endpoint = params.get('endpoint');
  const auth = params.get('auth');
  const actor = params.get('actor');

  if (!endpoint || !auth || !actor) {
    throw new Error(
      'Missing required CMI5 launch parameters. Required: endpoint, auth, actor'
    );
  }

  return {
    endpoint,
    auth,
    actor,
    registration: params.get('registration') || undefined,
    activityId: params.get('activityId') || undefined,
    fetch: params.get('fetch') || undefined,
  };
}

/**
 * Parse CMI5 launch parameters from URL
 *
 * @param url - Full URL with query string
 * @returns Parsed launch parameters
 */
export function parseCMI5LaunchParametersFromURL(url: string): CMI5LaunchParameters {
  try {
    const urlObj = new URL(url);
    return parseCMI5LaunchParameters(urlObj.search);
  } catch (error) {
    throw new Error(`Invalid URL format: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Build CMI5 launch URL
 *
 * @param baseUrl - Base URL for the content
 * @param params - Launch parameters
 * @returns Complete launch URL with query string
 */
export function buildCMI5LaunchURL(
  baseUrl: string,
  params: CMI5LaunchParameters
): string {
  const url = new URL(baseUrl);
  
  url.searchParams.set('endpoint', params.endpoint);
  url.searchParams.set('auth', params.auth);
  url.searchParams.set('actor', params.actor);
  
  if (params.registration) {
    url.searchParams.set('registration', params.registration);
  }
  if (params.activityId) {
    url.searchParams.set('activityId', params.activityId);
  }
  if (params.fetch) {
    url.searchParams.set('fetch', params.fetch);
  }
  
  return url.toString();
}

/**
 * Validate CMI5 launch parameters
 *
 * @param params - Launch parameters to validate
 * @returns Validation result
 */
export function validateCMI5LaunchParameters(
  params: Partial<CMI5LaunchParameters>
): { valid: boolean; errors: string[] } {
  return validateLaunchParameters(params);
}
