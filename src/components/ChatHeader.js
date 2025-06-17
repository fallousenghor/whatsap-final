import { formatLastSeen } from '../utils/dateUtils.js';
import { eventBus } from '../utils/eventBus.js';

export class ChatHeader {
  constructor(container) {
    this.container = container;
    this.currentConversation = null;
  }

  render(conversation) {
    this.currentConversation = conversation;
    
    if (!conversation) {
      this.container.innerHTML = this.renderEmpty();
      return;
    }

    this.container.innerHTML = this.renderHeader(conversation);
    this.attachEventListeners();
  }

  renderEmpty() {
    return `
      <div class="bg-gray-800 p-4 border-b border-gray-700 flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="avatar bg-gray-500">
            <i class="fas fa-user"></i>
          </div>
          <div>
            <h2 class="font-medium text-white">Sélectionnez une conversation</h2>
            <p class="text-xs text-gray-400"></p>
          </div>
        </div>
        <div class="flex space-x-2">
          <button class="p-2 hover:bg-gray-700 rounded" disabled>
            <i class="fas fa-search text-gray-600"></i>
          </button>
          <button class="p-2 hover:bg-gray-700 rounded" disabled>
            <i class="fas fa-ellipsis-v text-gray-600"></i>
          </button>
        </div>
      </div>
    `;
  }

  renderHeader(conversation) {
    const isOnline = conversation.isOnline;
    const statusText = isOnline ? 'en ligne' : formatLastSeen(conversation.lastSeen);
    const avatarContent = conversation.avatar 
      ? `<img src="${conversation.avatar}" alt="${conversation.name}" class="w-full h-full object-cover rounded-full">`
      : this.getInitials(conversation.name);

    return `
      <div class="bg-gray-800 p-4 border-b border-gray-700 flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="avatar bg-blue-500 relative cursor-pointer" data-action="show-profile">
            ${avatarContent}
            ${isOnline ? '<div class="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-gray-800 rounded-full"></div>' : ''}
          </div>
          <div class="cursor-pointer" data-action="show-profile">
            <h2 class="font-medium text-white">${conversation.name}</h2>
            <p class="text-xs ${isOnline ? 'text-green-400' : 'text-gray-400'}">${statusText}</p>
          </div>
        </div>
        <div class="flex space-x-2">
          <button class="p-2 hover:bg-gray-700 rounded" data-action="search">
            <i class="fas fa-search text-gray-400"></i>
          </button>
          <button class="p-2 hover:bg-gray-700 rounded" data-action="video-call">
            <i class="fas fa-video text-gray-400"></i>
          </button>
          <button class="p-2 hover:bg-gray-700 rounded" data-action="voice-call">
            <i class="fas fa-phone text-gray-400"></i>
          </button>
          <button class="p-2 hover:bg-gray-700 rounded" data-action="menu">
            <i class="fas fa-ellipsis-v text-gray-400"></i>
          </button>
        </div>
      </div>
    `;
  }

  getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  attachEventListeners() {
    this.container.addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      if (!action || !this.currentConversation) return;

      switch (action) {
        case 'show-profile':
          eventBus.emit('chat:showProfile', this.currentConversation);
          break;
        case 'search':
          eventBus.emit('chat:toggleSearch');
          break;
        case 'video-call':
          eventBus.emit('call:start', { 
            conversationId: this.currentConversation.id, 
            type: 'video' 
          });
          break;
        case 'voice-call':
          eventBus.emit('call:start', { 
            conversationId: this.currentConversation.id, 
            type: 'voice' 
          });
          break;
        case 'menu':
          eventBus.emit('chat:showMenu', this.currentConversation);
          break;
      }
    });
  }
}