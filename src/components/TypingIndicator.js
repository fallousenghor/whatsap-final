export class TypingIndicator {
  constructor(container) {
    this.container = container;
    this.typingUsers = new Map();
    this.indicator = null;
  }

  showTyping(userId, userName) {
    this.typingUsers.set(userId, userName);
    this.updateIndicator();
  }

  hideTyping(userId) {
    this.typingUsers.delete(userId);
    this.updateIndicator();
  }

  updateIndicator() {
    if (this.typingUsers.size === 0) {
      this.removeIndicator();
      return;
    }

    if (!this.indicator) {
      this.createIndicator();
    }

    const userNames = Array.from(this.typingUsers.values());
    let text = '';

    if (userNames.length === 1) {
      text = `${userNames[0]} est en train d'écrire...`;
    } else if (userNames.length === 2) {
      text = `${userNames[0]} et ${userNames[1]} sont en train d'écrire...`;
    } else {
      text = `${userNames.length} personnes sont en train d'écrire...`;
    }

    this.indicator.querySelector('.typing-text').textContent = text;
  }

  createIndicator() {
    this.indicator = document.createElement('div');
    this.indicator.className = 'typing-indicator flex items-center space-x-2 p-3 bg-gray-750 border-t border-gray-700';
    
    this.indicator.innerHTML = `
      <div class="flex items-center space-x-1">
        <div class="typing-avatar w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
          <i class="fas fa-user text-white text-xs"></i>
        </div>
        <span class="typing-text text-gray-400 text-sm"></span>
      </div>
      
      <div class="typing-dots flex space-x-1">
        <div class="dot w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
        <div class="dot w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
        <div class="dot w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
      </div>
    `;

    this.container.appendChild(this.indicator);
  }

  removeIndicator() {
    if (this.indicator) {
      this.container.removeChild(this.indicator);
      this.indicator = null;
    }
  }
}