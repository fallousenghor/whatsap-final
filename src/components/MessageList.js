import { formatTime, formatDate, groupMessagesByDate } from '../utils/dateUtils.js';
import { MESSAGE_STATUS, EMOJI_REACTIONS } from '../config/constants.js';
import { userService } from '../services/userService.js';
import { messageService } from '../services/messageService.js';
import { eventBus } from '../utils/eventBus.js';

export class MessageList {
  constructor(container) {
    this.container = container;
    this.messages = [];
    this.currentConversation = null;
    this.selectedMessages = new Set();
    this.isSelectionMode = false;
  }

  render(messages, conversation) {
    this.messages = messages;
    this.currentConversation = conversation;
    
    if (!messages.length) {
      this.container.innerHTML = this.renderEmpty();
      return;
    }

    const groupedMessages = groupMessagesByDate(messages);
    this.container.innerHTML = `
      <div class="messages-container">
        <div class="messages-wrapper">
          ${this.renderMessages(groupedMessages)}
        </div>
      </div>
    `;
    
    this.attachEventListeners();
    this.scrollToBottom();
  }

  renderEmpty() {
    return `
      <div class="messages-container">
        <div class="messages-wrapper">
          <div class="flex items-center justify-center">
            <div class="text-center text-gray-400">
              <i class="fas fa-comment-dots text-4xl mb-4"></i>
              <p>Aucun message dans cette conversation</p>
              <p class="text-sm mt-2">Envoyez le premier message !</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderMessages(groupedMessages) {
    const currentUser = userService.getCurrentUser();
    let html = '';

    Object.entries(groupedMessages).forEach(([date, dayMessages]) => {
      html += `
        <div class="text-center mb-6">
          <span class="bg-gray-700 px-3 py-1 rounded-full text-xs text-gray-300">
            ${formatDate(date)}
          </span>
        </div>
      `;

      dayMessages.forEach((message, index) => {
        const isOwn = message.senderId === currentUser.id;
        const showAvatar = !isOwn && (index === 0 || dayMessages[index - 1].senderId !== message.senderId);
        
        html += this.renderMessage(message, isOwn, showAvatar);
      });
    });

    return html;
  }

  renderMessage(message, isOwn, showAvatar) {
    const time = formatTime(message.timestamp);
    const isSelected = this.selectedMessages.has(message.id);
    
    if (message.isDeleted) {
      return this.renderDeletedMessage(message, isOwn, time);
    }

    if (isOwn) {
      return this.renderOwnMessage(message, time, isSelected);
    } else {
      return this.renderReceivedMessage(message, time, showAvatar, isSelected);
    }
  }

  renderOwnMessage(message, time, isSelected) {
    const replyContent = message.replyTo ? this.renderReplyPreview(message.replyTo) : '';
    const reactions = this.renderReactions(message.reactions);
    
    return `
      <div class="flex justify-end mb-4 group ${isSelected ? 'bg-blue-100' : ''}" 
           data-message-id="${message.id}">
        <div class="message-bubble message-sent relative">
          ${replyContent}
          ${this.renderMessageContent(message)}
          <div class="flex items-center justify-end mt-1">
            ${message.isEdited ? '<span class="text-xs text-green-200 mr-1">modifié</span>' : ''}
            <span class="message-time">${time}</span>
            <i class="fas fa-check-double ${this.getStatusIcon(message.status)} ml-1"></i>
          </div>
          ${reactions}
          ${this.renderMessageActions(message, true)}
        </div>
      </div>
    `;
  }

  renderReceivedMessage(message, time, showAvatar, isSelected) {
    const replyContent = message.replyTo ? this.renderReplyPreview(message.replyTo) : '';
    const reactions = this.renderReactions(message.reactions);
    const avatar = showAvatar ? this.renderAvatar() : '<div class="w-8"></div>';
    
    return `
      <div class="flex items-start space-x-2 mb-4 group ${isSelected ? 'bg-blue-100' : ''}" 
           data-message-id="${message.id}">
        ${avatar}
        <div class="message-bubble message-received relative">
          ${replyContent}
          ${this.renderMessageContent(message)}
          <div class="flex items-center mt-1">
            <span class="message-time">${time}</span>
          </div>
          ${reactions}
          ${this.renderMessageActions(message, false)}
        </div>
      </div>
    `;
  }

  renderDeletedMessage(message, isOwn, time) {
    return `
      <div class="flex ${isOwn ? 'justify-end' : 'items-start space-x-2'} mb-4">
        ${!isOwn ? '<div class="w-8"></div>' : ''}
        <div class="message-bubble bg-gray-600 p-3 max-w-xs lg:max-w-md italic">
          <p class="text-sm text-gray-300">
            <i class="fas fa-ban mr-2"></i>
            Ce message a été supprimé
          </p>
          <span class="text-xs text-gray-400">${time}</span>
        </div>
      </div>
    `;
  }

  renderMessageContent(message) {
    switch (message.type) {
      case 'text':
        return `<p class="text-sm text-white break-words">${this.escapeHtml(message.content)}</p>`;
      case 'image':
        return `
          <div class="mb-2">
            <img src="${message.content}" alt="Image" class="max-w-full rounded cursor-pointer" 
                 onclick="openImageViewer('${message.content}')">
          </div>
        `;
      case 'video':
        return `
          <div class="mb-2">
            <video controls class="max-w-full rounded">
              <source src="${message.content}" type="video/mp4">
            </video>
          </div>
        `;
      case 'audio':
        return `
          <div class="mb-2">
            <audio controls class="w-full">
              <source src="${message.content}" type="audio/mpeg">
            </audio>
          </div>
        `;
      case 'document':
        return `
          <div class="flex items-center space-x-2 mb-2">
            <i class="fas fa-file text-blue-400"></i>
            <a href="${message.content}" download class="text-blue-400 hover:underline">
              ${message.fileName || 'Document'}
            </a>
          </div>
        `;
      default:
        return `<p class="text-sm text-white">${this.escapeHtml(message.content)}</p>`;
    }
  }

  renderReplyPreview(replyTo) {
    // Trouver le message original
    const originalMessage = this.messages.find(m => m.id === replyTo);
    if (!originalMessage) return '';

    return `
      <div class="border-l-4 border-blue-400 pl-2 mb-2 bg-gray-600 p-2 rounded">
        <p class="text-xs text-blue-400">${originalMessage.senderName || 'Utilisateur'}</p>
        <p class="text-xs text-gray-300">${originalMessage.content.substring(0, 50)}...</p>
      </div>
    `;
  }

  renderReactions(reactions) {
    if (!reactions || Object.keys(reactions).length === 0) return '';

    const reactionElements = Object.entries(reactions).map(([emoji, userIds]) => 
      `<span class="reaction-item cursor-pointer" data-emoji="${emoji}">
        ${emoji} ${userIds.length}
      </span>`
    ).join('');

    return `
      <div class="reactions flex space-x-1 mt-2">
        ${reactionElements}
      </div>
    `;
  }

  renderMessageActions(message, isOwn) {
    return `
      <div class="message-actions absolute top-0 right-0 transform translate-x-full opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 rounded-lg shadow-lg p-1 flex space-x-1">
        <button class="p-1 hover:bg-gray-700 rounded" data-action="react" title="Réagir">
          <i class="fas fa-smile text-xs"></i>
        </button>
        <button class="p-1 hover:bg-gray-700 rounded" data-action="reply" title="Répondre">
          <i class="fas fa-reply text-xs"></i>
        </button>
        <button class="p-1 hover:bg-gray-700 rounded" data-action="forward" title="Transférer">
          <i class="fas fa-share text-xs"></i>
        </button>
        ${isOwn ? `
          <button class="p-1 hover:bg-gray-700 rounded" data-action="edit" title="Modifier">
            <i class="fas fa-edit text-xs"></i>
          </button>
        ` : ''}
        <button class="p-1 hover:bg-gray-700 rounded" data-action="delete" title="Supprimer">
          <i class="fas fa-trash text-xs"></i>
        </button>
        <button class="p-1 hover:bg-gray-700 rounded" data-action="select" title="Sélectionner">
          <i class="fas fa-check text-xs"></i>
        </button>
      </div>
    `;
  }

  renderAvatar() {
    const conversation = this.currentConversation;
    if (conversation.avatar) {
      return `
        <div class="avatar bg-blue-500">
          <img src="${conversation.avatar}" alt="${conversation.name}" class="w-full h-full object-cover rounded-full">
        </div>
      `;
    }
    
    const initials = conversation.name.split(' ').map(n => n[0]).join('').toUpperCase();
    return `<div class="avatar bg-blue-500 text-xs">${initials}</div>`;
  }

  getStatusIcon(status) {
    switch (status) {
      case MESSAGE_STATUS.SENT:
        return 'text-gray-400';
      case MESSAGE_STATUS.DELIVERED:
        return 'text-blue-300';
      case MESSAGE_STATUS.READ:
        return 'text-blue-400';
      default:
        return 'text-gray-400';
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  attachEventListeners() {
    this.container.addEventListener('click', async (e) => {
      const messageElement = e.target.closest('[data-message-id]');
      if (!messageElement) return;

      const messageId = messageElement.dataset.messageId;
      const action = e.target.closest('[data-action]')?.dataset.action;

      if (!action) return;

      switch (action) {
        case 'react':
          this.showReactionPicker(messageId, e.target);
          break;
        case 'reply':
          eventBus.emit('message:reply', messageId);
          break;
        case 'forward':
          eventBus.emit('message:forward', messageId);
          break;
        case 'edit':
          eventBus.emit('message:edit', messageId);
          break;
        case 'delete':
          this.showDeleteOptions(messageId);
          break;
        case 'select':
          this.toggleMessageSelection(messageId);
          break;
      }
    });

    // Gestion des réactions
    this.container.addEventListener('click', (e) => {
      if (e.target.classList.contains('reaction-item')) {
        const emoji = e.target.dataset.emoji;
        const messageId = e.target.closest('[data-message-id]').dataset.messageId;
        this.toggleReaction(messageId, emoji);
      }
    });
  }

  showReactionPicker(messageId, target) {
    const picker = document.createElement('div');
    picker.className = 'reaction-picker absolute bg-gray-800 rounded-lg shadow-lg p-2 flex space-x-2 z-50';
    picker.innerHTML = EMOJI_REACTIONS.map(emoji => 
      `<button class="hover:bg-gray-700 p-1 rounded" data-emoji="${emoji}">${emoji}</button>`
    ).join('');

    // Positionner le picker
    const rect = target.getBoundingClientRect();
    picker.style.top = `${rect.top - 50}px`;
    picker.style.left = `${rect.left}px`;

    document.body.appendChild(picker);

    // Gérer les clics sur les emojis
    picker.addEventListener('click', async (e) => {
      const emoji = e.target.dataset.emoji;
      if (emoji) {
        await this.toggleReaction(messageId, emoji);
        picker.remove();
      }
    });

    // Fermer en cliquant ailleurs
    setTimeout(() => {
      document.addEventListener('click', function closeReactionPicker(e) {
        if (!picker.contains(e.target)) {
          picker.remove();
          document.removeEventListener('click', closeReactionPicker);
        }
      });
    }, 100);
  }

  async toggleReaction(messageId, emoji) {
    try {
      const message = this.messages.find(m => m.id === messageId);
      const currentUser = userService.getCurrentUser();
      
      if (message.reactions[emoji]?.includes(currentUser.id)) {
        await messageService.removeReaction(messageId, emoji);
      } else {
        await messageService.addReaction(messageId, emoji);
      }
    } catch (error) {
      console.error('Erreur lors de la gestion de la réaction:', error);
    }
  }

  showDeleteOptions(messageId) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4">
        <h3 class="text-white text-lg font-medium mb-4">Supprimer le message</h3>
        <div class="space-y-3">
          <button class="w-full text-left p-3 hover:bg-gray-700 rounded text-white" data-action="delete-for-me">
            Supprimer pour moi
          </button>
          <button class="w-full text-left p-3 hover:bg-gray-700 rounded text-white" data-action="delete-for-everyone">
            Supprimer pour tout le monde
          </button>
        </div>
        <button class="w-full mt-4 p-3 bg-gray-600 hover:bg-gray-500 rounded text-white" data-action="cancel">
          Annuler
        </button>
      </div>
    `;

    document.body.appendChild(modal);

    modal.addEventListener('click', async (e) => {
      const action = e.target.dataset.action;
      if (action === 'delete-for-me') {
        await messageService.deleteMessage(messageId, false);
      } else if (action === 'delete-for-everyone') {
        await messageService.deleteMessage(messageId, true);
      }
      modal.remove();
    });
  }

