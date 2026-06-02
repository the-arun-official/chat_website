import { ChatRepository } from '../repositories/chat.repository';
import { prisma } from '../config/prisma';
import { getIO } from '../sockets/socket.server';

export class ChatService {
  private chatRepository: ChatRepository;

  constructor() {
    this.chatRepository = new ChatRepository();
  }

  async getOrCreatePrivateChat(currentUserId: string, targetUserId: string) {
    if (currentUserId === targetUserId) {
      throw new Error('Cannot create a private chat with yourself');
    }

    let chat = await this.chatRepository.findPrivateChatBetweenUsers(currentUserId, targetUserId);
    
    if (!chat) {
      chat = await this.chatRepository.createPrivateChat(currentUserId, targetUserId);
      
      // Notify the target user that a new chat request exists
      try {
        const fullChat = await this.chatRepository.getChatById(chat.id);
        getIO().to(targetUserId).emit('new_chat_created', fullChat);
      } catch (err) { console.error('Socket emit failed', err); }

    } else {
      // Unhide for the current user if it was hidden
      const participant = chat.participants.find((p: any) => p.userId === currentUserId);
      if (participant?.hiddenAt) {
        await prisma.chatParticipant.update({
          where: { chatId_userId: { chatId: chat.id, userId: currentUserId } },
          data: { hiddenAt: null }
        });
        chat.participants.find((p: any) => p.userId === currentUserId)!.hiddenAt = null;
      }
    }
    
    return chat;
  }

  async createGroupChat(creatorId: string, data: { name: string; description?: string; userIds: string[] }) {
    return this.chatRepository.createGroupChat(creatorId, data.userIds, data.name, data.description);
  }

  async getUserChats(userId: string) {
    const chats = await this.chatRepository.getUserChats(userId);
    return chats.map((chat: any) => {
      const { messages, participants, ...rest } = chat;
      const myParticipant = participants.find((p: any) => p.userId === userId);
      
      let lastMessage = messages?.[0] || null;
      if (lastMessage && myParticipant?.hiddenAt && new Date(lastMessage.createdAt) < new Date(myParticipant.hiddenAt)) {
        lastMessage = null;
      }

      return {
        ...rest,
        participants,
        unreadCount: myParticipant?.unreadCount || 0,
        isPinned: myParticipant?.isPinned || false,
        isArchived: myParticipant?.isArchived || false,
        isMuted: myParticipant?.isMuted || false,
        lastMessage: lastMessage
      };
    });
  }

  async toggleChatFeature(userId: string, chatId: string, feature: 'pin' | 'archive' | 'mute' | 'read') {
    // We should do this in the repository, but we can call Prisma directly here for speed
    // if the repository doesn't have a specific method, or add it to repository.
    // Let's call repository.
    return this.chatRepository.toggleParticipantFeature(userId, chatId, feature);
  }

  async acceptRequest(userId: string, chatId: string) {
    const result = await this.chatRepository.acceptRequest(userId, chatId);
    
    try {
      getIO().to(chatId).emit('chat_accepted', { chatId });
    } catch (err) { console.error('Socket emit failed', err); }
    
    return result;
  }

  async declineRequest(userId: string, chatId: string) {
    // Verify participant
    const isParticipant = await this.chatRepository.isUserInChat(chatId, userId);
    if (!isParticipant) throw new Error('Not a participant');
    
    try {
      getIO().to(chatId).emit('chat_declined', { chatId });
    } catch (err) { console.error('Socket emit failed', err); }

    // For now, declining just deletes the entire chat so it disappears from both
    // If we wanted, we could just remove the participant, but deleting the private chat is cleaner.
    return prisma.chat.delete({
      where: { id: chatId }
    });
  }

  async hideChat(userId: string, chatId: string) {
    const isParticipant = await this.chatRepository.isUserInChat(chatId, userId);
    if (!isParticipant) throw new Error('Not a participant');
    
    return this.chatRepository.hideChat(chatId, userId);
  }

  async updateGroupDetails(userId: string, chatId: string, data: { name?: string; description?: string; avatarUrl?: string }) {
    const participant = await this.chatRepository.getParticipant(chatId, userId);
    if (!participant || participant.role !== 'ADMIN') {
      throw new Error('Only group admins can update group details');
    }
    const updatedGroup = await this.chatRepository.updateGroupDetails(chatId, data);
    
    try {
      getIO().to(chatId).emit('group_updated', { chatId, groupDetails: updatedGroup });
    } catch(err) { console.error(err); }

    return updatedGroup;
  }

  async addGroupMembers(adminId: string, chatId: string, userIds: string[]) {
    const participant = await this.chatRepository.getParticipant(chatId, adminId);
    if (!participant || participant.role !== 'ADMIN') {
      throw new Error('Only group admins can add members');
    }
    
    const newParticipants = await this.chatRepository.addGroupMembers(chatId, userIds);
    
    try {
      getIO().to(chatId).emit('participants_added', { chatId, participants: newParticipants });
      userIds.forEach(id => {
        getIO().to(id).emit('added_to_group', { chatId });
      });
    } catch(err) { console.error(err); }

    return newParticipants;
  }

  async removeGroupMember(requesterId: string, chatId: string, targetUserId: string) {
    if (requesterId !== targetUserId) {
      const requester = await this.chatRepository.getParticipant(chatId, requesterId);
      if (!requester || requester.role !== 'ADMIN') {
        throw new Error('Only group admins can remove other members');
      }
    }
    
    await this.chatRepository.removeGroupMember(chatId, targetUserId);
    
    try {
      getIO().to(chatId).emit('participant_removed', { chatId, userId: targetUserId });
      if (requesterId !== targetUserId) {
        getIO().to(targetUserId).emit('removed_from_group', { chatId });
      }
    } catch(err) { console.error(err); }
  }

  async updateMemberRole(adminId: string, chatId: string, targetUserId: string, role: 'ADMIN' | 'MEMBER') {
    const adminParticipant = await this.chatRepository.getParticipant(chatId, adminId);
    if (!adminParticipant || adminParticipant.role !== 'ADMIN') {
      throw new Error('Only group admins can change roles');
    }
    
    const updated = await this.chatRepository.updateMemberRole(chatId, targetUserId, role);
    
    try {
      getIO().to(chatId).emit('participant_updated', { chatId, participant: updated });
    } catch(err) { console.error(err); }

    return updated;
  }
}
