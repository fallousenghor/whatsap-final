import { contactManager } from './ContactManager.js';
import { groupManager } from './GroupManager.js';
import { conversationService } from '../services/conversationService.js';
import { eventBus } from '../utils/eventBus.js';
import { notifications } from '../utils/notifications.js';

export class NewChatModal {
  constructor() {
    this.modal = null;
    this.currentTab = 'contacts';
    this.searchTerm = '';
  }

  show() {
    this.createModal();
  }

  createModal() {
    this.removeModal();

    this.modal = document.createElement('div');
    this.modal.className = 'fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center';
    
    this.modal.innerHTML = `
      <div class="bg-gray-800 rounded-lg w-full max-w-2xl mx-4 h-5/6 overflow-hidden">
        <div class="p-6 border-b border-gray-700">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-white text-lg font-medium">Nouvelle conversation</h3>
            <button class="close-modal text-gray-400 hover:text-white">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <!-- Barre de recherche -->
          <div class="relative mb-4">
            <i class="fas fa-search absolute left-3 top-3 text-gray-400"></i>
            <input type="text" id="chat-search" 
                   placeholder="Rechercher des contacts ou groupes..."
                   class="w-full bg-gray-700 text-white pl-10 pr-4 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-green-500">
          </div>

          <!-- Onglets -->
          <div class="flex space-x-2">
            <button class="tab-btn active px-4 py-2 rounded-lg text-sm font-medium" data-tab="contacts">
              <i class="fas fa-user mr-2"></i>Contacts
            </button>
            <button class="tab-btn px-4 py-2 rounded-lg text-sm font-medium" data-tab="groups">
              <i class="fas fa-users mr-2"></i>Groupes
            </button>
            <button class="tab-btn px-4 py-2 rounded-lg text-sm font-medium" data-tab="new">
              <i class="fas fa-plus mr-2"></i>Nouveau
            </button>
          </div>
        </div>

        <!-- Contenu -->
        <div id="chat-content" class="flex-1 overflow-y-auto p-4">
          <!-- Le contenu sera chargé ici -->
        </div>
      </div>
    `;

    document.body.appendChild(this.modal);
    this.attachEventListeners();
    this.loadContent();
  }

