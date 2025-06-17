import { formatTime, formatLastSeen } from '../utils/dateUtils.js';
import { conversationService } from '../services/conversationService.js';
import { userService } from '../services/userService.js';
import { eventBus } from '../utils/eventBus.js';

export class ConversationList {
  constructor(container) {
    this.container = container;
    this.conversations = [];
    this.filteredConversations = [];
    this.currentFilter = 'all';
    this.searchTerm = '';
  }

  async render() {
    try {
      this.conversations = await conversationService.getConversations();
      this.applyFilters();
      this.updateDisplay();
      this.attachEventListeners();
    } catch (error) {
      console.error('Erreur lors du chargement des conversations:', error);
      this.renderError();
    }
  }

  applyFilters() {
    let filtered = [...this.conversations];

    // Filtrer par type
    switch (this.currentFilter) {
      case 'unread':
        const currentUser = userService.getCurrentUser();
        filtered = filtered.filter(conv => 
          conv.unreadCount[currentUser.id] > 0
        );
        break;
      case 'favorites':
        filtered = filtered.filter(conv => conv.isFavorite);
        break;
      case 'groups':
        filtered = filtered.filter(conv => conv.type === 'group');
        break;
      case 'archived':
        filtered = filtered.filter(conv => conv.isArchived);
        break;
    }

    // Filtrer par recherche
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(conv =>
        conv.name.toLowerCase().includes(term) ||
        (conv.lastMessage?.content || '').toLowerCase().includes(term)
      );
    }

