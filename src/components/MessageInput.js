import { messageService } from '../services/messageService.js';
import { MESSAGE_TYPES } from '../config/constants.js';
import { eventBus } from '../utils/eventBus.js';

export class MessageInput {
  constructor(container) {
    this.container = container;
    this.currentConversation = null;
    this.replyToMessage = null;
    this.isRecording = false;
    this.mediaRecorder = null;
  }

  render(conversation) {
    this.currentConversation = conversation;
    
    if (!conversation) {
      this.container.innerHTML = this.renderDisabled();
      return;
    }

    this.container.innerHTML = this.renderInput();
    this.attachEventListeners();
  }

  renderDisabled() {
    return `
      <div class="bg-gray-800 p-4 border-t border-gray-700">
        <div class="flex items-center space-x-3">
          <button class="p-2 hover:bg-gray-700 rounded-full" disabled>
            <i class="fas fa-smile text-gray-600"></i>
          </button>
          <button class="p-2 hover:bg-gray-700 rounded-full" disabled>
            <i class="fas fa-paperclip text-gray-600"></i>
          </button>
          <div class="flex-1 relative">
            <input
              type="text"
              placeholder="Sélectionnez une conversation"
              class="w-full bg-gray-700 text-white px-4 py-2 rounded-full border border-gray-600 focus:outline-none focus:border-gray-500"
              disabled
            />
          </div>
          <button class="p-2 bg-gray-600 rounded-full" disabled>
            <i class="fas fa-paper-plane text-gray-400"></i>
          </button>
        </div>
      </div>
    `;
  }

  renderInput() {
    const replyPreview = this.replyToMessage ? this.renderReplyPreview() : '';
    
    return `
      <div class="bg-gray-800 border-t border-gray-700">
        ${replyPreview}
        <div class="p-4">
          <div class="flex items-center space-x-3">
            <button class="p-2 hover:bg-gray-700 rounded-full" data-action="emoji">
              <i class="fas fa-smile text-gray-400"></i>
            </button>
            <button class="p-2 hover:bg-gray-700 rounded-full" data-action="attach">
              <i class="fas fa-paperclip text-gray-400"></i>
            </button>
            <div class="flex-1 relative">
              <input
                type="text"
                id="message-input"
                placeholder="Entrez un message"
                class="w-full bg-gray-700 text-white px-4 py-2 rounded-full border border-gray-600 focus:outline-none focus:border-gray-500"
                maxlength="4096"
              />
              <div class="absolute right-3 top-1/2 transform -translate-y-1/2">
                <button class="p-1 hover:bg-gray-600 rounded-full" data-action="voice" title="Message vocal">
                  <i class="fas fa-microphone text-gray-400"></i>
                </button>
              </div>
            </div>
            <button id="send-button" class="p-2 bg-green-600 hover:bg-green-700 rounded-full transition-colors" data-action="send">
              <i class="fas fa-paper-plane text-white"></i>
            </button>
          </div>
        </div>
      </div>
      
      <!-- Attachment Menu -->
      <div id="attachment-menu" class="hidden absolute bottom-20 left-4 bg-gray-800 rounded-lg shadow-lg p-2 space-y-2">
        <button class="flex items-center space-x-3 w-full p-3 hover:bg-gray-700 rounded" data-action="attach-image">
          <i class="fas fa-image text-blue-400"></i>
          <span class="text-white">Photo</span>
        </button>
        <button class="flex items-center space-x-3 w-full p-3 hover:bg-gray-700 rounded" data-action="attach-video">
          <i class="fas fa-video text-green-400"></i>
          <span class="text-white">Vidéo</span>
        </button>
        <button class="flex items-center space-x-3 w-full p-3 hover:bg-gray-700 rounded" data-action="attach-document">
          <i class="fas fa-file text-yellow-400"></i>
          <span class="text-white">Document</span>
        </button>
        <button class="flex items-center space-x-3 w-full p-3 hover:bg-gray-700 rounded" data-action="attach-contact">
          <i class="fas fa-user text-purple-400"></i>
          <span class="text-white">Contact</span>
        </button>
        <button class="flex items-center space-x-3 w-full p-3 hover:bg-gray-700 rounded" data-action="attach-location">
          <i class="fas fa-map-marker-alt text-red-400"></i>
          <span class="text-white">Position</span>
        </button>
      </div>

      <!-- Hidden file inputs -->
      <input type="file" id="image-input" accept="image/*" multiple class="hidden">
      <input type="file" id="video-input" accept="video/*" class="hidden">
      <input type="file" id="document-input" accept="*/*" class="hidden">
    `;
  }

