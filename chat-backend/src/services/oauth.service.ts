/**
 * OAuth Service - Google OAuth 2.0 Token Management
 * Handles OAuth flow, token storage, refresh, and revocation
 */

import { google } from 'googleapis';
import axios from 'axios';
import { getOAuthConfig, TOKEN_REFRESH_CONFIG, OAUTH_ERRORS } from '../config/oauth.config';
import { encryptData, decryptData } from '../utils/encryption';
import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface OAuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope: string;
  tokenType: string;
}

export interface OAuthCodeExchangeResult {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number; // seconds
  scope: string;
}

/**
 * OAuthService handles Google OAuth 2.0 authentication
 * Responsibilities:
 * - Generate OAuth consent URLs
 * - Exchange authorization codes for tokens
 * - Store encrypted tokens in database
 * - Automatically refresh tokens before expiry
 * - Revoke access tokens
 */
export class OAuthService {
  private readonly SERVICE_GMAIL = 'gmail';
  private readonly SERVICE_CALENDAR = 'calendar';
  private oauth2Client: any;
  private refreshCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    const config = getOAuthConfig('gmail');
    this.oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );
  }

  /**
   * Generate Google OAuth consent URL
   * User will be redirected to this URL to authorize the application
   *
   * @param userId - User ID (stored in state for security)
   * @param service - 'gmail' or 'calendar'
   * @returns OAuth consent URL
   *
   * **Validates: Requirements 21, 30**
   */
  getGoogleAuthUrl(userId: string, service: 'gmail' | 'calendar' = 'gmail'): string {
    try {
      // Validate inputs
      if (!userId || typeof userId !== 'string') {
        throw new Error('Invalid userId');
      }

      if (service !== this.SERVICE_GMAIL && service !== this.SERVICE_CALENDAR) {
        throw new Error(`Invalid service: ${service}`);
      }

      // Get OAuth config for the service
      const config = getOAuthConfig(service);

      // Update redirect URI for this service
      this.oauth2Client = new google.auth.OAuth2(
        config.clientId,
        config.clientSecret,
        config.redirectUri
      );

      // Generate authorization URL with state for CSRF protection
      const state = Buffer.from(JSON.stringify({ userId, service, timestamp: Date.now() }))
        .toString('base64');

      const authUrl = this.oauth2Client.generateAuthUrl({
        access_type: 'offline', // Request refresh token
        scope: config.scopes,
        state, // CSRF protection
        prompt: 'consent' // Force consent screen to get refresh token
      });

      logger.info(`Generated OAuth URL for user ${userId} (${service})`);
      return authUrl;
    } catch (error) {
      logger.error(`Failed to generate OAuth URL for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Exchange authorization code for access and refresh tokens
   * This is called after user approves OAuth consent
   *
   * @param code - Authorization code from Google OAuth callback
   * @param service - 'gmail' or 'calendar'
   * @returns Access token, refresh token, and expiration time
   *
   * **Validates: Requirements 21, 30**
   */
  async exchangeCodeForToken(
    code: string,
    service: 'gmail' | 'calendar' = 'gmail'
  ): Promise<OAuthCodeExchangeResult> {
    try {
      // Validate authorization code
      if (!code || typeof code !== 'string' || code.length < 10) {
        throw {
          ...OAUTH_ERRORS.INVALID_AUTH_CODE,
          details: 'Authorization code is invalid or malformed'
        };
      }

      if (service !== this.SERVICE_GMAIL && service !== this.SERVICE_CALENDAR) {
        throw {
          ...OAUTH_ERRORS.INVALID_SERVICE,
          details: `Service must be 'gmail' or 'calendar', got '${service}'`
        };
      }

      // Get OAuth config
      const config = getOAuthConfig(service);

      // Update OAuth2 client with correct config
      this.oauth2Client = new google.auth.OAuth2(
        config.clientId,
        config.clientSecret,
        config.redirectUri
      );

      // Exchange code for tokens
      const { tokens } = await this.oauth2Client.getToken(code);

      if (!tokens.access_token) {
        throw {
          ...OAUTH_ERRORS.INVALID_AUTH_CODE,
          details: 'No access token received from Google'
        };
      }

      const result: OAuthCodeExchangeResult = {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expiry_date ? Math.floor((tokens.expiry_date - Date.now()) / 1000) : 3600,
        scope: tokens.scope || config.scopes.join(' ')
      };

      logger.info(`Successfully exchanged authorization code for ${service} tokens`);
      return result;
    } catch (error) {
      logger.error(`Failed to exchange authorization code for ${service}:`, error);
      throw error;
    }
  }

  /**
   * Store encrypted OAuth tokens in database
   * Tokens are encrypted using AES-256-GCM
   *
   * @param userId - User ID
   * @param service - 'gmail' or 'calendar'
   * @param token - OAuth token info to store
   */
  async storeToken(
    userId: string,
    service: 'gmail' | 'calendar',
    token: OAuthCodeExchangeResult
  ): Promise<void> {
    try {
      // Validate inputs
      if (!userId || !service || !token.accessToken) {
        throw new Error('Invalid parameters for storeToken');
      }

      // Encrypt tokens
      const encryptedAccessToken = encryptData(token.accessToken);
      const encryptedRefreshToken = token.refreshToken
        ? encryptData(token.refreshToken)
        : null;

      // Calculate expiration time
      const expiresAt = token.expiresIn
        ? new Date(Date.now() + token.expiresIn * 1000)
        : new Date(Date.now() + 3600 * 1000); // Default 1 hour

      // Parse permissions from scope string
      const grantedPermissions = token.scope
        ? token.scope.split(' ').filter(Boolean)
        : [];

      // Store in database (upsert)
      await prisma.oAuthToken.upsert({
        where: {
          userId_service: {
            userId,
            service
          }
        },
        create: {
          userId,
          service,
          encryptedAccessToken,
          encryptedRefreshToken,
          expiresAt,
          grantedPermissions,
          isRevoked: false
        },
        update: {
          encryptedAccessToken,
          encryptedRefreshToken,
          expiresAt,
          grantedPermissions,
          isRevoked: false,
          updatedAt: new Date()
        }
      });

      logger.info(`Stored encrypted OAuth token for user ${userId} (${service})`);
    } catch (error) {
      logger.error(`Failed to store OAuth token for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get access token for a user, auto-refreshing if needed
   * Automatically refreshes token if it's within 5 minutes of expiry
   *
   * @param userId - User ID
   * @param service - 'gmail' or 'calendar'
   * @returns Access token or null if not authenticated
   *
   * **Validates: Requirements 21, 30**
   */
  async getAccessToken(userId: string, service: 'gmail' | 'calendar'): Promise<string | null> {
    try {
      // Validate inputs
      if (!userId || !service) {
        throw new Error('Invalid userId or service');
      }

      // Fetch token from database
      const oauthToken = await prisma.oAuthToken.findUnique({
        where: {
          userId_service: { userId, service }
        }
      });

      // Token not found or revoked
      if (!oauthToken || oauthToken.isRevoked) {
        logger.warn(`OAuth token not found or revoked for user ${userId} (${service})`);
        return null;
      }

      // Check if token is expired or expiring soon (within 5 minutes)
      const now = Date.now();
      const expiryTime = oauthToken.expiresAt?.getTime() || 0;
      const timeUntilExpiry = expiryTime - now;

      // If token expires within 5 minutes or is already expired, refresh it
      if (timeUntilExpiry < TOKEN_REFRESH_CONFIG.REFRESH_BEFORE_EXPIRY_MS) {
        logger.info(`Token expiring soon for user ${userId} (${service}), refreshing...`);

        if (!oauthToken.encryptedRefreshToken) {
          logger.error(`No refresh token available for user ${userId} (${service})`);
          return null;
        }

        const newToken = await this.refreshToken(userId, service);
        return newToken;
      }

      // Token is valid, decrypt and return
      try {
        const decrypted = decryptData(oauthToken.encryptedAccessToken);
        return decrypted;
      } catch (decryptError) {
        logger.error(`Failed to decrypt access token for user ${userId}:`, decryptError);
        return null;
      }
    } catch (error) {
      logger.error(`Failed to get access token for user ${userId} (${service}):`, error);
      return null;
    }
  }

  /**
   * Refresh an expired OAuth token using refresh token
   * Stores the new tokens in the database
   *
   * @param userId - User ID
   * @param service - 'gmail' or 'calendar'
   * @returns New access token or null if refresh failed
   *
   * **Validates: Requirements 21, 30**
   */
  async refreshToken(userId: string, service: 'gmail' | 'calendar'): Promise<string | null> {
    let retryCount = 0;

    const attemptRefresh = async (): Promise<string | null> => {
      try {
        // Fetch token from database
        const oauthToken = await prisma.oAuthToken.findUnique({
          where: {
            userId_service: { userId, service }
          }
        });

        if (!oauthToken || !oauthToken.encryptedRefreshToken) {
          logger.error(`Cannot refresh: no refresh token for user ${userId} (${service})`);
          return null;
        }

        // Decrypt refresh token
        let refreshToken: string;
        try {
          refreshToken = decryptData(oauthToken.encryptedRefreshToken);
        } catch (error) {
          logger.error(`Failed to decrypt refresh token for user ${userId}:`, error);
          return null;
        }

        // Get OAuth config
        const config = getOAuthConfig(service);

        // Use Google API client to refresh token
        this.oauth2Client = new google.auth.OAuth2(
          config.clientId,
          config.clientSecret,
          config.redirectUri
        );

        this.oauth2Client.setCredentials({ refresh_token: refreshToken });

        // Request new token
        const { credentials } = await this.oauth2Client.refreshAccessToken();

        if (!credentials.access_token) {
          throw new Error('No access token in refresh response');
        }

        // Store new tokens
        const refreshResult: OAuthCodeExchangeResult = {
          accessToken: credentials.access_token,
          refreshToken: credentials.refresh_token,
          expiresIn: credentials.expiry_date
            ? Math.floor((credentials.expiry_date - Date.now()) / 1000)
            : 3600,
          scope: credentials.scope || config.scopes.join(' ')
        };

        await this.storeToken(userId, service, refreshResult);

        logger.info(`Successfully refreshed OAuth token for user ${userId} (${service})`);
        return credentials.access_token;
      } catch (error) {
        retryCount++;

        if (retryCount < TOKEN_REFRESH_CONFIG.MAX_RETRY_ATTEMPTS) {
          // Exponential backoff
          const delayMs = Math.min(
            TOKEN_REFRESH_CONFIG.RETRY_INITIAL_DELAY_MS * Math.pow(2, retryCount - 1),
            TOKEN_REFRESH_CONFIG.RETRY_MAX_DELAY_MS
          );

          logger.warn(
            `Token refresh failed for user ${userId}, retrying in ${delayMs}ms (attempt ${retryCount}/${TOKEN_REFRESH_CONFIG.MAX_RETRY_ATTEMPTS})`
          );

          // Wait and retry
          await new Promise(resolve => setTimeout(resolve, delayMs));
          return attemptRefresh();
        }

        logger.error(
          `Failed to refresh OAuth token for user ${userId} (${service}) after ${TOKEN_REFRESH_CONFIG.MAX_RETRY_ATTEMPTS} attempts:`,
          error
        );

        throw {
          ...OAUTH_ERRORS.TOKEN_REFRESH_FAILED,
          details: error instanceof Error ? error.message : String(error)
        };
      }
    };

    return attemptRefresh();
  }

  /**
   * Revoke an OAuth token to disable access
   * Revokes both access and refresh tokens on Google's servers
   *
   * @param userId - User ID
   * @param service - 'gmail' or 'calendar'
   *
   * **Validates: Requirements 21, 30**
   */
  async revokeToken(userId: string, service: 'gmail' | 'calendar'): Promise<void> {
    try {
      // Validate inputs
      if (!userId || !service) {
        throw new Error('Invalid userId or service');
      }

      // Fetch token from database
      const oauthToken = await prisma.oAuthToken.findUnique({
        where: {
          userId_service: { userId, service }
        }
      });

      if (!oauthToken) {
        logger.warn(`OAuth token not found for user ${userId} (${service}), skipping revocation`);
        return;
      }

      // Decrypt access token
      let accessToken: string;
      try {
        accessToken = decryptData(oauthToken.encryptedAccessToken);
      } catch (error) {
        logger.error(`Failed to decrypt access token for revocation:`, error);
        throw error;
      }

      // Call Google's token revocation endpoint
      try {
        await axios.post(`https://oauth2.googleapis.com/revoke`, null, {
          params: { token: accessToken },
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 5000
        });
      } catch (revokeError: any) {
        // 400 "Token expired or revoked" is OK - token is already revoked
        if (revokeError.response?.status !== 400) {
          logger.error(`Failed to revoke token on Google servers:`, revokeError);
          throw {
            ...OAUTH_ERRORS.TOKEN_REVOCATION_FAILED,
            details: revokeError.message
          };
        }
      }

      // Mark token as revoked in database
      await prisma.oAuthToken.update({
        where: {
          userId_service: { userId, service }
        },
        data: {
          isRevoked: true,
          revokedAt: new Date()
        }
      });

      logger.info(`Revoked OAuth token for user ${userId} (${service})`);
    } catch (error) {
      logger.error(`Failed to revoke OAuth token for user ${userId} (${service}):`, error);
      throw error;
    }
  }

  /**
   * Check if user has valid OAuth token
   * @param userId - User ID
   * @param service - 'gmail' or 'calendar'
   * @returns true if user has non-revoked token, false otherwise
   */
  async hasValidToken(userId: string, service: 'gmail' | 'calendar'): Promise<boolean> {
    try {
      const token = await prisma.oAuthToken.findUnique({
        where: {
          userId_service: { userId, service }
        }
      });

      return token !== null && !token.isRevoked;
    } catch (error) {
      logger.error(`Failed to check OAuth token validity:`, error);
      return false;
    }
  }

  /**
   * Get token expiration status
   * @param userId - User ID
   * @param service - 'gmail' or 'calendar'
   * @returns Object with expiration status
   */
  async getTokenExpirationStatus(
    userId: string,
    service: 'gmail' | 'calendar'
  ): Promise<{
    isExpired: boolean;
    expiresAt?: Date;
    timeUntilExpiry?: number; // milliseconds
  }> {
    try {
      const token = await prisma.oAuthToken.findUnique({
        where: {
          userId_service: { userId, service }
        }
      });

      if (!token || !token.expiresAt) {
        return { isExpired: true };
      }

      const now = Date.now();
      const expiryTime = token.expiresAt.getTime();
      const timeUntilExpiry = expiryTime - now;

      return {
        isExpired: timeUntilExpiry <= 0,
        expiresAt: token.expiresAt,
        timeUntilExpiry: Math.max(0, timeUntilExpiry)
      };
    } catch (error) {
      logger.error(`Failed to get token expiration status:`, error);
      return { isExpired: true };
    }
  }
}

// Export singleton instance
export const oauthService = new OAuthService();
