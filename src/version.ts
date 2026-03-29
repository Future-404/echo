/**
 * ECHO Project Versioning System
 * 
 * VERSION: The core semantic version (Major.Minor.Patch)
 * BRANCH: The current development branch identifier
 */

export const VERSION = '0.0.1';
export const BRANCH = 'main';

/**
 * Returns the full version string for display (e.g., "v0.0.1" or "v0.0.1-alpha")
 */
export const getDisplayVersion = () => {
  return `v${VERSION}${BRANCH !== 'main' ? `-${BRANCH}` : ''}`;
};

/**
 * Returns the technical version string (e.g., "0.0.1-main")
 */
export const getFullVersion = () => {
  return `${VERSION}-${BRANCH}`;
};
