import { conversationService } from '../services/conversationService.js';
import { contactManager } from './ContactManager.js';
import { groupManager } from './GroupManager.js';
import { userService } from '../services/userService.js';
import { eventBus } from '../utils/eventBus.js';
import { notifications } from '../utils/notifications.js';

export class ConversationStarter {
  static async startWithContact(contactId) {
    try {
      const contact = contactManager.getContactById(contactId);
      if (!contact) {
        throw new Error('Contact non trouvé');
      }

      // Vérifier si une conversation existe déjà
      const existingConversations = await conversationService.getConversations();
      const existingConversation = existingConversations.find(conv => 
        conv.type === 'private' && 
        conv.participants.includes(contact.contactUserId)
      );

      let conversation;
      if (existingConversation) {
        conversation = existingConversation;
      } else {
        // Créer une nouvelle conversation
        conversation = await conversationService.createPrivateConversation(contact.contactUserId);
      }

      // Enrichir avec les données du contact
      const enrichedConversation = {
        ...conversation,
        name: contact.name,
        avatar: contact.user?.avatar,
        isOnline: contact.user?.isOnline,
        lastSeen: contact.user?.lastSeen,
        phone: contact.phone,
        contact
      };

      // Activer l'interface de messagerie
      const messageInput = document.getElementById('message-input');
      const sendButton = document.getElementById('send-button');
      if (messageInput) {
        messageInput.disabled = false;
        messageInput.placeholder = 'Tapez un message';
        messageInput.focus(); // Donner le focus au champ de saisie
      }
      if (sendButton) {
        sendButton.disabled = false;
      }

      // Émettre l'événement pour ouvrir la conversation
      eventBus.emit('conversation:selected', enrichedConversation);
      
      return enrichedConversation;
    } catch (error) {
      console.error('Erreur démarrage conversation contact:', error);
      notifications.error('Erreur lors de l\'ouverture de la conversation');
      throw error;
    }
  }

  static async startWithGroup(groupId) {
    try {
      const group = groupManager.getGroupById(groupId);
      if (!group) {
        throw new Error('Groupe non trouvé');
      }

      // Vérifier si l'utilisateur est membre du groupe
      const currentUser = userService.getCurrentUser();
      if (!group.members.includes(currentUser.id)) {
        throw new Error('Vous n\'êtes pas membre de ce groupe');
      }

      // Vérifier si une conversation existe déjà
      const existingConversations = await conversationService.getConversations();
      const existingConversation = existingConversations.find(conv => 
        conv.type === 'group' && 
        conv.groupId === groupId
      );

      let conversation;
      if (existingConversation) {
        conversation = existingConversation;
      } else {
        // Créer une nouvelle conversation de groupe
        conversation = await conversationService.createGroupConversation(groupId);
      }

      // Enrichir avec les données du groupe
      const enrichedConversation = {
        ...conversation,
        name: group.name,
        avatar: group.avatar,
        description: group.description,
        type: 'group',
        group
      };

      // Émettre l'événement pour ouvrir la conversation
      eventBus.emit('conversation:selected', enrichedConversation);
      
      return enrichedConversation;
    } catch (error) {
      console.error('Erreur démarrage conversation groupe:', error);
      notifications.error('Erreur lors de l\'ouverture de la conversation de groupe');
      throw error;
    }
  }

  static async startWithPhone(phone) {
    try {
      // Rechercher l'utilisateur par numéro de téléphone
      const users = await userService.searchUsers(phone);
      const targetUser = users.find(u => u.phone === phone);
      
      if (!targetUser) {
        throw new Error('Aucun utilisateur trouvé avec ce numéro');
      }

      // Vérifier si c'est déjà un contact
      const existingContact = contactManager.contacts.find(c => 
        c.contactUserId === targetUser.id
      );

      if (existingContact) {
        return await this.startWithContact(existingContact.id);
      }

      // Proposer d'ajouter comme contact
      const shouldAddContact = confirm(
        `${targetUser.firstName} ${targetUser.lastName} (${phone}) n'est pas dans vos contacts.\n\n` +
        'Voulez-vous l\'ajouter à vos contacts avant de démarrer la conversation ?'
      );

      if (shouldAddContact) {
        try {
          const contact = await contactManager.addContact({
            name: `${targetUser.firstName} ${targetUser.lastName}`,
            phone: targetUser.phone
          });
          
          return await this.startWithContact(contact.id);
        } catch (error) {
          console.error('Erreur ajout contact:', error);
          // Continuer sans ajouter aux contacts
        }
      }

      // Démarrer la conversation directement
      const conversation = await conversationService.createPrivateConversation(targetUser.id);
      
      const enrichedConversation = {
        ...conversation,
        name: `${targetUser.firstName} ${targetUser.lastName}`,
        avatar: targetUser.avatar,
        isOnline: targetUser.isOnline,
        lastSeen: targetUser.lastSeen,
        phone: targetUser.phone,
        user: targetUser
      };

      eventBus.emit('conversation:selected', enrichedConversation);
      
      return enrichedConversation;
    } catch (error) {
      console.error('Erreur démarrage conversation par téléphone:', error);
      notifications.error('Erreur lors de l\'ouverture de la conversation');
      throw error;
    }
  }

