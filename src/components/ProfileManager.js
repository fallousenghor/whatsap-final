import { userService } from '../services/userService.js';
import { eventBus } from '../utils/eventBus.js';
import { notifications } from '../utils/notifications.js';
import { FileUtils } from '../utils/fileUtils.js';

export class ProfileManager {
  constructor() {
    this.currentUser = null;
  }

  async init() {
    this.currentUser = userService.getCurrentUser();
    if (!this.currentUser) {
      throw new Error('Utilisateur non connecté');
    }
  }

  async updateProfile(updates) {
    try {
      const updatedUser = await userService.updateProfile(this.currentUser.id, updates);
      this.currentUser = updatedUser;
      
      eventBus.emit('profile:updated', updatedUser);
      notifications.success('Profil mis à jour avec succès');
      
      return updatedUser;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      notifications.error('Erreur lors de la mise à jour du profil');
      throw error;
    }
  }

  async updateAvatar(file) {
    try {
      // Valider le fichier
      const errors = FileUtils.validateFile(file);
      if (errors.length > 0) {
        throw new Error(errors[0]);
      }

      if (!file.type.startsWith('image/')) {
        throw new Error('Seules les images sont autorisées pour l\'avatar');
      }

      // Compresser l'image
      const compressedFile = await FileUtils.compressImage(file, 400, 400, 0.8);
      
      // Simuler l'upload (remplacer par votre logique d'upload)
      const avatarUrl = await this.uploadAvatar(compressedFile);
      
      // Mettre à jour le profil
      const updatedUser = await this.updateProfile({ avatar: avatarUrl });
      
      notifications.success('Photo de profil mise à jour');
      return updatedUser;
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'avatar:', error);
      notifications.error(error.message);
      throw error;
    }
  }

  async uploadAvatar(file) {
    // Simulation d'upload - remplacer par votre logique d'upload réelle
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
  }

  async updateStatus(status) {
    try {
      const updatedUser = await this.updateProfile({ status });
      return updatedUser;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
      throw error;
    }
  }

  async updatePrivacySettings(settings) {
    try {
      const currentSettings = this.currentUser.privacySettings || {};
      const updatedSettings = { ...currentSettings, ...settings };
      
      const updatedUser = await this.updateProfile({ 
        privacySettings: updatedSettings 
      });
      
      notifications.success('Paramètres de confidentialité mis à jour');
      return updatedUser;
    } catch (error) {
      console.error('Erreur lors de la mise à jour des paramètres:', error);
      notifications.error('Erreur lors de la mise à jour des paramètres');
      throw error;
    }
  }

  async updateNotificationSettings(settings) {
    try {
      const currentSettings = this.currentUser.notificationSettings || {};
      const updatedSettings = { ...currentSettings, ...settings };
      
      const updatedUser = await this.updateProfile({ 
        notificationSettings: updatedSettings 
      });
      
      notifications.success('Paramètres de notification mis à jour');
      return updatedUser;
    } catch (error) {
      console.error('Erreur lors de la mise à jour des notifications:', error);
      notifications.error('Erreur lors de la mise à jour des notifications');
      throw error;
    }
  }

  getPrivacySetting(key) {
    return this.currentUser.privacySettings?.[key] || 'everyone';
  }

  getNotificationSetting(key) {
    return this.currentUser.notificationSettings?.[key] !== false;
  }

  showProfileModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center';
    
    modal.innerHTML = `
      <div class="bg-gray-800 rounded-lg w-full max-w-md mx-4 overflow-hidden">
        <div class="relative">
          <!-- Header -->
          <div class="bg-green-600 p-6 text-center">
            <button class="absolute top-4 right-4 text-white hover:text-gray-200" onclick="this.closest('.fixed').remove()">
              <i class="fas fa-times text-xl"></i>
            </button>
            
            <div class="relative inline-block">
              <div class="w-24 h-24 rounded-full bg-gray-300 mx-auto mb-4 overflow-hidden">
                ${this.currentUser.avatar ? 
                  `<img src="${this.currentUser.avatar}" alt="Avatar" class="w-full h-full object-cover">` :
                  `<div class="w-full h-full bg-blue-500 flex items-center justify-center text-white text-2xl font-bold">
                    ${this.currentUser.firstName[0]}${this.currentUser.lastName[0]}
                  </div>`
                }
              </div>
              <button class="absolute bottom-0 right-0 bg-green-500 rounded-full p-2 text-white hover:bg-green-600" onclick="document.getElementById('avatar-input').click()">
                <i class="fas fa-camera text-sm"></i>
              </button>
              <input type="file" id="avatar-input" accept="image/*" class="hidden">
            </div>
            
            <h2 class="text-white text-xl font-bold">${this.currentUser.firstName} ${this.currentUser.lastName}</h2>
            <p class="text-green-100">${this.currentUser.phone}</p>
          </div>

          <!-- Content -->
          <div class="p-6 space-y-4">
            <!-- Statut -->
            <div>
              <label class="block text-white text-sm font-medium mb-2">Statut</label>
              <div class="flex items-center space-x-2">
                <input type="text" id="status-input" value="${this.currentUser.status || ''}" 
                       class="flex-1 bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-green-500">
                <button id="update-status-btn" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                  <i class="fas fa-check"></i>
                </button>
              </div>
            </div>

            <!-- Informations -->
            <div class="space-y-3">
              <div class="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <div class="flex items-center space-x-3">
                  <i class="fas fa-user text-gray-400"></i>
                  <div>
                    <p class="text-white font-medium">Nom</p>
                    <p class="text-gray-400 text-sm">${this.currentUser.firstName} ${this.currentUser.lastName}</p>
                  </div>
                </div>
                <button class="text-green-500 hover:text-green-400">
                  <i class="fas fa-edit"></i>
                </button>
              </div>

              <div class="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <div class="flex items-center space-x-3">
                  <i class="fas fa-phone text-gray-400"></i>
                  <div>
                    <p class="text-white font-medium">Téléphone</p>
                    <p class="text-gray-400 text-sm">${this.currentUser.phone}</p>
                  </div>
                </div>
              </div>

              <div class="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <div class="flex items-center space-x-3">
                  <i class="fas fa-calendar text-gray-400"></i>
                  <div>
                    <p class="text-white font-medium">Membre depuis</p>
                    <p class="text-gray-400 text-sm">${new Date(this.currentUser.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="space-y-2 pt-4">
              <button id="privacy-settings-btn" class="w-full bg-gray-700 text-white p-3 rounded-lg hover:bg-gray-600 flex items-center space-x-3">
                <i class="fas fa-shield-alt text-gray-400"></i>
                <span>Paramètres de confidentialité</span>
                <i class="fas fa-chevron-right text-gray-400 ml-auto"></i>
              </button>
              
              <button id="notification-settings-btn" class="w-full bg-gray-700 text-white p-3 rounded-lg hover:bg-gray-600 flex items-center space-x-3">
                <i class="fas fa-bell text-gray-400"></i>
                <span>Paramètres de notification</span>
                <i class="fas fa-chevron-right text-gray-400 ml-auto"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.attachProfileModalEvents(modal);
  }

  attachProfileModalEvents(modal) {
    // Upload d'avatar
    const avatarInput = modal.querySelector('#avatar-input');
    avatarInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        try {
          await this.updateAvatar(file);
          modal.remove();
          this.showProfileModal(); // Recharger le modal avec la nouvelle image
        } catch (error) {
          console.error('Erreur upload avatar:', error);
        }
      }
    });

    // Mise à jour du statut
    const updateStatusBtn = modal.querySelector('#update-status-btn');
    const statusInput = modal.querySelector('#status-input');
    
    updateStatusBtn.addEventListener('click', async () => {
      const newStatus = statusInput.value.trim();
      if (newStatus !== this.currentUser.status) {
        try {
          await this.updateStatus(newStatus);
        } catch (error) {
          console.error('Erreur mise à jour statut:', error);
        }
      }
    });

    // Paramètres de confidentialité
    const privacyBtn = modal.querySelector('#privacy-settings-btn');
    privacyBtn.addEventListener('click', () => {
      modal.remove();
      this.showPrivacySettingsModal();
    });

    // Paramètres de notification
    const notificationBtn = modal.querySelector('#notification-settings-btn');
    notificationBtn.addEventListener('click', () => {
      modal.remove();
      this.showNotificationSettingsModal();
    });
  }

  showPrivacySettingsModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center';
    
    modal.innerHTML = `
      <div class="bg-gray-800 rounded-lg w-full max-w-md mx-4 overflow-hidden">
        <div class="p-6">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-white text-lg font-medium">Confidentialité</h3>
            <button class="text-gray-400 hover:text-white" onclick="this.closest('.fixed').remove()">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-white font-medium">Dernière connexion</p>
                <p class="text-gray-400 text-sm">Qui peut voir quand vous étiez en ligne</p>
              </div>
              <select class="bg-gray-700 text-white px-3 py-1 rounded" data-setting="lastSeen">
                <option value="everyone" ${this.getPrivacySetting('lastSeen') === 'everyone' ? 'selected' : ''}>Tout le monde</option>
                <option value="contacts" ${this.getPrivacySetting('lastSeen') === 'contacts' ? 'selected' : ''}>Mes contacts</option>
                <option value="nobody" ${this.getPrivacySetting('lastSeen') === 'nobody' ? 'selected' : ''}>Personne</option>
              </select>
            </div>

            <div class="flex items-center justify-between">
              <div>
                <p class="text-white font-medium">Photo de profil</p>
                <p class="text-gray-400 text-sm">Qui peut voir votre photo de profil</p>
              </div>
              <select class="bg-gray-700 text-white px-3 py-1 rounded" data-setting="profilePhoto">
                <option value="everyone" ${this.getPrivacySetting('profilePhoto') === 'everyone' ? 'selected' : ''}>Tout le monde</option>
                <option value="contacts" ${this.getPrivacySetting('profilePhoto') === 'contacts' ? 'selected' : ''}>Mes contacts</option>
                <option value="nobody" ${this.getPrivacySetting('profilePhoto') === 'nobody' ? 'selected' : ''}>Personne</option>
              </select>
            </div>

            <div class="flex items-center justify-between">
              <div>
                <p class="text-white font-medium">Statut</p>
                <p class="text-gray-400 text-sm">Qui peut voir votre statut</p>
              </div>
              <select class="bg-gray-700 text-white px-3 py-1 rounded" data-setting="status">
                <option value="everyone" ${this.getPrivacySetting('status') === 'everyone' ? 'selected' : ''}>Tout le monde</option>
                <option value="contacts" ${this.getPrivacySetting('status') === 'contacts' ? 'selected' : ''}>Mes contacts</option>
                <option value="nobody" ${this.getPrivacySetting('status') === 'nobody' ? 'selected' : ''}>Personne</option>
              </select>
            </div>

            <div class="flex items-center justify-between">
              <div>
                <p class="text-white font-medium">Accusés de lecture</p>
                <p class="text-gray-400 text-sm">Envoyer des accusés de lecture</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" class="sr-only peer" data-setting="readReceipts" 
                       ${this.getPrivacySetting('readReceipts') !== 'false' ? 'checked' : ''}>
                <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>
          </div>

          <div class="mt-6">
            <button id="save-privacy-btn" class="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700">
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Sauvegarder les paramètres
    const saveBtn = modal.querySelector('#save-privacy-btn');
    saveBtn.addEventListener('click', async () => {
      const settings = {};
      
      modal.querySelectorAll('select[data-setting]').forEach(select => {
        settings[select.dataset.setting] = select.value;
      });
      
      modal.querySelectorAll('input[data-setting]').forEach(input => {
        settings[input.dataset.setting] = input.checked;
      });

      try {
        await this.updatePrivacySettings(settings);
        modal.remove();
      } catch (error) {
        console.error('Erreur sauvegarde paramètres:', error);
      }
    });
  }

  showNotificationSettingsModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center';
    
    modal.innerHTML = `
      <div class="bg-gray-800 rounded-lg w-full max-w-md mx-4 overflow-hidden">
        <div class="p-6">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-white text-lg font-medium">Notifications</h3>
            <button class="text-gray-400 hover:text-white" onclick="this.closest('.fixed').remove()">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-white font-medium">Notifications de messages</p>
                <p class="text-gray-400 text-sm">Recevoir des notifications pour les nouveaux messages</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" class="sr-only peer" data-setting="messages" 
                       ${this.getNotificationSetting('messages') ? 'checked' : ''}>
                <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>

            <div class="flex items-center justify-between">
              <div>
                <p class="text-white font-medium">Sons</p>
                <p class="text-gray-400 text-sm">Jouer un son pour les notifications</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" class="sr-only peer" data-setting="sounds" 
                       ${this.getNotificationSetting('sounds') ? 'checked' : ''}>
                <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>

            <div class="flex items-center justify-between">
              <div>
                <p class="text-white font-medium">Vibrations</p>
                <p class="text-gray-400 text-sm">Vibrer pour les notifications</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" class="sr-only peer" data-setting="vibration" 
                       ${this.getNotificationSetting('vibration') ? 'checked' : ''}>
                <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>

            <div class="flex items-center justify-between">
              <div>
                <p class="text-white font-medium">Notifications de groupe</p>
                <p class="text-gray-400 text-sm">Recevoir des notifications pour les messages de groupe</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" class="sr-only peer" data-setting="groups" 
                       ${this.getNotificationSetting('groups') ? 'checked' : ''}>
                <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>
          </div>

          <div class="mt-6">
            <button id="save-notification-btn" class="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700">
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Sauvegarder les paramètres
    const saveBtn = modal.querySelector('#save-notification-btn');
    saveBtn.addEventListener('click', async () => {
      const settings = {};
      
      modal.querySelectorAll('input[data-setting]').forEach(input => {
        settings[input.dataset.setting] = input.checked;
      });

      try {
        await this.updateNotificationSettings(settings);
        modal.remove();
      } catch (error) {
        console.error('Erreur sauvegarde notifications:', error);
      }
    });
  }
}

export const profileManager = new ProfileManager();