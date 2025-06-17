import { api } from '../utils/api.js';
import { userService } from './userService.js';

class ContactService {
  async addContact(contactUserId, name) {
    try {
      const currentUser = userService.getCurrentUser();
      if (!currentUser) {
        throw new Error('Utilisateur non connecté');
      }

      // Vérifier si le contact existe déjà
      const existingContacts = await api.get('/contacts', {
        userId: currentUser.id,
        contactUserId
      });

      if (existingContacts.length > 0) {
        throw new Error('Ce contact existe déjà');
      }

      const contact = {
        id: this.generateId(),
        userId: currentUser.id,
        contactUserId,
        name,
        phone: '', // Sera rempli par les données de l'utilisateur
        isBlocked: false,
        isFavorite: false,
        createdAt: new Date().toISOString()
      };

      return await api.post('/contacts', contact);
    } catch (error) {
      console.error('Erreur lors de l\'ajout du contact:', error);
      throw error;
    }
  }

  async getContacts() {
    try {
      const currentUser = userService.getCurrentUser();
      if (!currentUser) {
        throw new Error('Utilisateur non connecté');
      }

      const contacts = await api.get('/contacts', { userId: currentUser.id });
      
      // Enrichir avec les données des utilisateurs
      const enrichedContacts = await Promise.all(
        contacts.map(async (contact) => {
          try {
            const user = await userService.getUserById(contact.contactUserId);
            return {
              ...contact,
              user,
              phone: user.phone,
              avatar: user.avatar,
              status: user.status,
              isOnline: user.isOnline,
              lastSeen: user.lastSeen
            };
          } catch (error) {
            console.error('Erreur lors de l\'enrichissement du contact:', error);
            return contact;
          }
        })
      );

      return enrichedContacts.filter(contact => !contact.isBlocked);
    } catch (error) {
      console.error('Erreur lors de la récupération des contacts:', error);
      throw error;
    }
  }

  async getBlockedContacts() {
    try {
      const currentUser = userService.getCurrentUser();
      if (!currentUser) {
        throw new Error('Utilisateur non connecté');
      }

      const contacts = await api.get('/contacts', { 
        userId: currentUser.id,
        isBlocked: true 
      });

      return await Promise.all(
        contacts.map(async (contact) => {
          const user = await userService.getUserById(contact.contactUserId);
          return { ...contact, user };
        })
      );
    } catch (error) {
      console.error('Erreur lors de la récupération des contacts bloqués:', error);
      throw error;
    }
  }

  async blockContact(contactId) {
    try {
      return await api.patch(`/contacts/${contactId}`, { isBlocked: true });
    } catch (error) {
      console.error('Erreur lors du blocage du contact:', error);
      throw error;
    }
  }

  async unblockContact(contactId) {
    try {
      return await api.patch(`/contacts/${contactId}`, { isBlocked: false });
    } catch (error) {
      console.error('Erreur lors du déblocage du contact:', error);
      throw error;
    }
  }

  async toggleFavorite(contactId) {
    try {
      const contact = await api.get(`/contacts/${contactId}`);
      return await api.patch(`/contacts/${contactId}`, { 
        isFavorite: !contact.isFavorite 
      });
    } catch (error) {
      console.error('Erreur lors de la modification des favoris:', error);
      throw error;
    }
  }

  async deleteContact(contactId) {
    try {
      return await api.delete(`/contacts/${contactId}`);
    } catch (error) {
      console.error('Erreur lors de la suppression du contact:', error);
      throw error;
    }
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

export const contactService = new ContactService();