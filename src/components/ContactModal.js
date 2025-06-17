import { contactManager } from './ContactManager.js';
import { userService } from '../services/userService.js';
import { notifications } from '../utils/notifications.js';

export class ContactModal {
  static showAddContactModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center';
    
    modal.innerHTML = `
      <div class="bg-gray-800 rounded-lg w-full max-w-md mx-4 overflow-hidden">
        <div class="p-6">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-white text-lg font-medium">Ajouter un contact</h3>
            <button class="text-gray-400 hover:text-white" onclick="this.closest('.fixed').remove()">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <form id="add-contact-form" class="space-y-4">
            <div>
              <label class="block text-white text-sm font-medium mb-2">Nom du contact</label>
              <input type="text" id="contact-name" required
                     class="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-green-500"
                     placeholder="Nom du contact">
            </div>

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
                <input type="tel" id="phone-number" required
                       class="flex-1 bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-green-500"
                       placeholder="78 XXX XX XX">
              </div>
            </div>

            <div class="flex items-center space-x-2">
              <input type="checkbox" id="add-to-favorites" class="rounded">
              <label for="add-to-favorites" class="text-white text-sm">Ajouter aux favoris</label>
            </div>

            <div class="flex space-x-3 pt-4">
              <button type="button" class="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700"
                      onclick="this.closest('.fixed').remove()">
                Annuler
              </button>
              <button type="submit" class="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700">
                Ajouter
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Gérer la soumission du formulaire
    const form = modal.querySelector('#add-contact-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const name = modal.querySelector('#contact-name').value.trim();
      const countryCode = modal.querySelector('#country-code').value;
      const phoneNumber = modal.querySelector('#phone-number').value.trim();
      const addToFavorites = modal.querySelector('#add-to-favorites').checked;
      
      if (!name || !phoneNumber) {
        notifications.error('Veuillez remplir tous les champs');
        return;
      }

      const fullPhone = countryCode + phoneNumber.replace(/\s+/g, '');

      try {
        const contact = await contactManager.addContact({
          name,
          phone: fullPhone
        });

        if (addToFavorites) {
          await contactManager.toggleFavorite(contact.id);
        }

        modal.remove();
      } catch (error) {
        console.error('Erreur ajout contact:', error);
      }
    });
  }

  static showContactDetailsModal(contact) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center';
    
    const user = contact.user || {};
    const isOnline = user.isOnline;
    const lastSeen = user.lastSeen ? new Date(user.lastSeen).toLocaleString() : 'Jamais vu';
    
    modal.innerHTML = `
      <div class="bg-gray-800 rounded-lg w-full max-w-md mx-4 overflow-hidden">
        <div class="relative">
          <!-- Header avec avatar -->
          <div class="bg-green-600 p-6 text-center">
            <button class="absolute top-4 right-4 text-white hover:text-gray-200" onclick="this.closest('.fixed').remove()">
              <i class="fas fa-times text-xl"></i>
            </button>
            
            <div class="w-24 h-24 rounded-full bg-gray-300 mx-auto mb-4 overflow-hidden">
              ${user.avatar ? 
                `<img src="${user.avatar}" alt="Avatar" class="w-full h-full object-cover">` :
                `<div class="w-full h-full bg-blue-500 flex items-center justify-center text-white text-2xl font-bold">
                  ${contact.name.split(' ').map(n => n[0]).join('')}
                </div>`
              }
            </div>
            
            <h2 class="text-white text-xl font-bold">${contact.name}</h2>
            <p class="text-green-100">${contact.phone}</p>
            
            <div class="flex items-center justify-center mt-2">
              <div class="w-3 h-3 rounded-full ${isOnline ? 'bg-green-400' : 'bg-gray-400'} mr-2"></div>
              <span class="text-green-100 text-sm">
                ${isOnline ? 'En ligne' : `Vu ${lastSeen}`}
              </span>
            </div>
          </div>

