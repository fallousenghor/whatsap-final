import { api } from '../utils/api.js';
import { userService } from './userService.js';
import { CONVERSATION_TYPES } from '../config/constants.js';

class ConversationService {
  async getConversations() {
    try {
      const currentUser = userService.getCurrentUser();
      if (!currentUser) {
        throw new Error('Utilisateur non connecté');
      }

      const conversations = await api.get('/conversations', {
        participants_like: currentUser.id
      });

      // Enrichir avec les données des participants
      const enrichedConversations = await Promise.all(
        conversations.map(async (conversation) => {
          if (conversation.type === CONVERSATION_TYPES.PRIVATE) {
            const otherUserId = conversation.participants.find(id => id !== currentUser.id);
            const otherUser = await userService.getUserById(otherUserId);
            return {
              ...conversation,
              name: `${otherUser.firstName} ${otherUser.lastName}`,
              avatar: otherUser.avatar,
              isOnline: otherUser.isOnline,
              lastSeen: otherUser.lastSeen,
              otherUser
            };
          } else {
            // Pour les groupes, récupérer les infos du groupe
            const group = await api.get(`/groups/${conversation.groupId}`);
            return {
              ...conversation,
              name: group.name,
              avatar: group.avatar,
              group
            };
          }
        })
      );

      return enrichedConversations.sort((a, b) => 
        new Date(b.updatedAt) - new Date(a.updatedAt)
      );
    } catch (error) {
      console.error('Erreur lors de la récupération des conversations:', error);
      throw error;
    }
  }

  async createPrivateConversation(otherUserId) {
    try {
      const currentUser = userService.getCurrentUser();
      if (!currentUser) {
        throw new Error('Utilisateur non connecté');
      }

      // Vérifier si la conversation existe déjà
      const existingConversations = await api.get('/conversations');
      const existing = existingConversations.find(conv => 
        conv.type === CONVERSATION_TYPES.PRIVATE &&
        conv.participants.includes(currentUser.id) &&
        conv.participants.includes(otherUserId)
      );

      if (existing) {
        return existing;
      }

      const conversation = {
        id: this.generateId(),
        type: CONVERSATION_TYPES.PRIVATE,
        participants: [currentUser.id, otherUserId],
        lastMessage: null,
        unreadCount: {
          [currentUser.id]: 0,
          [otherUserId]: 0
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      return await api.post('/conversations', conversation);
    } catch (error) {
      console.error('Erreur lors de la création de la conversation:', error);
      throw error;
    }
  }

  async createGroupConversation(groupId) {
    try {
      const conversation = {
        id: this.generateId(),
        type: CONVERSATION_TYPES.GROUP,
        groupId,
        participants: [], // Sera rempli par les membres du groupe
        lastMessage: null,
        unreadCount: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      return await api.post('/conversations', conversation);
    } catch (error) {
      console.error('Erreur lors de la création de la conversation de groupe:', error);
      throw error;
    }
  }

  async deleteConversation(conversationId) {
    try {
      // Supprimer tous les messages de la conversation
      const messages = await api.get('/messages', { conversationId });
      await Promise.all(
        messages.map(message => api.delete(`/messages/${message.id}`))
      );

      // Supprimer la conversation
      return await api.delete(`/conversations/${conversationId}`);
    } catch (error) {
      console.error('Erreur lors de la suppression de la conversation:', error);
      throw error;
    }
  }

  async clearConversation(conversationId) {
    try {
      const messages = await api.get('/messages', { conversationId });
      await Promise.all(
        messages.map(message => api.delete(`/messages/${message.id}`))
      );

      // Réinitialiser la dernière message
      await api.patch(`/conversations/${conversationId}`, {
        lastMessage: null,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erreur lors de la suppression des messages:', error);
      throw error;
    }
  }

  async muteConversation(conversationId, duration) {
    try {
      const muteUntil = new Date();
      muteUntil.setTime(muteUntil.getTime() + duration);

      return await api.patch(`/conversations/${conversationId}`, {
        mutedUntil: muteUntil.toISOString()
      });
    } catch (error) {
      console.error('Erreur lors de la mise en sourdine:', error);
      throw error;
    }
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

export const conversationService = new ConversationService();