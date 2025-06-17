import { contactService } from '../services/contactService.js';
import { userService } from '../services/userService.js';
import { eventBus } from '../utils/eventBus.js';
import { notifications } from '../utils/notifications.js';

export class ContactManager {
  constructor() {
    this.contacts = [];
    this.blockedContacts = [];
    this.currentUser = null;
  }

  async init() {
    this.currentUser = userService.getCurrentUser();
    if (!this.currentUser) {
      throw new Error('Utilisateur non connecté');
    }
    
    await this.loadContacts();
    await this.loadBlockedContacts();
  }

  async loadContacts() {
    try {
      this.contacts = await contactService.getContacts();
      eventBus.emit('contacts:loaded', this.contacts);
    } catch (error) {
      console.error('Erreur lors du chargement des contacts:', error);
      notifications.error('Erreur lors du chargement des contacts');
    }
  }

  async loadBlockedContacts() {
    try {
      this.blockedContacts = await contactService.getBlockedContacts();
      eventBus.emit('blockedContacts:loaded', this.blockedContacts);
    } catch (error) {
      console.error('Erreur lors du chargement des contacts bloqués:', error);
    }
  }

  async addContact(contactData) {
    try {
      // Vérifier si l'utilisateur existe
      const users = await userService.searchUsers(contactData.phone);
      const targetUser = users.find(u => u.phone === contactData.phone);
      
      if (!targetUser) {
        throw new Error('Aucun utilisateur trouvé avec ce numéro');
      }

      const contact = await contactService.addContact(targetUser.id, contactData.name);
      this.contacts.push(contact);
      
      eventBus.emit('contact:added', contact);
      notifications.success('Contact ajouté avec succès');
      
      return contact;
    } catch (error) {
      console.error('Erreur lors de l\'ajout du contact:', error);
      notifications.error(error.message);
      throw error;
    }
  }

  async blockContact(contactId) {
    try {
      await contactService.blockContact(contactId);
      
      // Déplacer le contact vers la liste des bloqués
      const contactIndex = this.contacts.findIndex(c => c.id === contactId);
      if (contactIndex !== -1) {
        const contact = this.contacts.splice(contactIndex, 1)[0];
        contact.isBlocked = true;
        this.blockedContacts.push(contact);
      }
      
      eventBus.emit('contact:blocked', contactId);
      notifications.success('Contact bloqué');
    } catch (error) {
      console.error('Erreur lors du blocage:', error);
      notifications.error('Erreur lors du blocage du contact');
    }
  }

  async unblockContact(contactId) {
    try {
      await contactService.unblockContact(contactId);
      
      // Déplacer le contact vers la liste normale
      const contactIndex = this.blockedContacts.findIndex(c => c.id === contactId);
      if (contactIndex !== -1) {
        const contact = this.blockedContacts.splice(contactIndex, 1)[0];
        contact.isBlocked = false;
        this.contacts.push(contact);
      }
      
      eventBus.emit('contact:unblocked', contactId);
      notifications.success('Contact débloqué');
    } catch (error) {
      console.error('Erreur lors du déblocage:', error);
      notifications.error('Erreur lors du déblocage du contact');
    }
  }

  async deleteContact(contactId) {
    try {
      await contactService.deleteContact(contactId);
      
      this.contacts = this.contacts.filter(c => c.id !== contactId);
      this.blockedContacts = this.blockedContacts.filter(c => c.id !== contactId);
      
      eventBus.emit('contact:deleted', contactId);
      notifications.success('Contact supprimé');
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      notifications.error('Erreur lors de la suppression du contact');
    }
  }

  async toggleFavorite(contactId) {
    try {
      const contact = await contactService.toggleFavorite(contactId);
      
      // Mettre à jour la liste locale
      const index = this.contacts.findIndex(c => c.id === contactId);
      if (index !== -1) {
        this.contacts[index] = contact;
      }
      
      eventBus.emit('contact:favoriteToggled', contact);
      notifications.success(contact.isFavorite ? 'Ajouté aux favoris' : 'Retiré des favoris');
    } catch (error) {
      console.error('Erreur lors de la modification des favoris:', error);
      notifications.error('Erreur lors de la modification');
    }
  }

  searchContacts(query) {
    const lowercaseQuery = query.toLowerCase();
    return this.contacts.filter(contact => 
      contact.name.toLowerCase().includes(lowercaseQuery) ||
      contact.phone.includes(query) ||
      (contact.user && (
        contact.user.firstName.toLowerCase().includes(lowercaseQuery) ||
        contact.user.lastName.toLowerCase().includes(lowercaseQuery)
      ))
    );
  }

  getContactById(contactId) {
    return this.contacts.find(c => c.id === contactId) || 
           this.blockedContacts.find(c => c.id === contactId);
  }

  getFavoriteContacts() {
    return this.contacts.filter(c => c.isFavorite);
  }

  getOnlineContacts() {
    return this.contacts.filter(c => c.user && c.user.isOnline);
  }
}

export const contactManager = new ContactManager();