          <!-- Actions rapides -->
          <div class="p-4 border-b border-gray-700">
            <div class="flex justify-around">
              <button class="flex flex-col items-center p-3 hover:bg-gray-700 rounded-lg" onclick="startChat('${contact.id}')">
                <i class="fas fa-comment text-green-500 text-xl mb-1"></i>
                <span class="text-white text-xs">Message</span>
              </button>
              <button class="flex flex-col items-center p-3 hover:bg-gray-700 rounded-lg" onclick="startCall('${contact.id}', 'voice')">
                <i class="fas fa-phone text-blue-500 text-xl mb-1"></i>
                <span class="text-white text-xs">Appeler</span>
              </button>
              <button class="flex flex-col items-center p-3 hover:bg-gray-700 rounded-lg" onclick="startCall('${contact.id}', 'video')">
                <i class="fas fa-video text-purple-500 text-xl mb-1"></i>
                <span class="text-white text-xs">Vidéo</span>
              </button>
            </div>
          </div>

          <!-- Informations -->
          <div class="p-4 space-y-3">
            ${user.status ? `
              <div class="flex items-center space-x-3 p-3 bg-gray-700 rounded-lg">
                <i class="fas fa-quote-left text-gray-400"></i>
                <div>
                  <p class="text-white font-medium">Statut</p>
                  <p class="text-gray-400 text-sm">${user.status}</p>
                </div>
              </div>
            ` : ''}

            <div class="flex items-center space-x-3 p-3 bg-gray-700 rounded-lg">
              <i class="fas fa-phone text-gray-400"></i>
              <div>
                <p class="text-white font-medium">Téléphone</p>
                <p class="text-gray-400 text-sm">${contact.phone}</p>
              </div>
            </div>

            ${user.createdAt ? `
              <div class="flex items-center space-x-3 p-3 bg-gray-700 rounded-lg">
                <i class="fas fa-calendar text-gray-400"></i>
                <div>
                  <p class="text-white font-medium">Membre depuis</p>
                  <p class="text-gray-400 text-sm">${new Date(user.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Actions -->
          <div class="p-4 space-y-2">
            <button onclick="toggleFavorite('${contact.id}')" 
                    class="w-full bg-gray-700 text-white p-3 rounded-lg hover:bg-gray-600 flex items-center space-x-3">
              <i class="fas fa-heart ${contact.isFavorite ? 'text-red-500' : 'text-gray-400'}"></i>
              <span>${contact.isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}</span>
            </button>
            
            <button onclick="blockContact('${contact.id}')" 
                    class="w-full bg-red-600 text-white p-3 rounded-lg hover:bg-red-700 flex items-center space-x-3">
              <i class="fas fa-ban text-white"></i>
              <span>Bloquer ce contact</span>
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Fonctions globales pour les actions
    window.startChat = (contactId) => {
      modal.remove();
      // Logique pour démarrer une conversation
      console.log('Démarrer chat avec:', contactId);
    };

    window.startCall = (contactId, type) => {
      modal.remove();
      // Logique pour démarrer un appel
      console.log('Démarrer appel', type, 'avec:', contactId);
    };

    window.toggleFavorite = async (contactId) => {
      try {
        await contactManager.toggleFavorite(contactId);
        modal.remove();
      } catch (error) {
        console.error('Erreur toggle favori:', error);
      }
    };

    window.blockContact = async (contactId) => {
      if (confirm('Êtes-vous sûr de vouloir bloquer ce contact ?')) {
        try {
          await contactManager.blockContact(contactId);
          modal.remove();
        } catch (error) {
          console.error('Erreur blocage contact:', error);
        }
      }
    };
  }

  static showContactListModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center';
    
    modal.innerHTML = `
      <div class="bg-gray-800 rounded-lg w-full max-w-2xl mx-4 h-5/6 overflow-hidden">
        <div class="p-6 border-b border-gray-700">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-white text-lg font-medium">Mes contacts</h3>
            <div class="flex space-x-2">
              <button id="add-contact-btn" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                <i class="fas fa-plus mr-2"></i>Ajouter
              </button>
              <button class="text-gray-400 hover:text-white" onclick="this.closest('.fixed').remove()">
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>

          <!-- Barre de recherche -->
          <div class="relative">
            <i class="fas fa-search absolute left-3 top-3 text-gray-400"></i>
            <input type="text" id="contact-search" 
                   placeholder="Rechercher un contact..."
                   class="w-full bg-gray-700 text-white pl-10 pr-4 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-green-500">
          </div>

          <!-- Filtres -->
          <div class="flex space-x-2 mt-4">
            <button class="filter-btn active px-3 py-1 rounded-full text-sm" data-filter="all">
              Tous
            </button>
            <button class="filter-btn px-3 py-1 rounded-full text-sm" data-filter="favorites">
              Favoris
            </button>
            <button class="filter-btn px-3 py-1 rounded-full text-sm" data-filter="online">
              En ligne
            </button>
            <button class="filter-btn px-3 py-1 rounded-full text-sm" data-filter="blocked">
              Bloqués
            </button>
          </div>
        </div>

        <!-- Liste des contacts -->
        <div id="contacts-list" class="flex-1 overflow-y-auto p-4">
          <!-- Les contacts seront chargés ici -->
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.loadContactsList(modal);
    this.attachContactListEvents(modal);
  }