    this.filteredConversations = filtered;
  }

  updateDisplay() {
    if (this.filteredConversations.length === 0) {
      this.renderEmpty();
      return;
    }

    this.container.innerHTML = this.renderConversations();
  }

  renderConversations() {
    const currentUser = userService.getCurrentUser();
    
    return this.filteredConversations.map(conversation => {
      const unreadCount = conversation.unreadCount[currentUser.id] || 0;
      const lastMessage = conversation.lastMessage;
      const time = lastMessage ? formatTime(lastMessage.timestamp) : '';
      
      return `
        <div class="conversation-item p-4 hover:bg-gray-700 cursor-pointer border-l-4 ${
          unreadCount > 0 ? 'border-green-500 bg-gray-750' : 'border-transparent'
        }" data-conversation-id="${conversation.id}">
          <div class="flex items-center space-x-3">
            <div class="relative">
              ${this.renderAvatar(conversation)}
              ${conversation.isOnline ? `
                <div class="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-gray-800 rounded-full"></div>
              ` : ''}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex justify-between items-start">
                <h3 class="font-medium text-white truncate">${conversation.name}</h3>
                <div class="flex items-center space-x-2">
                  ${time ? `<span class="text-xs text-gray-400">${time}</span>` : ''}
                  ${unreadCount > 0 ? `
                    <span class="bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      ${unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  ` : ''}
                </div>
              </div>
              <div class="flex items-center space-x-1">
                ${this.renderLastMessage(lastMessage, currentUser.id)}
              </div>
              ${conversation.isMuted ? `
                <div class="flex items-center space-x-1 mt-1">
                  <i class="fas fa-volume-mute text-gray-500 text-xs"></i>
                  <span class="text-xs text-gray-500">Silencieux</span>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  renderAvatar(conversation) {
    if (conversation.avatar) {
      return `
        <div class="avatar">
          <img src="${conversation.avatar}" alt="${conversation.name}" 
               class="w-full h-full object-cover rounded-full">
        </div>
      `;
    }

    const initials = conversation.name.split(' ').map(n => n[0]).join('').toUpperCase();
    const bgColor = conversation.type === 'group' ? 'bg-green-500' : 'bg-blue-500';
    
    return `<div class="avatar ${bgColor}">${initials}</div>`;
  }

  renderLastMessage(lastMessage, currentUserId) {
    if (!lastMessage) {
      return '<p class="text-sm text-gray-400">Aucun message</p>';
    }

    const isOwn = lastMessage.senderId === currentUserId;
    const statusIcon = isOwn ? this.getStatusIcon(lastMessage.status) : '';
    const content = this.getMessagePreview(lastMessage);

    return `
      <p class="text-sm text-gray-400 flex items-center truncate">
        ${statusIcon}
        ${content}
      </p>
    `;
  }

  getMessagePreview(message) {
    switch (message.type) {
      case 'text':
        return message.content.length > 30 
          ? message.content.substring(0, 30) + '...'
          : message.content;
      case 'image':
        return '📷 Photo';
      case 'video':
        return '🎥 Vidéo';
      case 'audio':
        return '🎵 Audio';
      case 'document':
        return '📄 Document';
      case 'location':
        return '📍 Position';
      case 'contact':
        return '👤 Contact';
      default:
        return 'Message';
    }
  }

  getStatusIcon(status) {
    switch (status) {
      case 'sent':
        return '<i class="fas fa-check text-gray-400 mr-1"></i>';
      case 'delivered':
        return '<i class="fas fa-check-double text-blue-300 mr-1"></i>';
      case 'read':
        return '<i class="fas fa-check-double text-blue-400 mr-1"></i>';
      default:
        return '';
    }
  }

  renderEmpty() {
    const emptyMessage = this.getEmptyMessage();
    this.container.innerHTML = `
      <div class="text-center p-8 text-gray-400">
        <i class="fas fa-comments text-4xl mb-4"></i>
        <p>${emptyMessage}</p>
        <p class="text-sm mt-2">Commencez une nouvelle conversation</p>
      </div>
    `;
  }

  renderError() {
    this.container.innerHTML = `
      <div class="text-center p-8 text-red-400">
        <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
        <p>Erreur lors du chargement des conversations</p>
        <button class="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700" 
                onclick="location.reload()">
          Réessayer
        </button>
      </div>
    `;
  }

  getEmptyMessage() {
    switch (this.currentFilter) {
      case 'unread':
        return 'Aucun message non lu';
      case 'favorites':
        return 'Aucune conversation favorite';
      case 'groups':
        return 'Aucun groupe';
      case 'archived':
        return 'Aucune conversation archivée';
      default:
        return 'Aucune conversation';
    }
  }

  attachEventListeners() {
    // Clic sur une conversation
    this.container.addEventListener('click', (e) => {
      const conversationItem = e.target.closest('.conversation-item');
      if (!conversationItem) return;

      const conversationId = conversationItem.dataset.conversationId;
      const conversation = this.conversations.find(c => c.id === conversationId);
      
      if (conversation) {
        // Marquer comme sélectionné
        this.container.querySelectorAll('.conversation-item').forEach(item => {
          item.classList.remove('border-green-500', 'bg-gray-750');
          item.classList.add('border-transparent');
        });
        
        conversationItem.classList.remove('border-transparent');
        conversationItem.classList.add('border-green-500', 'bg-gray-750');

        eventBus.emit('conversation:selected', conversation);
      }
    });

    // Menu contextuel (clic droit)
    this.container.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const conversationItem = e.target.closest('.conversation-item');
      if (!conversationItem) return;

      const conversationId = conversationItem.dataset.conversationId;
      this.showContextMenu(conversationId, e.clientX, e.clientY);
    });
  }

  showContextMenu(conversationId, x, y) {
    const conversation = this.conversations.find(c => c.id === conversationId);
    if (!conversation) return;

    const menu = document.createElement('div');
    menu.className = 'fixed bg-gray-800 rounded-lg shadow-lg py-2 z-50 min-w-48';
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;

    menu.innerHTML = `
      <button class="w-full text-left px-4 py-2 hover:bg-gray-700 text-white" data-action="mark-read">
        <i class="fas fa-check mr-2"></i>
        Marquer comme lu
      </button>
      <button class="w-full text-left px-4 py-2 hover:bg-gray-700 text-white" data-action="toggle-favorite">
        <i class="fas fa-heart mr-2"></i>
        ${conversation.isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      </button>
      <button class="w-full text-left px-4 py-2 hover:bg-gray-700 text-white" data-action="mute">
        <i class="fas fa-volume-mute mr-2"></i>
        ${conversation.isMuted ? 'Réactiver' : 'Mettre en sourdine'}
      </button>
      <button class="w-full text-left px-4 py-2 hover:bg-gray-700 text-white" data-action="archive">
        <i class="fas fa-archive mr-2"></i>
        ${conversation.isArchived ? 'Désarchiver' : 'Archiver'}
      </button>
      <hr class="border-gray-600 my-1">
      <button class="w-full text-left px-4 py-2 hover:bg-gray-700 text-red-400" data-action="delete">
        <i class="fas fa-trash mr-2"></i>
        Supprimer la conversation
      </button>
    `;

    document.body.appendChild(menu);

    // Gérer les clics sur le menu
    menu.addEventListener('click', async (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      if (action) {
        await this.handleContextMenuAction(action, conversationId);
        menu.remove();
      }
    });

    // Fermer le menu en cliquant ailleurs
    setTimeout(() => {
      document.addEventListener('click', function closeMenu() {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      });
    }, 100);
  }

  async handleContextMenuAction(action, conversationId) {
    try {
      switch (action) {
        case 'mark-read':
          // Marquer tous les messages comme lus
          eventBus.emit('conversation:markAsRead', conversationId);
          break;
        case 'toggle-favorite':
          // Basculer le statut favori
          break;
        case 'mute':
          // Mettre en sourdine/réactiver
          break;
        case 'archive':
          // Archiver/désarchiver
          break;
        case 'delete':
          if (confirm('Êtes-vous sûr de vouloir supprimer cette conversation ?')) {
            await conversationService.deleteConversation(conversationId);
            this.render();
          }
          break;
      }
    } catch (error) {
      console.error('Erreur lors de l\'action:', error);
    }
  }

  setFilter(filter) {
    this.currentFilter = filter;
    this.applyFilters();
    this.updateDisplay();
  }

  setSearchTerm(term) {
    this.searchTerm = term;
    this.applyFilters();
    this.updateDisplay();
  }

  refresh() {
    this.render();
  }

  addConversation(conversation) {
    this.conversations.unshift(conversation);
    this.applyFilters();
    this.updateDisplay();
  }

  updateConversation(updatedConversation) {
    const index = this.conversations.findIndex(c => c.id === updatedConversation.id);
    if (index !== -1) {
      this.conversations[index] = updatedConversation;
      // Déplacer en haut de la liste
      this.conversations.unshift(this.conversations.splice(index, 1)[0]);
      this.applyFilters();
      this.updateDisplay();
    }
  }

  removeConversation(conversationId) {
    this.conversations = this.conversations.filter(c => c.id !== conversationId);
    this.applyFilters();
    this.updateDisplay();
  }
}