import { groupManager } from './GroupManager.js';
import { contactManager } from './ContactManager.js';
import { notifications } from '../utils/notifications.js';

export class GroupModal {
  static showCreateGroupModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center';
    
    modal.innerHTML = `
      <div class="bg-gray-800 rounded-lg w-full max-w-2xl mx-4 h-5/6 overflow-hidden">
        <div class="p-6 border-b border-gray-700">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-white text-lg font-medium">Créer un groupe</h3>
            <button class="text-gray-400 hover:text-white" onclick="this.closest('.fixed').remove()">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <!-- Informations du groupe -->
          <div class="space-y-4">
            <div>
              <label class="block text-white text-sm font-medium mb-2">Nom du groupe</label>
              <input type="text" id="group-name" required maxlength="50"
                     class="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-green-500"
                     placeholder="Nom du groupe">
            </div>
            
            <div>
              <label class="block text-white text-sm font-medium mb-2">Description (optionnel)</label>
              <textarea id="group-description" maxlength="200" rows="3"
                        class="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-green-500"
                        placeholder="Description du groupe"></textarea>
            </div>
          </div>
        </div>

        <!-- Sélection des membres -->
        <div class="p-6 border-b border-gray-700">
          <div class="flex items-center justify-between mb-4">
            <h4 class="text-white font-medium">Ajouter des membres</h4>
            <span id="selected-count" class="text-gray-400 text-sm">0 sélectionné(s)</span>
          </div>

          <!-- Barre de recherche -->
          <div class="relative mb-4">
            <i class="fas fa-search absolute left-3 top-3 text-gray-400"></i>
            <input type="text" id="member-search" 
                   placeholder="Rechercher des contacts..."
                   class="w-full bg-gray-700 text-white pl-10 pr-4 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-green-500">
          </div>

          <!-- Membres sélectionnés -->
          <div id="selected-members" class="hidden mb-4">
            <h5 class="text-white text-sm font-medium mb-2">Membres sélectionnés</h5>
            <div id="selected-members-list" class="flex flex-wrap gap-2"></div>
          </div>
        </div>

        <!-- Liste des contacts -->
        <div id="contacts-list" class="flex-1 overflow-y-auto p-6">
          <!-- Les contacts seront chargés ici -->
        </div>

        <!-- Actions -->
        <div class="p-6 border-t border-gray-700">
          <div class="flex space-x-3">
            <button type="button" class="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700"
                    onclick="this.closest('.fixed').remove()">
              Annuler
            </button>
            <button id="create-group-btn" class="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700" disabled>
              Créer le groupe
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.loadContactsForGroup(modal);
    this.attachCreateGroupEvents(modal);
  }

  static async loadContactsForGroup(modal, searchTerm = '') {
    const contactsList = modal.querySelector('#contacts-list');
    contactsList.innerHTML = '<div class="text-center text-gray-400 py-8">Chargement...</div>';

    try {
      let contacts = contactManager.contacts;
      
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
            <input type="checkbox" class="contact-checkbox rounded" data-contact-id="${contact.id}">
            <div class="w-10 h-10 rounded-full overflow-hidden">
              ${contact.user?.avatar ? 
                `<img src="${contact.user.avatar}" alt="Avatar" class="w-full h-full object-cover">` :
                `<div class="w-full h-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
                  ${contact.name.split(' ').map(n => n[0]).join('')}
                </div>`
              }
            </div>
            <div>
              <h4 class="text-white font-medium">${contact.name}</h4>
              <p class="text-gray-400 text-sm">${contact.phone}</p>
            </div>
          </div>
          <div class="flex items-center space-x-2">
            ${contact.user?.isOnline ? '<div class="w-3 h-3 bg-green-500 rounded-full"></div>' : ''}
          </div>
        </div>
      `).join('');

      // Ajouter les événements
      contactsList.querySelectorAll('.contact-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
          this.updateSelectedMembers(modal);
        });
      });

      contactsList.querySelectorAll('.contact-item').forEach(item => {
        item.addEventListener('click', (e) => {
          if (e.target.type !== 'checkbox') {
            const checkbox = item.querySelector('.contact-checkbox');
            checkbox.checked = !checkbox.checked;
            this.updateSelectedMembers(modal);
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

  static updateSelectedMembers(modal) {
    const checkboxes = modal.querySelectorAll('.contact-checkbox:checked');
    const selectedCount = modal.querySelector('#selected-count');
    const selectedMembersDiv = modal.querySelector('#selected-members');
    const selectedMembersList = modal.querySelector('#selected-members-list');
    const createBtn = modal.querySelector('#create-group-btn');

    selectedCount.textContent = `${checkboxes.length} sélectionné(s)`;
    
    if (checkboxes.length > 0) {
      selectedMembersDiv.classList.remove('hidden');
      
      selectedMembersList.innerHTML = Array.from(checkboxes).map(checkbox => {
        const contactId = checkbox.dataset.contactId;
        const contact = contactManager.getContactById(contactId);
        
        return `
          <div class="bg-green-600 text-white px-3 py-1 rounded-full text-sm flex items-center space-x-2">
            <span>${contact.name}</span>
            <button class="remove-member hover:text-gray-200" data-contact-id="${contactId}">
              <i class="fas fa-times text-xs"></i>
            </button>
          </div>
        `;
      }).join('');

      // Événements pour retirer des membres
      selectedMembersList.querySelectorAll('.remove-member').forEach(btn => {
        btn.addEventListener('click', () => {
          const contactId = btn.dataset.contactId;
          const checkbox = modal.querySelector(`.contact-checkbox[data-contact-id="${contactId}"]`);
          checkbox.checked = false;
          this.updateSelectedMembers(modal);
        });
      });
    } else {
      selectedMembersDiv.classList.add('hidden');
    }

    // Activer/désactiver le bouton de création
    createBtn.disabled = checkboxes.length < 2;
    if (checkboxes.length >= 2) {
      createBtn.classList.remove('opacity-50');
    } else {
      createBtn.classList.add('opacity-50');
    }
  }

  static attachCreateGroupEvents(modal) {
    // Recherche de membres
    const searchInput = modal.querySelector('#member-search');
    searchInput.addEventListener('input', (e) => {
      this.loadContactsForGroup(modal, e.target.value);
    });

    // Création du groupe
    const createBtn = modal.querySelector('#create-group-btn');
    createBtn.addEventListener('click', async () => {
      const groupName = modal.querySelector('#group-name').value.trim();
      const groupDescription = modal.querySelector('#group-description').value.trim();
      const selectedCheckboxes = modal.querySelectorAll('.contact-checkbox:checked');

      if (!groupName) {
        notifications.error('Veuillez entrer un nom pour le groupe');
        return;
      }

      if (selectedCheckboxes.length < 2) {
        notifications.error('Veuillez sélectionner au moins 2 membres');
        return;
      }

      const memberIds = Array.from(selectedCheckboxes).map(cb => cb.dataset.contactId);

      try {
        createBtn.disabled = true;
        createBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Création...';

        await groupManager.createGroup({
          name: groupName,
          description: groupDescription,
          members: memberIds
        });

        modal.remove();
      } catch (error) {
        console.error('Erreur création groupe:', error);
        createBtn.disabled = false;
        createBtn.innerHTML = 'Créer le groupe';
      }
    });
  }

  static showGroupDetailsModal(group) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center';
    
    const isAdmin = groupManager.isAdmin(group.id, groupManager.currentUser.id);
    const isCreator = group.createdBy === groupManager.currentUser.id;
    
    modal.innerHTML = `
      <div class="bg-gray-800 rounded-lg w-full max-w-2xl mx-4 h-5/6 overflow-hidden">
        <div class="relative">
          <!-- Header -->
          <div class="bg-green-600 p-6 text-center">
            <button class="absolute top-4 right-4 text-white hover:text-gray-200" onclick="this.closest('.fixed').remove()">
              <i class="fas fa-times text-xl"></i>
            </button>
            
            <div class="w-24 h-24 rounded-full bg-gray-300 mx-auto mb-4 overflow-hidden">
              ${group.avatar ? 
                `<img src="${group.avatar}" alt="Avatar du groupe" class="w-full h-full object-cover">` :
                `<div class="w-full h-full bg-green-500 flex items-center justify-center text-white text-2xl font-bold">
                  <i class="fas fa-users"></i>
                </div>`
              }
            </div>
            
            <h2 class="text-white text-xl font-bold">${group.name}</h2>
            <p class="text-green-100">${group.members.length} membres</p>
            ${group.description ? `<p class="text-green-100 text-sm mt-2">${group.description}</p>` : ''}
          </div>

          <!-- Actions rapides -->
          ${isAdmin ? `
            <div class="p-4 border-b border-gray-700">
              <div class="flex justify-around">
                <button class="flex flex-col items-center p-3 hover:bg-gray-700 rounded-lg" onclick="addMembers('${group.id}')">
                  <i class="fas fa-user-plus text-green-500 text-xl mb-1"></i>
                  <span class="text-white text-xs">Ajouter</span>
                </button>
                <button class="flex flex-col items-center p-3 hover:bg-gray-700 rounded-lg" onclick="editGroup('${group.id}')">
                  <i class="fas fa-edit text-blue-500 text-xl mb-1"></i>
                  <span class="text-white text-xs">Modifier</span>
                </button>
                <button class="flex flex-col items-center p-3 hover:bg-gray-700 rounded-lg" onclick="manageMembers('${group.id}')">
                  <i class="fas fa-users-cog text-purple-500 text-xl mb-1"></i>
                  <span class="text-white text-xs">Gérer</span>
                </button>
              </div>
            </div>
          ` : ''}

          <!-- Membres -->
          <div class="flex-1 overflow-y-auto">
            <div class="p-4">
              <h3 class="text-white font-medium mb-4">Membres (${group.members.length})</h3>
              <div id="members-list" class="space-y-2">
                <!-- Les membres seront chargés ici -->
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="p-4 border-t border-gray-700 space-y-2">
            ${isCreator ? `
              <button onclick="deleteGroup('${group.id}')" 
                      class="w-full bg-red-600 text-white p-3 rounded-lg hover:bg-red-700 flex items-center justify-center space-x-2">
                <i class="fas fa-trash"></i>
                <span>Supprimer le groupe</span>
              </button>
            ` : `
              <button onclick="leaveGroup('${group.id}')" 
                      class="w-full bg-red-600 text-white p-3 rounded-lg hover:bg-red-700 flex items-center justify-center space-x-2">
                <i class="fas fa-sign-out-alt"></i>
                <span>Quitter le groupe</span>
              </button>
            `}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.loadGroupMembers(modal, group);

    // Fonctions globales pour les actions
    window.addMembers = (groupId) => {
      modal.remove();
      this.showAddMembersModal(groupId);
    };

    window.editGroup = (groupId) => {
      modal.remove();
      this.showEditGroupModal(groupId);
    };

    window.manageMembers = (groupId) => {
      modal.remove();
      this.showManageMembersModal(groupId);
    };

    window.deleteGroup = async (groupId) => {
      if (confirm('Êtes-vous sûr de vouloir supprimer ce groupe ? Cette action est irréversible.')) {
        try {
          await groupManager.deleteGroup(groupId);
          modal.remove();
        } catch (error) {
          console.error('Erreur suppression groupe:', error);
        }
      }
    };

    window.leaveGroup = async (groupId) => {
      if (confirm('Êtes-vous sûr de vouloir quitter ce groupe ?')) {
        try {
          await groupManager.leaveGroup(groupId);
          modal.remove();
        } catch (error) {
          console.error('Erreur sortie groupe:', error);
        }
      }
    };
  }

  static async loadGroupMembers(modal, group) {
    const membersList = modal.querySelector('#members-list');
    membersList.innerHTML = '<div class="text-center text-gray-400 py-4">Chargement...</div>';

    try {
      // Charger les détails des membres
      const membersDetails = await Promise.all(
        group.members.map(async (memberId) => {
          try {
            const contact = contactManager.getContactById(memberId);
            if (contact) {
              return {
                id: memberId,
                name: contact.name,
                phone: contact.phone,
                avatar: contact.user?.avatar,
                isOnline: contact.user?.isOnline,
                isAdmin: group.admins.includes(memberId),
                isCreator: group.createdBy === memberId
              };
            }
            return null;
          } catch (error) {
            console.error('Erreur chargement membre:', error);
            return null;
          }
        })
      );

      const validMembers = membersDetails.filter(member => member !== null);

      if (validMembers.length === 0) {
        membersList.innerHTML = '<div class="text-center text-gray-400 py-4">Aucun membre trouvé</div>';
        return;
      }

      membersList.innerHTML = validMembers.map(member => `
        <div class="flex items-center justify-between p-3 hover:bg-gray-700 rounded-lg">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-full overflow-hidden">
              ${member.avatar ? 
                `<img src="${member.avatar}" alt="Avatar" class="w-full h-full object-cover">` :
                `<div class="w-full h-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
                  ${member.name.split(' ').map(n => n[0]).join('')}
                </div>`
              }
            </div>
            <div>
              <h4 class="text-white font-medium">${member.name}</h4>
              <p class="text-gray-400 text-sm">${member.phone}</p>
            </div>
          </div>
          <div class="flex items-center space-x-2">
            ${member.isCreator ? '<span class="text-yellow-400 text-xs bg-yellow-400 bg-opacity-20 px-2 py-1 rounded">Créateur</span>' : ''}
            ${member.isAdmin && !member.isCreator ? '<span class="text-blue-400 text-xs bg-blue-400 bg-opacity-20 px-2 py-1 rounded">Admin</span>' : ''}
            ${member.isOnline ? '<div class="w-3 h-3 bg-green-500 rounded-full"></div>' : ''}
          </div>
        </div>
      `).join('');

    } catch (error) {
      console.error('Erreur chargement membres:', error);
      membersList.innerHTML = '<div class="text-center text-red-400 py-4">Erreur lors du chargement</div>';
    }
  }

  static showGroupListModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center';
    
    modal.innerHTML = `
      <div class="bg-gray-800 rounded-lg w-full max-w-2xl mx-4 h-5/6 overflow-hidden">
        <div class="p-6 border-b border-gray-700">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-white text-lg font-medium">Mes groupes</h3>
            <div class="flex space-x-2">
              <button id="create-group-btn" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                <i class="fas fa-plus mr-2"></i>Créer
              </button>
              <button class="text-gray-400 hover:text-white" onclick="this.closest('.fixed').remove()">
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>

          <!-- Barre de recherche -->
          <div class="relative">
            <i class="fas fa-search absolute left-3 top-3 text-gray-400"></i>
            <input type="text" id="group-search" 
                   placeholder="Rechercher un groupe..."
                   class="w-full bg-gray-700 text-white pl-10 pr-4 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-green-500">
          </div>

          <!-- Filtres -->
          <div class="flex space-x-2 mt-4">
            <button class="filter-btn active px-3 py-1 rounded-full text-sm" data-filter="all">
              Tous
            </button>
            <button class="filter-btn px-3 py-1 rounded-full text-sm" data-filter="admin">
              Admin
            </button>
            <button class="filter-btn px-3 py-1 rounded-full text-sm" data-filter="created">
              Créés par moi
            </button>
          </div>
        </div>

        <!-- Liste des groupes -->
        <div id="groups-list" class="flex-1 overflow-y-auto p-4">
          <!-- Les groupes seront chargés ici -->
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.loadGroupsList(modal);
    this.attachGroupListEvents(modal);
  }

  static async loadGroupsList(modal, filter = 'all', searchTerm = '') {
    const groupsList = modal.querySelector('#groups-list');
    groupsList.innerHTML = '<div class="text-center text-gray-400 py-8">Chargement...</div>';

    try {
      let groups = [];
      
      switch (filter) {
        case 'admin':
          groups = groupManager.getAdminGroups();
          break;
        case 'created':
          groups = groupManager.groups.filter(g => g.createdBy === groupManager.currentUser.id);
          break;
        default:
          groups = groupManager.getUserGroups();
      }

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        groups = groups.filter(group => 
          group.name.toLowerCase().includes(term) ||
          (group.description && group.description.toLowerCase().includes(term))
        );
      }

      if (groups.length === 0) {
        groupsList.innerHTML = `
          <div class="text-center text-gray-400 py-8">
            <i class="fas fa-users text-4xl mb-4"></i>
            <p>Aucun groupe trouvé</p>
          </div>
        `;
        return;
      }

      groupsList.innerHTML = groups.map(group => {
        const isAdmin = groupManager.isAdmin(group.id, groupManager.currentUser.id);
        const isCreator = group.createdBy === groupManager.currentUser.id;
        
        return `
          <div class="group-item flex items-center justify-between p-4 hover:bg-gray-700 rounded-lg cursor-pointer"
               data-group-id="${group.id}">
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
                <p class="text-gray-400 text-sm">${group.members.length} membres</p>
                ${group.description ? `<p class="text-gray-500 text-xs">${group.description}</p>` : ''}
              </div>
            </div>
            <div class="flex items-center space-x-2">
              ${isCreator ? '<span class="text-yellow-400 text-xs bg-yellow-400 bg-opacity-20 px-2 py-1 rounded">Créateur</span>' : ''}
              ${isAdmin && !isCreator ? '<span class="text-blue-400 text-xs bg-blue-400 bg-opacity-20 px-2 py-1 rounded">Admin</span>' : ''}
              <i class="fas fa-chevron-right text-gray-400"></i>
            </div>
          </div>
        `;
      }).join('');

      // Ajouter les événements de clic
      groupsList.querySelectorAll('.group-item').forEach(item => {
        item.addEventListener('click', () => {
          const groupId = item.dataset.groupId;
          const group = groupManager.getGroupById(groupId);
          if (group) {
            modal.remove();
            this.showGroupDetailsModal(group);
          }
        });
      });

    } catch (error) {
      console.error('Erreur chargement groupes:', error);
      groupsList.innerHTML = `
        <div class="text-center text-red-400 py-8">
          <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
          <p>Erreur lors du chargement des groupes</p>
        </div>
      `;
    }
  }

  static attachGroupListEvents(modal) {
    // Bouton créer groupe
    const createBtn = modal.querySelector('#create-group-btn');
    createBtn.addEventListener('click', () => {
      modal.remove();
      this.showCreateGroupModal();
    });

    // Recherche
    const searchInput = modal.querySelector('#group-search');
    searchInput.addEventListener('input', (e) => {
      const activeFilter = modal.querySelector('.filter-btn.active').dataset.filter;
      this.loadGroupsList(modal, activeFilter, e.target.value);
    });

    // Filtres
    const filterBtns = modal.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active', 'bg-green-600', 'text-white'));
        btn.classList.add('active', 'bg-green-600', 'text-white');
        
        const searchTerm = searchInput.value;
        this.loadGroupsList(modal, btn.dataset.filter, searchTerm);
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