  static async loadContactsList(modal, filter = 'all', searchTerm = '') {
    const contactsList = modal.querySelector('#contacts-list');
    contactsList.innerHTML = '<div class="text-center text-gray-400 py-8">Chargement...</div>';

    try {
      let contacts = [];
      
      switch (filter) {
        case 'favorites':
          contacts = contactManager.getFavoriteContacts();
          break;
        case 'online':
          contacts = contactManager.getOnlineContacts();
          break;
        case 'blocked':
          contacts = contactManager.blockedContacts;
          break;
        default:
          contacts = contactManager.contacts;
      }

      if (searchTerm) {
        contacts = contactManager.searchContacts(searchTerm);
      }

      if (contacts.length === 0) {
        contactsList.innerHTML = `
          <div class="text-center text-gray-400 py-8">
            <i class="fas fa-users text-4xl mb-4"></i>
            <p>Aucun contact trouvé</p>
          </div>
        `;
        return;
      }

      contactsList.innerHTML = contacts.map(contact => `
        <div class="contact-item flex items-center justify-between p-3 hover:bg-gray-700 rounded-lg cursor-pointer"
             data-contact-id="${contact.id}">
          <div class="flex items-center space-x-3">
            <div class="w-12 h-12 rounded-full overflow-hidden">
              ${contact.user?.avatar ? 
                `<img src="${contact.user.avatar}" alt="Avatar" class="w-full h-full object-cover">` :
                `<div class="w-full h-full bg-blue-500 flex items-center justify-center text-white font-bold">
                  ${contact.name.split(' ').map(n => n[0]).join('')}
                </div>`
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
            ${contact.user?.isOnline ? '<div class="w-3 h-3 bg-green-500 rounded-full"></div>' : ''}
            ${contact.isBlocked ? '<i class="fas fa-ban text-red-500"></i>' : ''}
          </div>
        </div>
      `).join('');

      // Ajouter les événements de clic
      contactsList.querySelectorAll('.contact-item').forEach(item => {
        item.addEventListener('click', () => {
          const contactId = item.dataset.contactId;
          const contact = contactManager.getContactById(contactId);
          if (contact) {
            modal.remove();
            this.showContactDetailsModal(contact);
          }
        });
      });

    } catch (error) {
      console.error('Erreur chargement contacts:', error);
      contactsList.innerHTML = `
        <div class="text-center text-red-400 py-8">
          <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
          <p>Erreur lors du chargement des contacts</p>
        </div>
      `;
    }
  }

  static attachContactListEvents(modal) {
    // Bouton ajouter contact
    const addBtn = modal.querySelector('#add-contact-btn');
    addBtn.addEventListener('click', () => {
      modal.remove();
      this.showAddContactModal();
    });

    // Recherche
    const searchInput = modal.querySelector('#contact-search');
    searchInput.addEventListener('input', (e) => {
      const activeFilter = modal.querySelector('.filter-btn.active').dataset.filter;
      this.loadContactsList(modal, activeFilter, e.target.value);
    });

    // Filtres
    const filterBtns = modal.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active', 'bg-green-600', 'text-white'));
        btn.classList.add('active', 'bg-green-600', 'text-white');
        
        const searchTerm = searchInput.value;
        this.loadContactsList(modal, btn.dataset.filter, searchTerm);
      });
    });

    // Style initial des filtres
    filterBtns.forEach(btn => {
      if (btn.classList.contains('active')) {
        btn.classList.add('bg-green-600', 'text-white');
      } else {
        btn.classList.add('bg-gray-700', 'text-gray-300', 'hover:bg-gray-600');
      }
    });
  }
}