  renderReplyPreview() {
    return `
      <div class="px-4 py-2 bg-gray-700 border-b border-gray-600">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <div class="w-1 h-8 bg-green-500 rounded"></div>
            <div>
              <p class="text-xs text-green-400">Répondre à ${this.replyToMessage.senderName}</p>
              <p class="text-sm text-gray-300">${this.replyToMessage.content.substring(0, 50)}...</p>
            </div>
          </div>
          <button class="p-1 hover:bg-gray-600 rounded" data-action="cancel-reply">
            <i class="fas fa-times text-gray-400"></i>
          </button>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    const messageInput = this.container.querySelector('#message-input');
    const sendButton = this.container.querySelector('#send-button');
    const attachmentMenu = this.container.querySelector('#attachment-menu');

    // Envoi de message
    sendButton?.addEventListener('click', () => this.sendMessage());
    messageInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Gestion des actions
    this.container.addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      if (!action) return;

      switch (action) {
        case 'emoji':
          this.showEmojiPicker();
          break;
        case 'attach':
          attachmentMenu?.classList.toggle('hidden');
          break;
        case 'voice':
          this.toggleVoiceRecording();
          break;
        case 'cancel-reply':
          this.cancelReply();
          break;
        case 'attach-image':
          this.container.querySelector('#image-input')?.click();
          break;
        case 'attach-video':
          this.container.querySelector('#video-input')?.click();
          break;
        case 'attach-document':
          this.container.querySelector('#document-input')?.click();
          break;
        case 'attach-contact':
          this.showContactPicker();
          break;
        case 'attach-location':
          this.shareLocation();
          break;
      }
    });

    // Gestion des fichiers
    this.container.querySelector('#image-input')?.addEventListener('change', (e) => {
      this.handleFileUpload(e.target.files, MESSAGE_TYPES.IMAGE);
    });

    this.container.querySelector('#video-input')?.addEventListener('change', (e) => {
      this.handleFileUpload(e.target.files, MESSAGE_TYPES.VIDEO);
    });

    this.container.querySelector('#document-input')?.addEventListener('change', (e) => {
      this.handleFileUpload(e.target.files, MESSAGE_TYPES.DOCUMENT);
    });

    // Fermer le menu d'attachement en cliquant ailleurs
    document.addEventListener('click', (e) => {
      if (!this.container.contains(e.target)) {
        attachmentMenu?.classList.add('hidden');
      }
    });

    // Indicateur de frappe
    let typingTimer;
    messageInput?.addEventListener('input', () => {
      eventBus.emit('typing:start', this.currentConversation.id);
      clearTimeout(typingTimer);
      typingTimer = setTimeout(() => {
        eventBus.emit('typing:stop', this.currentConversation.id);
      }, 1000);
    });
  }

  async sendMessage() {
    const messageInput = this.container.querySelector('#message-input');
    const content = messageInput?.value.trim();
    
    if (!content || !this.currentConversation) return;

    try {
      await messageService.sendMessage(
        this.currentConversation.id,
        content,
        MESSAGE_TYPES.TEXT,
        this.replyToMessage?.id
      );

      messageInput.value = '';
      this.cancelReply();
      eventBus.emit('typing:stop', this.currentConversation.id);
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      // Afficher une notification d'erreur
    }
  }

  async handleFileUpload(files, type) {
    if (!files.length) return;

    for (const file of files) {
      try {
        // Ici, vous devriez uploader le fichier vers votre serveur
        // et obtenir une URL
        const fileUrl = await this.uploadFile(file);
        
        await messageService.sendMessage(
          this.currentConversation.id,
          fileUrl,
          type,
          this.replyToMessage?.id
        );
      } catch (error) {
        console.error('Erreur lors de l\'upload du fichier:', error);
      }
    }

    this.cancelReply();
    this.container.querySelector('#attachment-menu')?.classList.add('hidden');
  }

  async uploadFile(file) {
    // Simulation d'upload - remplacez par votre logique d'upload
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
  }

  async toggleVoiceRecording() {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  }

  async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      const audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const audioUrl = await this.uploadFile(audioBlob);
        
        await messageService.sendMessage(
          this.currentConversation.id,
          audioUrl,
          MESSAGE_TYPES.AUDIO,
          this.replyToMessage?.id
        );

        this.cancelReply();
      };

      this.mediaRecorder.start();
      this.isRecording = true;
      
      // Mettre à jour l'interface
      const voiceButton = this.container.querySelector('[data-action="voice"] i');
      voiceButton.className = 'fas fa-stop text-red-400';
      
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement:', error);
    }
  }

  stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      
      // Remettre l'icône normale
      const voiceButton = this.container.querySelector('[data-action="voice"] i');
      voiceButton.className = 'fas fa-microphone text-gray-400';
    }
  }

  showEmojiPicker() {
    // Implémentation du sélecteur d'emoji
    console.log('Afficher le sélecteur d\'emoji');
  }

  showContactPicker() {
    // Implémentation du sélecteur de contact
    console.log('Afficher le sélecteur de contact');
  }

  async shareLocation() {
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const { latitude, longitude } = position.coords;
      const locationData = {
        latitude,
        longitude,
        address: 'Position actuelle' // Vous pouvez utiliser une API de géocodage inverse
      };

      await messageService.sendMessage(
        this.currentConversation.id,
        JSON.stringify(locationData),
        MESSAGE_TYPES.LOCATION,
        this.replyToMessage?.id
      );

      this.cancelReply();
    } catch (error) {
      console.error('Erreur lors du partage de position:', error);
    }
  }

  setReplyTo(message) {
    this.replyToMessage = message;
    this.render(this.currentConversation);
  }

  cancelReply() {
    this.replyToMessage = null;
    this.render(this.currentConversation);
  }
}