  static showQuickStartModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center';
    
    modal.innerHTML = `
      <div class="bg-gray-800 rounded-lg w-full max-w-md mx-4 overflow-hidden">
        <div class="p-6">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-white text-lg font-medium">Démarrer une conversation</h3>
            <button class="close-modal text-gray-400 hover:text-white">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <div class="space-y-4">
            <!-- Recherche par numéro -->
            <div>
              <label class="block text-white text-sm font-medium mb-2">Numéro de téléphone</label>
              <div class="flex gap-2">
                <select id="country-code" class="bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600">
                  <option value="+221">🇸🇳 +221</option>
                  <option value="+33">🇫🇷 +33</option>
                  <option value="+225">🇨🇮 +225</option>
                  <option value="+1">🇺🇸 +1</option>
                  <option value="+44">🇬🇧 +44</option>
                </select>
                <input type="tel" id="phone-number" 
                       placeholder="78 XXX XX XX"
                       class="flex-1 bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-green-500">
              </div>
            </div>

            <!-- Boutons d'action -->
            <div class="space-y-3">
              <button id="start-by-phone" class="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 flex items-center justify-center space-x-2">
                <i class="fas fa-phone"></i>
                <span>Démarrer par numéro</span>
              </button>

              <div class="relative">
                <div class="absolute inset-0 flex items-center">
                  <div class="w-full border-t border-gray-600"></div>
                </div>
                <div class="relative flex justify-center text-sm">
                  <span class="px-2 bg-gray-800 text-gray-400">ou</span>
                </div>
              </div>

              <button id="browse-contacts" class="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2">
                <i class="fas fa-address-book"></i>
                <span>Parcourir les contacts</span>
              </button>

              <button id="browse-groups" class="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 flex items-center justify-center space-x-2">
                <i class="fas fa-users"></i>
                <span>Parcourir les groupes</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Événements
    const closeBtn = modal.querySelector('.close-modal');
    const startByPhoneBtn = modal.querySelector('#start-by-phone');
    const browseContactsBtn = modal.querySelector('#browse-contacts');
    const browseGroupsBtn = modal.querySelector('#browse-groups');
    const phoneInput = modal.querySelector('#phone-number');
    const countryCodeSelect = modal.querySelector('#country-code');

    closeBtn.addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    startByPhoneBtn.addEventListener('click', async () => {
      const countryCode = countryCodeSelect.value;
      const phoneNumber = phoneInput.value.trim();
      
      if (!phoneNumber) {
        notifications.error('Veuillez entrer un numéro de téléphone');
        return;
      }

      const fullPhone = countryCode + phoneNumber.replace(/\s+/g, '');
      
      try {
        startByPhoneBtn.disabled = true;
        startByPhoneBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Recherche...';
        
        await this.startWithPhone(fullPhone);
        document.body.removeChild(modal);
      } catch (error) {
        notifications.error(error.message);
        startByPhoneBtn.disabled = false;
        startByPhoneBtn.innerHTML = '<i class="fas fa-phone mr-2"></i>Démarrer par numéro';
      }
    });

    browseContactsBtn.addEventListener('click', () => {
      document.body.removeChild(modal);
      import('./NewChatModal.js').then(({ NewChatModal }) => {
        const newChatModal = new NewChatModal();
        newChatModal.show();
      });
    });

    browseGroupsBtn.addEventListener('click', () => {
      document.body.removeChild(modal);
      import('./NewChatModal.js').then(({ NewChatModal }) => {
        const newChatModal = new NewChatModal();
        newChatModal.currentTab = 'groups';
        newChatModal.show();
      });
    });

    // Fermer en cliquant à l'extérieur
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }
}