  toggleMessageSelection(messageId) {
    if (this.selectedMessages.has(messageId)) {
      this.selectedMessages.delete(messageId);
    } else {
      this.selectedMessages.add(messageId);
    }

    this.isSelectionMode = this.selectedMessages.size > 0;
    eventBus.emit('messages:selectionChanged', {
      selectedCount: this.selectedMessages.size,
      isSelectionMode: this.isSelectionMode
    });

    // Mettre à jour l'affichage
    this.updateSelectionDisplay();
  }

  updateSelectionDisplay() {
    this.container.querySelectorAll('[data-message-id]').forEach(element => {
      const messageId = element.dataset.messageId;
      if (this.selectedMessages.has(messageId)) {
        element.classList.add('bg-blue-100');
      } else {
        element.classList.remove('bg-blue-100');
      }
    });
  }

  scrollToBottom() {
    const scrollContainer = this.container.querySelector('#messages-scroll');
    if (scrollContainer) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  }

  addMessage(message) {
    this.messages.push(message);
    // Re-render seulement si nécessaire
    this.render(this.messages, this.currentConversation);
  }

  updateMessage(updatedMessage) {
    const index = this.messages.findIndex(m => m.id === updatedMessage.id);
    if (index !== -1) {
      this.messages[index] = updatedMessage;
      this.render(this.messages, this.currentConversation);
    }
  }
}