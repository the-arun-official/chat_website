import { UserRepository } from '../repositories/user.repository';

export class UserService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }



  async getProfile(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new Error('User not found');

    // Remove sensitive data
    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }

  async updateProfile(userId: string, data: any) {
    const updatedUser = await this.userRepository.updateProfile(userId, data);

    // Remove sensitive data
    const { passwordHash: _, ...safeUser } = updatedUser;
    return safeUser;
  }

  async deleteAccount(userId: string) {
    return this.userRepository.delete(userId);
  }

  async uploadAvatar(userId: string, avatarUrl: string) {
    // In Phase 4, we just save the URL. Actual S3 upload will be in Phase 10.
    const updatedUser = await this.userRepository.updateProfile(userId, { avatarUrl });
    const { passwordHash: _, ...safeUser } = updatedUser;
    return safeUser;
  }

  async searchUsers(query: string) {
    if (!query || query.length < 2) {
      return []; // Prevent massive DB dumps for short queries
    }
    return this.userRepository.searchUsers(query);
  }

  async getUserStatus(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new Error('User not found');

    return {
      id: user.id,
      status: user.status,
      lastSeen: user.lastSeen
    };
  }
}
