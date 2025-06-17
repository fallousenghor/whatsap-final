import { storage } from './storage.js';

export class BackupManager {
  static async exportData() {
    try {
      const data = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        user: storage.getCurrentUser(),
        conversations: this.getAllConversations(),
        messages: this.getAllMessages(),
        contacts: this.getAllContacts(),
        settings: this.getSettings()
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `whatsapp_backup_${new Date().toISOString().split('T')[0]}.json`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      throw error;
    }
  }

  static async importData(file) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Vérifier la version
      if (!data.version || data.version !== '1.0') {
        throw new Error('Version de sauvegarde non supportée');
      }

      // Confirmer l'import
      const confirmed = confirm(
        `Voulez-vous vraiment importer cette sauvegarde du ${new Date(data.timestamp).toLocaleDateString()} ?\n\n` +
        'Cela remplacera toutes vos données actuelles.'
      );

      if (!confirmed) {
        return false;
      }

      // Sauvegarder les données actuelles
      await this.createBackup();

      // Importer les nouvelles données
      if (data.user) {
        storage.setCurrentUser(data.user);
      }

      if (data.conversations) {
        this.importConversations(data.conversations);
      }

      if (data.messages) {
        this.importMessages(data.messages);
      }

      if (data.contacts) {
        this.importContacts(data.contacts);
      }

      if (data.settings) {
        this.importSettings(data.settings);
      }

      return true;
    } catch (error) {
      console.error('Erreur lors de l\'import:', error);
      throw error;
    }
  }

  static async createBackup() {
    const timestamp = new Date().toISOString();
    const backupData = {
      user: storage.getCurrentUser(),
      conversations: this.getAllConversations(),
      messages: this.getAllMessages(),
      contacts: this.getAllContacts(),
      settings: this.getSettings()
    };

    storage.set(`backup_${timestamp}`, backupData);
    
    // Garder seulement les 5 dernières sauvegardes
    this.cleanupOldBackups();
  }

  static cleanupOldBackups() {
    const keys = Object.keys(localStorage)
      .filter(key => key.startsWith('whatsapp_backup_'))
      .sort()
      .reverse();

    // Supprimer les sauvegardes au-delà de 5
    keys.slice(5).forEach(key => {
      localStorage.removeItem(key);
    });
  }

  static getAllConversations() {
    // Récupérer toutes les conversations depuis le localStorage ou l'API
    return storage.get('conversations') || [];
  }

  static getAllMessages() {
    // Récupérer tous les messages depuis le localStorage ou l'API
    return storage.get('messages') || [];
  }

  static getAllContacts() {
    // Récupérer tous les contacts depuis le localStorage ou l'API
    return storage.get('contacts') || [];
  }

  static getSettings() {
    return {
      theme: storage.get('theme') || 'dark',
      notifications: storage.get('notifications') || true,
      sounds: storage.get('sounds') || true,
      language: storage.get('language') || 'fr'
    };
  }

  static importConversations(conversations) {
    storage.set('conversations', conversations);
  }

  static importMessages(messages) {
    storage.set('messages', messages);
  }

  static importContacts(contacts) {
    storage.set('contacts', contacts);
  }

  static importSettings(settings) {
    Object.entries(settings).forEach(([key, value]) => {
      storage.set(key, value);
    });
  }

  static getBackupList() {
    return Object.keys(localStorage)
      .filter(key => key.startsWith('whatsapp_backup_'))
      .map(key => {
        const timestamp = key.replace('whatsapp_backup_', '');
        return {
          key,
          timestamp,
          date: new Date(timestamp).toLocaleString()
        };
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  static async restoreBackup(backupKey) {
    try {
      const backupData = storage.get(backupKey);
      if (!backupData) {
        throw new Error('Sauvegarde introuvable');
      }

      const confirmed = confirm(
        'Voulez-vous vraiment restaurer cette sauvegarde ?\n\n' +
        'Cela remplacera toutes vos données actuelles.'
      );

      if (!confirmed) {
        return false;
      }

      // Restaurer les données
      if (backupData.user) {
        storage.setCurrentUser(backupData.user);
      }

      if (backupData.conversations) {
        this.importConversations(backupData.conversations);
      }

      if (backupData.messages) {
        this.importMessages(backupData.messages);
      }

      if (backupData.contacts) {
        this.importContacts(backupData.contacts);
      }

      if (backupData.settings) {
        this.importSettings(backupData.settings);
      }

      return true;
    } catch (error) {
      console.error('Erreur lors de la restauration:', error);
      throw error;
    }
  }
}