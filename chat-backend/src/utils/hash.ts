import bcrypt from 'bcryptjs';

/**
 * SECURITY CONSTANTS
 */
const BCRYPT_ROUNDS = 12; // Production-grade security (increased from 10)
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;
const COMPARISON_TIMEOUT_MS = 5000; // 5-second timeout to prevent DoS

/**
 * Hash a password using bcryptjs with production-grade security settings
 * 
 * @param password - Plain text password to hash
 * @returns Promise<string> - Hashed password
 * @throws Error if password validation fails or hashing fails
 */
export const hashPassword = async (password: string): Promise<string> => {
  // Validate password before hashing
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }

  // Trim input but validate length after trimming
  const trimmedPassword = password.trim();
  if (trimmedPassword.length < PASSWORD_MIN_LENGTH) {
    throw new Error(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
  }

  if (trimmedPassword.length > PASSWORD_MAX_LENGTH) {
    throw new Error(`Password must not exceed ${PASSWORD_MAX_LENGTH} characters`);
  }

  try {
    // Use bcryptjs with 12 rounds for production security
    const hashed = await bcrypt.hash(trimmedPassword, BCRYPT_ROUNDS);
    return hashed;
  } catch (error) {
    console.error('[SECURITY] Password hashing failed', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      // Never log the actual password or hash
    });
    throw new Error('Password hashing failed. Please try again.');
  }
};

/**
 * Compare a plain text password against a bcrypt hash
 * Enforces timeout to prevent timing attacks and DoS
 * 
 * @param password - Plain text password to verify
 * @param hash - Bcrypt hash to compare against
 * @returns Promise<boolean> - True if password matches, false otherwise
 * @throws Error if comparison times out or other errors occur
 */
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  // Validate inputs
  if (!password || typeof password !== 'string') {
    return false; // Return false instead of throwing to avoid info leaks
  }

  if (!hash || typeof hash !== 'string') {
    console.error('[SECURITY] Invalid hash provided for password comparison');
    return false;
  }

  try {
    // Create a timeout promise that rejects after 5 seconds
    const timeoutPromise = new Promise<boolean>((_, reject) =>
      setTimeout(() => reject(new Error('Password comparison timeout')), COMPARISON_TIMEOUT_MS)
    );

    // Create the comparison promise
    const comparisonPromise = bcrypt.compare(password, hash);

    // Race between timeout and actual comparison
    const result = await Promise.race([comparisonPromise, timeoutPromise]);
    return result;
  } catch (error) {
    // Log failed comparisons for security monitoring (without sensitive data)
    console.warn('[SECURITY] Password comparison failed', {
      reason: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      // Never log the password or hash
    });
    
    // Always return false on error to prevent information leaks
    return false;
  }
};

/**
 * Utility function to validate password strength
 * Used during registration/password reset to enforce security requirements
 * 
 * @param password - Password to validate
 * @returns { valid: boolean; errors: string[] } - Validation result with error messages
 */
export const validatePasswordStrength = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!password) {
    return { valid: false, errors: ['Password is required'] };
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    errors.push(`Password must not exceed ${PASSWORD_MAX_LENGTH} characters`);
  }

  // Check for uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter (A-Z)');
  }

  // Check for lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter (a-z)');
  }

  // Check for number
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number (0-9)');
  }

  // Check for special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*)');
  }

  return { valid: errors.length === 0, errors };
};
