import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../../src/services/auth.service';
import * as jwtUtils from '../../src/utils/jwt';
import * as hashUtils from '../../src/utils/hash';

// Mock dependencies
vi.mock('../../src/repositories/user.repository', () => {
  return {
    UserRepository: vi.fn().mockImplementation(() => ({
      findByEmail: vi.fn(),
      findByUsername: vi.fn(),
      create: vi.fn(),
    }))
  };
});

vi.mock('../../src/repositories/token.repository', () => {
  return {
    TokenRepository: vi.fn().mockImplementation(() => ({
      create: vi.fn(),
      findByToken: vi.fn(),
      deleteByToken: vi.fn(),
    }))
  };
});

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    authService = new AuthService();
  });

  describe('register', () => {
    it('should register a user successfully if email and username are unique', async () => {
      // Access the mocked repository inside the service instance
      const mockUserRepo = (authService as any).userRepository;
      mockUserRepo.findByEmail.mockResolvedValue(null);
      mockUserRepo.findByUsername.mockResolvedValue(null);
      
      const mockUser = { id: '1', email: 'test@test.com', username: 'test', passwordHash: 'hashed' };
      mockUserRepo.create.mockResolvedValue(mockUser);
      
      vi.spyOn(hashUtils, 'hashPassword').mockResolvedValue('hashed');

      const result = await authService.register({
        email: 'test@test.com',
        username: 'test',
        fullName: 'Test User',
        password: 'password123'
      });

      expect(result).toHaveProperty('id');
      expect(result).not.toHaveProperty('passwordHash');
      expect(mockUserRepo.create).toHaveBeenCalled();
    });

    it('should throw an error if email is already in use', async () => {
      const mockUserRepo = (authService as any).userRepository;
      mockUserRepo.findByEmail.mockResolvedValue({ id: '1' });

      await expect(authService.register({ email: 'test@test.com' }))
        .rejects.toThrow('Email already in use');
    });
  });
});
