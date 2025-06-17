import { BackupManager } from '../utils/backup.js';
import { storage } from '../utils/storage.js';
import { eventBus } from '../utils/eventBus.js';

export class SettingsModal {
  constructor() {
    this.modal = null;
    this.currentTab = 'general';
  }

  show() {
    this.createModal();
  }

  createModal() {
    this.removeModal();

    this.modal = document.createElement('div');
    this.modal.className = 'fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center';
    
    this.modal.innerHTML = `
      <div class="bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div class="flex">
          <!-- Sidebar -->
          <div class="w-64 bg-gray-900 p-4">
            <div class="flex justify-between items-center mb-6">
              <h2 class="text-white text-lg font-medium">Paramètres</h2>
              <button class="close-modal text-gray-400 hover:text-white">
                <i class="fas fa-times"></i>
              </button>
            </div>
            
            <nav class="space-y-2">
              <button class="settings-tab w-full text-left p-3 rounded-lg hover:bg-gray-700 text-white" data-tab="general">
                <i class="fas fa-cog mr-3"></i>
                Général
              </button>
              <button class="settings-tab w-full text-left p-3 rounded-lg hover:bg-gray-700 text-gray-400" data-tab="notifications">
                <i class="fas fa-bell mr-3"></i>
                Notifications
              </button>
              <button class="settings-tab w-full text-left p-3 rounded-lg hover:bg-gray-700 text-gray-400" data-tab="privacy">
                <i class="fas fa-shield-alt mr-3"></i>
                Confidentialité
              </button>
              <button class="settings-tab w-full text-left p-3 rounded-lg hover:bg-gray-700 text-gray-400" data-tab="appearance">
                <i class="fas fa-palette mr-3"></i>
                Apparence
              </button>
              <button class="settings-tab w-full text-left p-3 rounded-lg hover:bg-gray-700 text-gray-400" data-tab="storage">
                <i class="fas fa-database mr-3"></i>
                Stockage
              </button>
              <button class="settings-tab w-full text-left p-3 rounded-lg hover:bg-gray-700 text-gray-400" data-tab="backup">
                <i class="fas fa-download mr-3"></i>
                Sauvegarde
              </button>
            </nav>
          </div>
          
          <!-- Content -->
          <div class="flex-1 p-6 overflow-y-auto max-h-[90vh]">
            <div id="settings-content">
              ${this.getTabContent(this.currentTab)}
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.modal);
    this.attachEventListeners();
  }

  getTabContent(tab) {
    switch (tab) {
      case 'general':
        return this.getGeneralSettings();
      case 'notifications':
        return this.getNotificationSettings();
      case 'privacy':
        return this.getPrivacySettings();
      case 'appearance':
        return this.getAppearanceSettings();
      case 'storage':
        return this.getStorageSettings();
      case 'backup':
        return this.getBackupSettings();
      default:
        return this.getGeneralSettings();
    }
  }

  getGeneralSettings() {
    const settings = {
      language: storage.get('language') || 'fr',
      autoDownload: storage.get('autoDownload') || false,
      enterToSend: storage.get('enterToSend') || true
    };

    return `
      <h3 class="text-white text-xl font-medium mb-6">Paramètres généraux</h3>
      
      <div class="space-y-6">
        <div>
          <label class="block text-white text-sm font-medium mb-2">Langue</label>
          <select id="language-select" class="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600">
            <option value="fr" ${settings.language === 'fr' ? 'selected' : ''}>Français</option>
            <option value="en" ${settings.language === 'en' ? 'selected' : ''}>English</option>
            <option value="es" ${settings.language === 'es' ? 'selected' : ''}>Español</option>
          </select>
        </div>
        
        <div class="flex items-center justify-between">
          <div>
            <h4 class="text-white font-medium">Téléchargement automatique</h4>
            <p class="text-gray-400 text-sm">Télécharger automatiquement les médias</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" id="auto-download" class="sr-only peer" ${settings.autoDownload ? 'checked' : ''}>
            <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
          </label>
        </div>
        
        <div class="flex items-center justify-between">
          <div>
            <h4 class="text-white font-medium">Entrée pour envoyer</h4>
            <p class="text-gray-400 text-sm">Utiliser Entrée pour envoyer les messages</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" id="enter-to-send" class="sr-only peer" ${settings.enterToSend ? 'checked' : ''}>
            <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
          </label>
        </div>
      </div>
    `;
  }

  getNotificationSettings() {
    const settings = {
      notifications: storage.get('notifications') || true,
      sounds: storage.get('sounds') || true,
      vibration: storage.get('vibration') || true,
      desktop: storage.get('desktopNotifications') || false
    };

    return `
      <h3 class="text-white text-xl font-medium mb-6">Notifications</h3>
      
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h4 class="text-white font-medium">Notifications</h4>
            <p class="text-gray-400 text-sm">Recevoir des notifications pour les nouveaux messages</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" id="notifications" class="sr-only peer" ${settings.notifications ? 'checked' : ''}>
            <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
          </label>
        </div>
        
        <div class="flex items-center justify-between">
          <div>
            <h4 class="text-white font-medium">Sons</h4>
            <p class="text-gray-400 text-sm">Jouer un son pour les notifications</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" id="sounds" class="sr-only peer" ${settings.sounds ? 'checked' : ''}>
            <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
          </label>
        </div>
        
        <div class="flex items-center justify-between">
          <div>
            <h4 class="text-white font-medium">Notifications bureau</h4>
            <p class="text-gray-400 text-sm">Afficher les notifications sur le bureau</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" id="desktop-notifications" class="sr-only peer" ${settings.desktop ? 'checked' : ''}>
            <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
          </label>
        </div>
      </div>
    `;
  }

  getPrivacySettings() {
    return `
      <h3 class="text-white text-xl font-medium mb-6">Confidentialité et sécurité</h3>
      
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h4 class="text-white font-medium">Accusés de lecture</h4>
            <p class="text-gray-400 text-sm">Envoyer des accusés de lecture</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" id="read-receipts" class="sr-only peer" checked>
            <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
          </label>
        </div>
        
        <div class="flex items-center justify-between">
          <div>
            <h4 class="text-white font-medium">Dernière connexion</h4>
            <p class="text-gray-400 text-sm">Afficher votre dernière connexion</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" id="last-seen" class="sr-only peer" checked>
            <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
          </label>
        </div>
        
        <div>
          <button class="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700" id="clear-chat-history">
            <i class="fas fa-trash mr-2"></i>
            Effacer l'historique des discussions
          </button>
        </div>
      </div>
    `;
  }

  getAppearanceSettings() {
    const theme = storage.get('theme') || 'dark';
    
    return `
      <h3 class="text-white text-xl font-medium mb-6">Apparence</h3>
      
      <div class="space-y-6">
        <div>
          <label class="block text-white text-sm font-medium mb-2">Thème</label>
          <div class="grid grid-cols-3 gap-4">
            <div class="theme-option ${theme === 'light' ? 'selected' : ''}" data-theme="light">
              <div class="bg-white border-2 border-gray-300 rounded-lg p-4 cursor-pointer">
                <div class="bg-gray-100 h-8 rounded mb-2"></div>
                <div class="bg-gray-200 h-4 rounded mb-1"></div>
                <div class="bg-gray-200 h-4 rounded w-3/4"></div>
              </div>
              <p class="text-center text-white text-sm mt-2">Clair</p>
            </div>
            
            <div class="theme-option ${theme === 'dark' ? 'selected' : ''}" data-theme="dark">
              <div class="bg-gray-800 border-2 border-gray-600 rounded-lg p-4 cursor-pointer">
                <div class="bg-gray-700 h-8 rounded mb-2"></div>
                <div class="bg-gray-600 h-4 rounded mb-1"></div>
                <div class="bg-gray-600 h-4 rounded w-3/4"></div>
              </div>
              <p class="text-center text-white text-sm mt-2">Sombre</p>
            </div>
            
            <div class="theme-option ${theme === 'auto' ? 'selected' : ''}" data-theme="auto">
              <div class="bg-gradient-to-r from-white to-gray-800 border-2 border-gray-400 rounded-lg p-4 cursor-pointer">
                <div class="bg-gray-400 h-8 rounded mb-2"></div>
                <div class="bg-gray-500 h-4 rounded mb-1"></div>
                <div class="bg-gray-500 h-4 rounded w-3/4"></div>
              </div>
              <p class="text-center text-white text-sm mt-2">Auto</p>
            </div>
          </div>
        </div>
        
        <div>
          <label class="block text-white text-sm font-medium mb-2">Taille de police</label>
          <input type="range" id="font-size" min="12" max="20" value="14" 
                 class="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer">
          <div class="flex justify-between text-gray-400 text-sm mt-1">
            <span>Petit</span>
            <span>Moyen</span>
            <span>Grand</span>
          </div>
        </div>
      </div>
    `;
  }

  getStorageSettings() {
    return `
      <h3 class="text-white text-xl font-medium mb-6">Stockage et données</h3>
      
      <div class="space-y-6">
        <div class="bg-gray-700 p-4 rounded-lg">
          <h4 class="text-white font-medium mb-2">Utilisation du stockage</h4>
          <div class="space-y-2">
            <div class="flex justify-between">
              <span class="text-gray-300">Messages</span>
              <span class="text-white">2.3 MB</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-300">Médias</span>
              <span class="text-white">45.7 MB</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-300">Documents</span>
              <span class="text-white">12.1 MB</span>
            </div>
            <hr class="border-gray-600">
            <div class="flex justify-between font-medium">
              <span class="text-white">Total</span>
              <span class="text-white">60.1 MB</span>
            </div>
          </div>
        </div>
        
        <div class="space-y-3">
          <button class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700" id="clear-cache">
            <i class="fas fa-broom mr-2"></i>
            Vider le cache
          </button>
          
          <button class="w-full bg-yellow-600 text-white py-2 px-4 rounded-lg hover:bg-yellow-700" id="clear-media">
            <i class="fas fa-images mr-2"></i>
            Supprimer les médias
          </button>
          
          <button class="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700" id="clear-all-data">
            <i class="fas fa-trash-alt mr-2"></i>
            Supprimer toutes les données
          </button>
        </div>
      </div>
    `;
  }

  getBackupSettings() {
    return `
      <h3 class="text-white text-xl font-medium mb-6">Sauvegarde et restauration</h3>
      
      <div class="space-y-6">
        <div class="bg-gray-700 p-4 rounded-lg">
          <h4 class="text-white font-medium mb-2">Sauvegarde automatique</h4>
          <p class="text-gray-300 text-sm mb-4">Créer automatiquement des sauvegardes de vos données</p>
          
          <div class="flex items-center justify-between">
            <span class="text-white">Sauvegarde automatique</span>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" id="auto-backup" class="sr-only peer">
              <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
            </label>
          </div>
        </div>
        
        <div class="space-y-3">
          <button class="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700" id="export-data">
            <i class="fas fa-download mr-2"></i>
            Exporter les données
          </button>
          
          <div class="relative">
            <input type="file" id="import-file" accept=".json" class="hidden">
            <button class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700" id="import-data">
              <i class="fas fa-upload mr-2"></i>
              Importer les données
            </button>
          </div>
        </div>
        
        <div id="backup-list" class="space-y-2">
          <h4 class="text-white font-medium">Sauvegardes locales</h4>
          <div class="text-gray-400 text-sm">Aucune sauvegarde trouvée</div>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    const closeBtn = this.modal.querySelector('.close-modal');
    const settingsTabs = this.modal.querySelectorAll('.settings-tab');

    closeBtn.addEventListener('click', () => this.removeModal());

    settingsTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        this.switchTab(tabName);
      });
    });

    // Événements spécifiques aux paramètres
    this.attachSettingsEventListeners();

    // Fermer en cliquant à l'extérieur
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.removeModal();
      }
    });
  }

  attachSettingsEventListeners() {
    // Sauvegarde
    const exportBtn = this.modal.querySelector('#export-data');
    const importBtn = this.modal.querySelector('#import-data');
    const importFile = this.modal.querySelector('#import-file');

    exportBtn?.addEventListener('click', async () => {
      try {
        await BackupManager.exportData();
        alert('Données exportées avec succès !');
      } catch (error) {
        alert('Erreur lors de l\'export : ' + error.message);
      }
    });

    importBtn?.addEventListener('click', () => {
      importFile.click();
    });

    importFile?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        try {
          const success = await BackupManager.importData(file);
          if (success) {
            alert('Données importées avec succès !');
            location.reload();
          }
        } catch (error) {
          alert('Erreur lors de l\'import : ' + error.message);
        }
      }
    });

    // Thème
    const themeOptions = this.modal.querySelectorAll('.theme-option');
    themeOptions.forEach(option => {
      option.addEventListener('click', () => {
        themeOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        
        const theme = option.dataset.theme;
        storage.set('theme', theme);
        eventBus.emit('theme:changed', theme);
      });
    });

    // Autres paramètres
    const checkboxes = this.modal.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        storage.set(checkbox.id.replace('-', ''), checkbox.checked);
      });
    });
  }

  switchTab(tabName) {
    this.currentTab = tabName;
    
    // Mettre à jour l'apparence des onglets
    this.modal.querySelectorAll('.settings-tab').forEach(tab => {
      if (tab.dataset.tab === tabName) {
        tab.classList.remove('text-gray-400');
        tab.classList.add('text-white', 'bg-gray-700');
      } else {
        tab.classList.remove('text-white', 'bg-gray-700');
        tab.classList.add('text-gray-400');
      }
    });

    // Mettre à jour le contenu
    const content = this.modal.querySelector('#settings-content');
    content.innerHTML = this.getTabContent(tabName);
    
    // Réattacher les événements
    this.attachSettingsEventListeners();
  }

  removeModal() {
    if (this.modal) {
      document.body.removeChild(this.modal);
      this.modal = null;
    }
  }
}