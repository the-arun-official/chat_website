/**
 * OAuth 2.0 Configuration for Google APIs (Gmail, Calendar)
 * Stores client credentials, redirect URIs, and scopes
 */

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

/**
 * Gmail OAuth 2.0 Configuration
 * Scopes: https://developers.google.com/gmail/api/auth/scopes
 */
export const gmailOAuthConfig: OAuthConfig = {
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/oauth/gmail/callback',
  scopes: [
    'https://www.googleapis.com/auth/gmail.readonly', // Read emails
    'https://www.googleapis.com/auth/gmail.modify' // Modify labels, mark as read
  ]
};

/**
 * Google Calendar OAuth 2.0 Configuration
 * Scopes: https://developers.google.com/calendar/api/auth/scopes
 */
export const calendarOAuthConfig: OAuthConfig = {
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/oauth/calendar/callback',
  scopes: [
    'https://www.googleapis.com/auth/calendar.readonly' // Read calendar events
  ]
};

/**
 * Validate OAuth configuration
 * @returns Object with validation result and error message
 */
export function validateOAuthConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!gmailOAuthConfig.clientId) {
    errors.push('GOOGLE_CLIENT_ID environment variable not set');
  }

  if (!gmailOAuthConfig.clientSecret) {
    errors.push('GOOGLE_CLIENT_SECRET environment variable not set');
  }

  if (!gmailOAuthConfig.redirectUri) {
    errors.push('GOOGLE_REDIRECT_URI environment variable not set');
  }

  if (gmailOAuthConfig.scopes.length === 0) {
    errors.push('OAuth scopes not configured');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get OAuth config for a service
 * @param service - 'gmail' or 'calendar'
 * @returns OAuth configuration for the service
 */
export function getOAuthConfig(service: 'gmail' | 'calendar'): OAuthConfig {
  if (service === 'gmail') {
    return gmailOAuthConfig;
  }
  if (service === 'calendar') {
    return calendarOAuthConfig;
  }
  throw new Error(`Unknown OAuth service: ${service}`);
}

/**
 * Token refresh timing constants
 */
export const TOKEN_REFRESH_CONFIG = {
  // Refresh token 5 minutes before expiry (300 seconds before expiration)
  REFRESH_BEFORE_EXPIRY_MS: 5 * 60 * 1000,
  
  // Check for expiring tokens every 1 minute
  REFRESH_CHECK_INTERVAL_MS: 1 * 60 * 1000,
  
  // Maximum token age (Google tokens typically expire in 1 hour)
  MAX_TOKEN_AGE_MS: 60 * 60 * 1000,
  
  // Retry delay for failed refresh attempts (exponential backoff starts at 1s)
  RETRY_INITIAL_DELAY_MS: 1000,
  
  // Maximum retry delay (5 minutes)
  RETRY_MAX_DELAY_MS: 5 * 60 * 1000,
  
  // Maximum number of refresh attempts
  MAX_RETRY_ATTEMPTS: 5
};

/**
 * OAuth error messages
 */
export const OAUTH_ERRORS = {
  OAUTH_REQUIRED: {
    code: 'OAUTH_REQUIRED',
    message: 'OAuth authentication required for this service',
    statusCode: 401
  },
  TOKEN_EXPIRED: {
    code: 'TOKEN_EXPIRED',
    message: 'OAuth token expired',
    statusCode: 401
  },
  TOKEN_REFRESH_FAILED: {
    code: 'TOKEN_REFRESH_FAILED',
    message: 'Failed to refresh OAuth token',
    statusCode: 500
  },
  INVALID_AUTH_CODE: {
    code: 'INVALID_AUTH_CODE',
    message: 'Invalid authorization code',
    statusCode: 400
  },
  TOKEN_REVOCATION_FAILED: {
    code: 'TOKEN_REVOCATION_FAILED',
    message: 'Failed to revoke OAuth token',
    statusCode: 500
  },
  INVALID_SERVICE: {
    code: 'INVALID_SERVICE',
    message: 'Invalid OAuth service',
    statusCode: 400
  }
};
