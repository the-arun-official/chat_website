/**
 * Property-Based Tests for OAuth Service
 * Uses fast-check to validate OAuth token encryption and management properties
 *
 * **Validates: Properties 19-20**
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import { encryptData, decryptData } from '../../src/utils/encryption';

describe('OAuth Service - Property-Based Tests', () => {
  // Setup environment for encryption
  beforeEach(() => {
    if (!process.env.ENCRYPTION_KEY) {
      process.env.ENCRYPTION_KEY = 'test-encryption-key-at-least-32-chars-long-for-aes256!!!';
    }
  });

  /**
   * Property 19: Token Encryption Round-Trip
   *
   * For any OAuth token string, encrypt(token) followed by decrypt(encrypt(token))
   * SHALL return the original token unchanged.
   *
   * This property validates that the encryption/decryption cycle is lossless
   * and maintains data integrity.
   */
  describe('Property 19: Token Encryption Round-Trip', () => {
    it('should encrypt and decrypt tokens without data loss', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 10000 }), // OAuth tokens are typically 500-2000 chars
          (token: string) => {
            // Arrange: Encrypt the token
            const encrypted = encryptData(token);

            // Act: Decrypt the encrypted token
            const decrypted = decryptData(encrypted);

            // Assert: Original token should be recovered exactly
            expect(decrypted).toBe(token);

            // Additional assertions for encryption integrity
            expect(encrypted).toBeTruthy();
            expect(encrypted).not.toBe(token); // Encrypted should differ from plaintext
            expect(typeof encrypted).toBe('string');
            expect(encrypted.length).toBeGreaterThan(0);

            return true;
          }
        ),
        { numRuns: 100, seed: 12345, verbose: true }
      );
    });

    it('should handle special characters in tokens correctly', () => {
      fc.assert(
        fc.property(
          fc.string({
            minLength: 1,
            maxLength: 5000,
            // Include special characters that might appear in OAuth tokens
            characters: fc.characters({
              from: 32, // Space
              to: 126 // Tilde (~)
            })
          }),
          (token: string) => {
            const encrypted = encryptData(token);
            const decrypted = decryptData(encrypted);

            expect(decrypted).toBe(token);
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle unicode and emoji in tokens', () => {
      fc.assert(
        fc.property(
          fc.string({
            minLength: 1,
            maxLength: 1000,
            characters: fc.fullUnicode()
          }),
          (token: string) => {
            const encrypted = encryptData(token);
            const decrypted = decryptData(encrypted);

            expect(decrypted).toBe(token);
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle empty strings and whitespace', () => {
      const testCases = [
        '',
        ' ',
        '  \n  \t  ',
        '\n\t\r',
        '   '
      ];

      for (const token of testCases) {
        const encrypted = encryptData(token);
        const decrypted = decryptData(encrypted);
        expect(decrypted).toBe(token);
      }
    });

    it('should handle typical OAuth token formats', () => {
      // Generate tokens similar to real Google OAuth tokens
      fc.assert(
        fc.property(
          fc.tuple(
            fc.stringMatching(/^ya29\.[A-Za-z0-9_-]{50,}$|^[A-Za-z0-9_-]{500,1000}$/), // OAuth token-like patterns
            fc.array(
              fc.record({
                key: fc.string({ minLength: 1, maxLength: 50 }),
                value: fc.string({ minLength: 1, maxLength: 200 })
              }),
              { minLength: 0, maxLength: 10 }
            )
          ),
          ([token, metadata]) => {
            // Encrypt token with metadata as JSON
            const payload = `${token}:${JSON.stringify(metadata)}`;
            const encrypted = encryptData(payload);
            const decrypted = decryptData(encrypted);

            expect(decrypted).toBe(payload);
            return true;
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  /**
   * Property 20: Token Encryption Determinism Per Key
   *
   * For a fixed encryption key K and token T, encrypt_with_key(T, K) called
   * multiple times SHALL produce different ciphertexts (due to random IV)
   * but all decrypt back to T using the same key.
   *
   * This property validates that:
   * 1. Each encryption produces unique ciphertext (security requirement)
   * 2. All encrypted versions decrypt to the same plaintext (consistency requirement)
   * 3. IV randomization is working correctly (prevents patterns)
   */
  describe('Property 20: Token Encryption Determinism Per Key', () => {
    it('should produce different ciphertexts for same token due to random IV', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 5000 }),
          (token: string) => {
            // Arrange: Encrypt the same token multiple times
            const encryptedVersions: Set<string> = new Set();

            const NUM_ENCRYPTIONS = 20;
            for (let i = 0; i < NUM_ENCRYPTIONS; i++) {
              const encrypted = encryptData(token);
              encryptedVersions.add(encrypted);

              // Act: Decrypt each version
              const decrypted = decryptData(encrypted);

              // Assert: Each should decrypt to original token
              expect(decrypted).toBe(token);
            }

            // Assert: All encryptions should be unique (random IV)
            // In practice, we should get at least NUM_ENCRYPTIONS - 1 unique values
            // (allowing for extremely rare collisions with random IV)
            expect(encryptedVersions.size).toBeGreaterThanOrEqual(Math.floor(NUM_ENCRYPTIONS * 0.95));

            return true;
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should encrypt same token to different ciphertexts consistently', () => {
      const token =
        'ya29.a0AfH6SMBx1q9Z1q9Z1q9Z1q9Z1q9Z1q9Z1q9Z1q9Z1q9Z1q9Z1q9Z1q9Z1q9Z1q';

      const encryptedSet = new Set<string>();
      const decryptedSet = new Set<string>();

      for (let i = 0; i < 50; i++) {
        const encrypted = encryptData(token);
        encryptedSet.add(encrypted);

        const decrypted = decryptData(encrypted);
        decryptedSet.add(decrypted);
      }

      // All decryptions should result in the same token
      expect(decryptedSet.size).toBe(1);
      expect(decryptedSet.has(token)).toBe(true);

      // Encryptions should produce different ciphertexts (due to random IV)
      // We expect at least 45 unique ciphertexts out of 50
      expect(encryptedSet.size).toBeGreaterThanOrEqual(45);
    });

    it('should maintain key-consistency: same key decrypts all versions', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 10, maxLength: 2000 }), {
            minLength: 1,
            maxLength: 10
          }),
          (tokens: string[]) => {
            // Encrypt all tokens
            const encrypted: Array<{ token: string; ciphertext: string }> = tokens.map(token => ({
              token,
              ciphertext: encryptData(token)
            }));

            // Decrypt all and verify consistency
            for (const { token, ciphertext } of encrypted) {
              const decrypted = decryptData(ciphertext);
              expect(decrypted).toBe(token);
            }

            return true;
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should produce unique IVs for each encryption', () => {
      // This test validates that the random IV generation is working
      // by checking that encrypted outputs are statistically different
      const token = 'test_oauth_token_' + Math.random().toString(36).substring(7);

      const encryptedVersions = Array.from({ length: 100 }, () => encryptData(token));

      // Check that at least 95 out of 100 are unique
      const uniqueCount = new Set(encryptedVersions).size;
      expect(uniqueCount).toBeGreaterThanOrEqual(95);

      // Verify all decrypt to the same value
      const decryptedValues = new Set(encryptedVersions.map(enc => decryptData(enc)));
      expect(decryptedValues.size).toBe(1);
      expect(decryptedValues.has(token)).toBe(true);
    });

    it('should handle encryption of large tokens with consistent key behavior', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1000, maxLength: 10000 }),
          (largeToken: string) => {
            // Encrypt 10 times
            const ciphertexts: string[] = [];
            for (let i = 0; i < 10; i++) {
              const encrypted = encryptData(largeToken);
              ciphertexts.push(encrypted);

              // Verify decryption works immediately
              const decrypted = decryptData(encrypted);
              expect(decrypted).toBe(largeToken);
            }

            // All ciphertexts should be unique
            const uniqueCiphertexts = new Set(ciphertexts);
            expect(uniqueCiphertexts.size).toBeGreaterThanOrEqual(8); // Allow 2 collisions out of 10

            return true;
          }
        ),
        { numRuns: 15 }
      );
    });

    it('should maintain determinism in decryption despite non-deterministic encryption', () => {
      // Collect 30 encryptions of the same token
      const token = 'oauth_refresh_token_example_12345678901234567890123456789012';

      const results: Array<{ encrypted: string; decrypted: string }> = [];
      for (let i = 0; i < 30; i++) {
        const encrypted = encryptData(token);
        const decrypted = decryptData(encrypted);
        results.push({ encrypted, decrypted });
      }

      // All decrypted values should be the original token
      const decryptedTokens = new Set(results.map(r => r.decrypted));
      expect(decryptedTokens.size).toBe(1);
      expect(decryptedTokens.has(token)).toBe(true);

      // All encrypted values should be different
      const encryptedTokens = new Set(results.map(r => r.encrypted));
      expect(encryptedTokens.size).toBeGreaterThanOrEqual(25); // Allow ~5 collisions in 30
    });
  });

  /**
   * Edge Cases and Error Handling
   */
  describe('OAuth Encryption Edge Cases', () => {
    it('should handle tokens with null bytes', () => {
      const tokenWithNullByte = 'token' + String.fromCharCode(0) + 'data';
      const encrypted = encryptData(tokenWithNullByte);
      const decrypted = decryptData(encrypted);

      expect(decrypted).toBe(tokenWithNullByte);
      expect(decrypted.indexOf(String.fromCharCode(0))).toBeGreaterThan(0);
    });

    it('should handle very long tokens', () => {
      const longToken = 'x'.repeat(100000);
      const encrypted = encryptData(longToken);
      const decrypted = decryptData(encrypted);

      expect(decrypted).toBe(longToken);
      expect(decrypted.length).toBe(100000);
    });

    it('should handle tokens with repeated patterns', () => {
      const pattern = 'AAABBBCCC';
      const repeatedToken = pattern.repeat(1000);

      const encrypted = encryptData(repeatedToken);
      const decrypted = decryptData(encrypted);

      expect(decrypted).toBe(repeatedToken);
    });

    it('should fail gracefully on corrupted ciphertext', () => {
      const token = 'test_token_12345';
      let encrypted = encryptData(token);

      // Corrupt the ciphertext by modifying a character
      if (encrypted.length > 10) {
        const corruptedEncrypted =
          encrypted.substring(0, 10) +
          (encrypted[10] === 'A' ? 'Z' : 'A') +
          encrypted.substring(11);

        // Should throw or return invalid data
        expect(() => {
          decryptData(corruptedEncrypted);
        }).toThrow();
      }
    });
  });

  /**
   * Integration with OAuth Token Storage Pattern
   */
  describe('OAuth Token Storage Patterns', () => {
    it('should support storing multiple tokens for same user with different services', () => {
      const gmailToken = 'ya29.gmail_' + Math.random().toString(36).substring(7);
      const calendarToken = 'ya29.calendar_' + Math.random().toString(36).substring(7);

      const encryptedGmail = encryptData(gmailToken);
      const encryptedCalendar = encryptData(calendarToken);

      // Verify both can be decrypted independently
      expect(decryptData(encryptedGmail)).toBe(gmailToken);
      expect(decryptData(encryptedCalendar)).toBe(calendarToken);

      // Verify they're different ciphertexts
      expect(encryptedGmail).not.toBe(encryptedCalendar);
    });

    it('should support storing access and refresh tokens separately', () => {
      const accessToken = 'ya29.a0AfH6SMBx' + Math.random().toString(36).substring(7);
      const refreshToken = 'ya29.refresh_' + Math.random().toString(36).substring(7);

      const encryptedAccess = encryptData(accessToken);
      const encryptedRefresh = encryptData(refreshToken);

      expect(decryptData(encryptedAccess)).toBe(accessToken);
      expect(decryptData(encryptedRefresh)).toBe(refreshToken);
    });

    it('should handle token rotation securely', () => {
      const oldToken = 'old_token_' + Math.random().toString(36).substring(7);
      const newToken = 'new_token_' + Math.random().toString(36).substring(7);

      // Encrypt old token
      const encryptedOld = encryptData(oldToken);
      expect(decryptData(encryptedOld)).toBe(oldToken);

      // Encrypt new token
      const encryptedNew = encryptData(newToken);
      expect(decryptData(encryptedNew)).toBe(newToken);

      // Old and new should produce different ciphertexts
      expect(encryptedOld).not.toBe(encryptedNew);

      // Even if we re-encrypt the old token, it should still be different from new
      const reencryptedOld = encryptData(oldToken);
      expect(reencryptedOld).not.toBe(encryptedNew);
    });
  });
});
