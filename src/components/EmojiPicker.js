export class EmojiPicker {
  constructor() {
    this.picker = null;
    this.isVisible = false;
    this.emojis = [
      '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
      '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
      '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩',
      '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
      '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬',
      '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗',
      '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯',
      '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐',
      '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈',
      '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾',
      '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿',
      '😾', '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤏', '✌️', '🤞',
      '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍',
      '👎', '👊', '✊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝',
      '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂',
      '🦻', '👃', '🧠', '🦷', '🦴', '👀', '👁️', '👅', '👄', '💋'
    ];
    this.categories = {
      'Smileys': ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇'],
      'Gestures': ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟'],
      'Hearts': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔'],
      'Objects': ['📱', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '💽', '💾', '💿']
    };
  }

  show(targetElement, onEmojiSelect) {
    if (this.isVisible) {
      this.hide();
      return;
    }

    this.createPicker(targetElement, onEmojiSelect);
    this.isVisible = true;
  }

  hide() {
    if (this.picker) {
      document.body.removeChild(this.picker);
      this.picker = null;
      this.isVisible = false;
    }
  }

  createPicker(targetElement, onEmojiSelect) {
    this.picker = document.createElement('div');
    this.picker.className = 'fixed z-50 bg-gray-800 rounded-lg shadow-lg border border-gray-600 p-4 max-w-xs';
    
    // Positionner le picker
    const rect = targetElement.getBoundingClientRect();
    this.picker.style.bottom = `${window.innerHeight - rect.top + 10}px`;
    this.picker.style.left = `${rect.left}px`;

    this.picker.innerHTML = `
      <div class="emoji-picker-header mb-3">
        <div class="flex space-x-2">
          ${Object.keys(this.categories).map(category => `
            <button class="category-btn px-2 py-1 text-xs text-gray-400 hover:text-white rounded" data-category="${category}">
              ${category}
            </button>
          `).join('')}
        </div>
      </div>
      
      <div class="emoji-grid grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
        ${this.emojis.map(emoji => `
          <button class="emoji-btn p-1 hover:bg-gray-700 rounded text-lg" data-emoji="${emoji}">
            ${emoji}
          </button>
        `).join('')}
      </div>
    `;

    document.body.appendChild(this.picker);

    // Événements
    this.picker.addEventListener('click', (e) => {
      const emojiBtn = e.target.closest('.emoji-btn');
      const categoryBtn = e.target.closest('.category-btn');

      if (emojiBtn) {
        const emoji = emojiBtn.dataset.emoji;
        onEmojiSelect(emoji);
        this.hide();
      } else if (categoryBtn) {
        this.showCategory(categoryBtn.dataset.category);
      }
    });

    // Fermer en cliquant à l'extérieur
    setTimeout(() => {
      document.addEventListener('click', this.handleOutsideClick.bind(this));
    }, 100);
  }

  showCategory(category) {
    const grid = this.picker.querySelector('.emoji-grid');
    const emojis = this.categories[category] || this.emojis;
    
    grid.innerHTML = emojis.map(emoji => `
      <button class="emoji-btn p-1 hover:bg-gray-700 rounded text-lg" data-emoji="${emoji}">
        ${emoji}
      </button>
    `).join('');
  }

  handleOutsideClick(e) {
    if (this.picker && !this.picker.contains(e.target)) {
      this.hide();
      document.removeEventListener('click', this.handleOutsideClick.bind(this));
    }
  }
}