  attachEventListeners() {
    const closeBtn = this.modal.querySelector('.close-modal');
    const searchInput = this.modal.querySelector('#chat-search');
    const tabBtns = this.modal.querySelectorAll('.tab-btn');

    closeBtn.addEventListener('click', () => this.removeModal());

    searchInput.addEventListener('input', (e) => {
      this.searchTerm = e.target.value;
      this.loadContent();
    });

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.switchTab(btn.dataset.tab);
      });
    });

    // Fermer en cliquant à l'extérieur
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.removeModal();
      }
    });
  }

  switchTab(tab) {
    this.currentTab = tab;
    
    // Mettre à jour l'apparence des onglets
    this.modal.querySelectorAll('.tab-btn').forEach(btn => {
      if (btn.dataset.tab === tab) {
        btn.classList.add('active', 'bg-green-600', 'text-white');
        btn.classList.remove('bg-gray-700', 'text-gray-300');
      } else {
        btn.classList.remove('active', 'bg-green-600', 'text-white');
        btn.classList.add('bg-gray-700', 'text-gray-300', 'hover:bg-gray-600');
      }
    });

    this.loadContent();
  }

  async loadContent() {
    const content = this.modal.querySelector('#chat-content');
    content.innerHTML = '<div class="text-center text-gray-400 py-8">Chargement...</div>';

    try {
      switch (this.currentTab) {
        case 'contacts':
          await this.loadContacts();
          break;
        case 'groups':
          await this.loadGroups();
          break;
        case 'new':
          this.loadNewOptions();
          break;
      }
    } catch (error) {
      console.error('Erreur chargement contenu:', error);
      content.innerHTML = `
        <div class="text-center text-red-400 py-8">
          <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
          <p>Erreur lors du chargement</p>
        </div>
      `;
    }
  }

  async loadContacts() {
    const content = this.modal.querySelector('#chat-content');
    
    try {
      let contacts = contactManager.contacts || [];
      
      if (this.searchTerm) {
        contacts = contactManager.searchContacts(this.searchTerm);
      }

      if (contacts.length === 0) {
        content.innerHTML = `
          <div class="text-center text-gray-400 py-8">
            <i class="fas fa-address-book text-4xl mb-4"></i>
            <p>Aucun contact trouvé</p>
            <button class="mt-4 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700" onclick="this.closest('.fixed').remove(); window.showAddContactModal()">
              Ajouter un contact
            </button>
          </div>
        `;
        return;
      }

      content.innerHTML = `
        <div class="space-y-2">
          ${contacts.map(contact => `
            <div class="contact-item flex items-center justify-between p-3 hover:bg-gray-700 rounded-lg cursor-pointer transition-colors"
                 data-contact-id="${contact.id}" data-type="contact">
              <div class="flex items-center space-x-3">
                <div class="relative">
                  <div class="w-12 h-12 rounded-full overflow-hidden">
                    ${contact.user?.avatar ? 
                      `<img src="${contact.user.avatar}" alt="Avatar" class="w-full h-full object-cover">` :
                      `<div class="w-full h-full bg-blue-500 flex items-center justify-center text-white font-bold">
                        ${contact.name.split(' ').map(n => n[0]).join('')}
                      </div>`
                    }
                  </div>
                  ${contact.user?.isOnline ? 
                    '<div class="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-gray-800 rounded-full"></div>' : 
                    ''
                  }
                </div>
                <div>
                  <h4 class="text-white font-medium">${contact.name}</h4>
                  <p class="text-gray-400 text-sm">${contact.phone}</p>
                  ${contact.user?.status ? `<p class="text-gray-500 text-xs">${contact.user.status}</p>` : ''}
                </div>
              </div>
              <div class="flex items-center space-x-2">
                ${contact.isFavorite ? '<i class="fas fa-heart text-red-500"></i>' : ''}
                <i class="fas fa-comment text-green-500"></i>
              </div>
            </div>
          `).join('')}
        </div>
      `;

      this.attachContactEvents();
    } catch (error) {
      console.error('Erreur chargement contacts:', error);
      content.innerHTML = `
        <div class="text-center text-red-400 py-8">
          <p>Erreur lors du chargement des contacts</p>
        </div>
      `;
    }
  }

  async loadGroups() {
    const content = this.modal.querySelector('#chat-content');
    
    try {
      let groups = groupManager.getUserGroups() || [];
      
      if (this.searchTerm) {
        const term = this.searchTerm.toLowerCase();
        groups = groups.filter(group => 
          group.name.toLowerCase().includes(term) ||
          (group.description && group.description.toLowerCase().includes(term))
        );
      }

      if (groups.length === 0) {
        content.innerHTML = `
          <div class="text-center text-gray-400 py-8">
            <i class="fas fa-users text-4xl mb-4"></i>
            <p>Aucun groupe trouvé</p>
            <button class="mt-4 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700" onclick="this.closest('.fixed').remove(); window.showCreateGroupModal()">
              Créer un groupe
            </button>
          </div>
        `;
        return;
      }

      content.innerHTML = `
        <div class="space-y-2">
          ${groups.map(group => `
            <div class="group-item flex items-center justify-between p-3 hover:bg-gray-700 rounded-lg cursor-pointer transition-colors"
                 data-group-id="${group.id}" data-type="group">
              <div class="flex items-center space-x-3">
                <div class="w-12 h-12 rounded-full overflow-hidden">
                  ${group.avatar ? 
                    `<img src="${group.avatar}" alt="Avatar du groupe" class="w-full h-full object-cover">` :
                    `<div class="w-full h-full bg-green-500 flex items-center justify-center text-white font-bold">
                      <i class="fas fa-users"></i>
                    </div>`
                  }
                </div>
                <div>
                  <h4 class="text-white font-medium">${group.name}</h4>
                  <p class="text-gray-400 text-sm">${group.members?.length || 0} membres</p>
                  ${group.description ? `<p class="text-gray-500 text-xs">${group.description}</p>` : ''}
                </div>
              </div>
              <div class="flex items-center space-x-2">
                ${groupManager.isAdmin(group.id, groupManager.currentUser.id) ? 
                  '<i class="fas fa-crown text-yellow-500"></i>' : ''
                }
                <i class="fas fa-comment text-green-500"></i>
              </div>
            </div>
          `).join('')}
        </div>
      `;

      this.attachGroupEvents();
    } catch (error) {
      console.error('Erreur chargement groupes:', error);
      content.innerHTML = `
        <div class="text-center text-red-400 py-8">
          <p>Erreur lors du chargement des groupes</p>
        </div>
      `;
    }
  }

  loadNewOptions() {
    const content = this.modal.querySelector('#chat-content');
    
    content.innerHTML = `
      <div class="space-y-4">
        <div class="new-contact-option p-4 bg-gray-700 rounded-lg hover:bg-gray-600 cursor-pointer transition-colors">
          <div class="flex items-center space-x-4">
            <div class="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
              <i class="fas fa-user-plus text-white text-xl"></i>
            </div>
            <div>
              <h4 class="text-white font-medium">Nouveau contact</h4>
              <p class="text-gray-400 text-sm">Ajouter un contact et démarrer une conversation</p>
            </div>
          </div>
        </div>

        <div class="new-group-option p-4 bg-gray-700 rounded-lg hover:bg-gray-600 cursor-pointer transition-colors">
          <div class="flex items-center space-x-4">
            <div class="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
              <i class="fas fa-users text-white text-xl"></i>
            </div>
            <div>
              <h4 class="text-white font-medium">Nouveau groupe</h4>
              <p class="text-gray-400 text-sm">Créer un groupe avec vos contacts</p>
            </div>
          </div>
        </div>

        <div class="broadcast-option p-4 bg-gray-700 rounded-lg hover:bg-gray-600 cursor-pointer transition-colors">
          <div class="flex items-center space-x-4">
            <div class="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
              <i class="fas fa-bullhorn text-white text-xl"></i>
            </div>
            <div>
              <h4 class="text-white font-medium">Liste de diffusion</h4>
              <p class="text-gray-400 text-sm">Envoyer un message à plusieurs contacts</p>
            </div>
          </div>
        </div>
      </div>
    `;

    this.attachNewOptionsEvents();
  }

  attachContactEvents() {
    const contactItems = this.modal.querySelectorAll('.contact-item');
    
    contactItems.forEach(item => {
      item.addEventListener('click', async () => {
        const contactId = item.dataset.contactId;
        await this.startConversationWithContact(contactId);
      });
    });
  }

  attachGroupEvents() {
    const groupItems = this.modal.querySelectorAll('.group-item');
    
    groupItems.forEach(item => {
      item.addEventListener('click', async () => {
        const groupId = item.dataset.groupId;
        await this.startConversationWithGroup(groupId);
      });
    });
  }

  attachNewOptionsEvents() {
    const newContactOption = this.modal.querySelector('.new-contact-option');
    const newGroupOption = this.modal.querySelector('.new-group-option');
    const broadcastOption = this.modal.querySelector('.broadcast-option');

    newContactOption?.addEventListener('click', () => {
      this.removeModal();
      // Importer et utiliser ContactModal
      import('./ContactModal.js').then(({ ContactModal }) => {
        ContactModal.showAddContactModal();
      });
    });

    newGroupOption?.addEventListener('click', () => {
      this.removeModal();
      // Importer et utiliser GroupModal
      import('./GroupModal.js').then(({ GroupModal }) => {
        GroupModal.showCreateGroupModal();
      });
    });

    broadcastOption?.addEventListener('click', () => {
      this.removeModal();
      notifications.info('Fonctionnalité de diffusion bientôt disponible');
    });
  }

  async startConversationWithContact(contactId) {
    try {
      const contact = contactManager.getContactById(contactId);
      if (!contact) {
        notifications.error('Contact non trouvé');
        return;
      }

      // Créer ou récupérer la conversation
      const conversation = await conversationService.createPrivateConversation(contact.contactUserId);
      
      this.removeModal();
      
      // Émettre l'événement pour sélectionner la conversation
      eventBus.emit('conversation:selected', {
        ...conversation,
        name: contact.name,
        avatar: contact.user?.avatar,
        isOnline: contact.user?.isOnline,
        lastSeen: contact.user?.lastSeen
      });
      
      notifications.success(`Conversation avec ${contact.name} ouverte`);
    } catch (error) {
      console.error('Erreur démarrage conversation:', error);
      notifications.error('Erreur lors de l\'ouverture de la conversation');
    }
  }

  async startConversationWithGroup(groupId) {
    try {
      const group = groupManager.getGroupById(groupId);
      if (!group) {
        notifications.error('Groupe non trouvé');
        return;
      }

      // Créer ou récupérer la conversation de groupe
      const conversation = await conversationService.createGroupConversation(groupId);
      
      this.removeModal();
      
      // Émettre l'événement pour sélectionner la conversation
      eventBus.emit('conversation:selected', {
        ...conversation,
        name: group.name,
        avatar: group.avatar,
        type: 'group',
        group
      });
      
      notifications.success(`Conversation avec le groupe ${group.name} ouverte`);
    } catch (error) {
      console.error('Erreur démarrage conversation groupe:', error);
      notifications.error('Erreur lors de l\'ouverture de la conversation de groupe');
    }
  }

  removeModal() {
    if (this.modal) {
      document.body.removeChild(this.modal);
      this.modal = null;
    }
  }
}

// Fonctions globales pour la compatibilité
window.showAddContactModal = () => {
  import('./ContactModal.js').then(({ ContactModal }) => {
    ContactModal.showAddContactModal();
  });
};

window.showCreateGroupModal = () => {
  import('./GroupModal.js').then(({ GroupModal }) => {
    GroupModal.showCreateGroupModal();
  });
};