import { prisma } from '../config/prisma';
import { ChatType, ParticipantRole } from '@prisma/client';

export class ChatRepository {
  async findPrivateChatBetweenUsers(userId1: string, userId2: string) {
    // Find all private chats that contain userId1
    const chats = await prisma.chat.findMany({
      where: {
        type: ChatType.PRIVATE,
        participants: {
          some: { userId: userId1 }
        }
      },
      include: {
        participants: {
          include: { user: { select: { id: true, username: true, fullName: true, avatarUrl: true, status: true } } }
        }
      }
    });

    // Filter down to the one that also contains userId2
    return chats.find(chat => chat.participants.some(p => p.userId === userId2));
  }

  async createPrivateChat(userId1: string, userId2: string) {
    // Check if they are in each other's contacts
    const contact = await prisma.contact.findFirst({
      where: {
        OR: [
          { userId: userId1, contactId: userId2 },
          { userId: userId2, contactId: userId1 }
        ]
      }
    });
    const isFriends = !!contact;

    return prisma.chat.create({
      data: {
        type: ChatType.PRIVATE,
        participants: {
          create: [
            { userId: userId1, role: ParticipantRole.ADMIN, hasAccepted: true },
            { userId: userId2, role: ParticipantRole.MEMBER, hasAccepted: isFriends }
          ]
        }
      },
      include: {
        participants: { 
          include: { user: { select: { id: true, username: true, fullName: true, avatarUrl: true, status: true } } } 
        }
      }
    });
  }

  async createGroupChat(creatorId: string, userIds: string[], name: string, description?: string) {
    // Construct the participant array
    const participants = userIds.map(id => ({
      userId: id,
      role: id === creatorId ? ParticipantRole.ADMIN : ParticipantRole.MEMBER,
      hasAccepted: id === creatorId ? true : false
    }));

    // Ensure the creator is included if they didn't pass their own ID in the array
    if (!userIds.includes(creatorId)) {
      participants.push({ userId: creatorId, role: ParticipantRole.ADMIN, hasAccepted: true });
    }

    return prisma.chat.create({
      data: {
        type: ChatType.GROUP,
        participants: {
          create: participants
        },
        groupDetails: {
          create: {
            name,
            description,
            createdById: creatorId
          }
        }
      },
      include: {
        groupDetails: true,
        participants: { 
          include: { user: { select: { id: true, username: true, fullName: true, avatarUrl: true } } } 
        }
      }
    });
  }

  async getUserChats(userId: string) {
    return prisma.chat.findMany({
      where: {
        participants: {
          some: { 
            userId
          }
        }
      },
      include: {
        groupDetails: true,
        participants: {
          include: {
            user: {
              select: { id: true, username: true, fullName: true, avatarUrl: true, status: true, lastSeen: true }
            }
          }
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' }
        },
        autoMessengerConfigs: {
          where: { isEnabled: true },
          select: { userId: true, isEnabled: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
  }

  async isUserInChat(chatId: string, userId: string) {
    const participant = await this.getParticipant(chatId, userId);
    return !!participant;
  }

  async getParticipant(chatId: string, userId: string) {
    return prisma.chatParticipant.findUnique({
      where: {
        chatId_userId: { chatId, userId }
      }
    });
  }

  async getChatById(chatId: string) {
    return prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        participants: { select: { userId: true, hasAccepted: true } }
      }
    });
  }

  async toggleParticipantFeature(userId: string, chatId: string, feature: 'pin' | 'archive' | 'mute' | 'read') {
    const participant = await prisma.chatParticipant.findUnique({
      where: { chatId_userId: { chatId, userId } }
    });

    if (!participant) {
      throw new Error("You are not a participant of this chat.");
    }

    const data: any = {};
    if (feature === 'pin') data.isPinned = !participant.isPinned;
    if (feature === 'archive') data.isArchived = !participant.isArchived;
    if (feature === 'mute') data.isMuted = !participant.isMuted;
    if (feature === 'read') data.unreadCount = 0;

    return prisma.chatParticipant.update({
      where: { chatId_userId: { chatId, userId } },
      data
    });
  }

  async acceptRequest(userId: string, chatId: string) {
    return prisma.chatParticipant.update({
      where: { chatId_userId: { chatId, userId } },
      data: { hasAccepted: true }
    });
  }

  async deleteChat(chatId: string) {
    return prisma.chat.delete({
      where: { id: chatId }
    });
  }

  async hideChat(chatId: string, userId: string) {
    return prisma.chatParticipant.update({
      where: { chatId_userId: { chatId, userId } },
      data: { hiddenAt: new Date() }
    });
  }

  async unhideAllParticipants(chatId: string) {
    return prisma.chatParticipant.updateMany({
      where: { chatId },
      data: { hiddenAt: null }
    });
  }

  async incrementUnreadCounts(chatId: string, senderId: string) {
    return prisma.chatParticipant.updateMany({
      where: { 
        chatId,
        userId: { not: senderId }
      },
      data: {
        unreadCount: { increment: 1 }
      }
    });
  }

  async updateGroupDetails(chatId: string, data: { name?: string; description?: string; avatarUrl?: string }) {
    return prisma.group.update({
      where: { chatId },
      data
    });
  }

  async addGroupMembers(chatId: string, userIds: string[]) {
    const participantsData = userIds.map(userId => ({
      chatId,
      userId,
      role: 'MEMBER' as any,
      hasAccepted: false
    }));
    await prisma.chatParticipant.createMany({
      data: participantsData,
      skipDuplicates: true
    });
    return prisma.chatParticipant.findMany({
      where: { chatId, userId: { in: userIds } },
      include: { user: { select: { id: true, username: true, fullName: true, avatarUrl: true } } }
    });
  }

  async removeGroupMember(chatId: string, userId: string) {
    return prisma.chatParticipant.delete({
      where: { chatId_userId: { chatId, userId } }
    });
  }

  async updateMemberRole(chatId: string, userId: string, role: 'ADMIN' | 'MEMBER') {
    return prisma.chatParticipant.update({
      where: { chatId_userId: { chatId, userId } },
      data: { role },
      include: { user: { select: { id: true, username: true, fullName: true, avatarUrl: true } } }
    });
  }
}
