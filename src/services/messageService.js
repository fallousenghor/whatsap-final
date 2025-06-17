import { api } from '../utils/api.js';
import { userService } from './userService.js';
import { MESSAGE_TYPES, MESSAGE_STATUS } from '../config/constants.js';
import { eventBus } from '../utils/eventBus.js';

class MessageService {
  async sendMessage(conversationId, content, type = MESSAGE_TYPES.TEXT, replyTo = null) {
    try {
      const currentUser = userService.getCurrentUser();
      if (!currentUser) {
        throw new Error('Utilisateur non connecté');
      }

      const message = {
        id: this.generateId(),
        conversationId,
        senderId: currentUser.id,
        content,
        type,
        timestamp: new Date().toISOString(),
        status: MESSAGE_STATUS.SENDING,
        replyTo,
        reactions: {},
        isEdited: false,
        isDeleted: false
      };

      // Émettre l'événement pour l'affichage immédiat
      eventBus.emit('message:sending', message);

      // Envoyer le message
      const sentMessage = await api.post('/messages', {
        ...message,
        status: MESSAGE_STATUS.SENT
      });

      // Mettre à jour la conversation
      await this.updateConversationLastMessage(conversationId, sentMessage);

      eventBus.emit('message:sent', sentMessage);
      return sentMessage;
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      eventBus.emit('message:failed', { conversationId, error });
      throw error;
    }
  }

  async getMessages(conversationId, limit = 50, offset = 0) {
    try {
      const messages = await api.get('/messages', {
        conversationId,
        _limit: limit,
        _start: offset,
        _sort: 'timestamp',
        _order: 'desc'
      });

      return messages.reverse(); // Ordre chronologique
    } catch (error) {
      console.error('Erreur lors de la récupération des messages:', error);
      throw error;
    }
  }

  async markAsRead(messageIds, conversationId) {
    try {
      const currentUser = userService.getCurrentUser();
      if (!currentUser) return;

      // Marquer les messages comme lus
      await Promise.all(
        messageIds.map(messageId =>
          api.patch(`/messages/${messageId}`, { status: MESSAGE_STATUS.READ })
        )
      );

      // Réinitialiser le compteur de messages non lus
      await this.updateUnreadCount(conversationId, currentUser.id, 0);

      eventBus.emit('messages:read', { conversationId, messageIds });
    } catch (error) {
      console.error('Erreur lors du marquage comme lu:', error);
      throw error;
    }
  }

  async editMessage(messageId, newContent) {
    try {
      const message = await api.patch(`/messages/${messageId}`, {
        content: newContent,
        isEdited: true,
        editedAt: new Date().toISOString()
      });

      eventBus.emit('message:edited', message);
      return message;
    } catch (error) {
      console.error('Erreur lors de la modification du message:', error);
      throw error;
    }
  }

  async deleteMessage(messageId, deleteForEveryone = false) {
    try {
      if (deleteForEveryone) {
        const message = await api.patch(`/messages/${messageId}`, {
          isDeleted: true,
          deletedAt: new Date().toISOString(),
          content: 'Ce message a été supprimé'
        });
        eventBus.emit('message:deleted', message);
        return message;
      } else {
        // Suppression locale uniquement
        eventBus.emit('message:deletedLocally', { messageId });
      }
    } catch (error) {
      console.error('Erreur lors de la suppression du message:', error);
      throw error;
    }
  }

  async addReaction(messageId, emoji) {
    try {
      const currentUser = userService.getCurrentUser();
      if (!currentUser) return;

      const message = await api.get(`/messages/${messageId}`);
      const reactions = { ...message.reactions };
      
      if (!reactions[emoji]) {
        reactions[emoji] = [];
      }

      if (!reactions[emoji].includes(currentUser.id)) {
        reactions[emoji].push(currentUser.id);
      }

      const updatedMessage = await api.patch(`/messages/${messageId}`, { reactions });
      eventBus.emit('message:reactionAdded', updatedMessage);
      return updatedMessage;
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la réaction:', error);
      throw error;
    }
  }

  async removeReaction(messageId, emoji) {
    try {
      const currentUser = userService.getCurrentUser();
      if (!currentUser) return;

      const message = await api.get(`/messages/${messageId}`);
      const reactions = { ...message.reactions };
      
      if (reactions[emoji]) {
        reactions[emoji] = reactions[emoji].filter(userId => userId !== currentUser.id);
        if (reactions[emoji].length === 0) {
          delete reactions[emoji];
        }
      }

      const updatedMessage = await api.patch(`/messages/${messageId}`, { reactions });
      eventBus.emit('message:reactionRemoved', updatedMessage);
      return updatedMessage;
    } catch (error) {
      console.error('Erreur lors de la suppression de la réaction:', error);
      throw error;
    }
  }

  async updateConversationLastMessage(conversationId, message) {
    try {
      await api.patch(`/conversations/${conversationId}`, {
        lastMessage: {
          id: message.id,
          content: message.content,
          senderId: message.senderId,
          timestamp: message.timestamp,
          type: message.type
        },
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la conversation:', error);
    }
  }

  async updateUnreadCount(conversationId, userId, count) {
    try {
      const conversation = await api.get(`/conversations/${conversationId}`);
      const unreadCount = { ...conversation.unreadCount };
      unreadCount[userId] = count;

      await api.patch(`/conversations/${conversationId}`, { unreadCount });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du compteur:', error);
    }
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

export const messageService = new MessageService();