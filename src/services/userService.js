import { api } from '../utils/api.js';
import { storage } from '../utils/storage.js';

class UserService {
  async login(phone) {
    try {
      const users = await api.get('/users', { phone });
      const user = users.find(u => u.phone === phone);
      
      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      // Mettre à jour le statut en ligne
      await this.updateUserStatus(user.id, true);
      
      storage.setCurrentUser(user);
      return user;
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      throw error;
    }
  }

  async register(userData) {
    try {
      const existingUsers = await api.get('/users', { phone: userData.phone });
      if (existingUsers.length > 0) {
        throw new Error('Ce numéro est déjà utilisé');
      }

      const newUser = {
        ...userData,
        id: this.generateId(),
        avatar: null,
        status: 'Salut ! J\'utilise WhatsApp.',
        lastSeen: new Date().toISOString(),
        isOnline: true,
        createdAt: new Date().toISOString()
      };

      const user = await api.post('/users', newUser);
      storage.setCurrentUser(user);
      return user;
    } catch (error) {
      console.error('Erreur lors de l\'inscription:', error);
      throw error;
    }
  }

  async updateProfile(userId, updates) {
    try {
      const user = await api.patch(`/users/${userId}`, updates);
      storage.setCurrentUser(user);
      return user;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      throw error;
    }
  }

  async updateUserStatus(userId, isOnline) {
    try {
      const updates = {
        isOnline,
        lastSeen: new Date().toISOString()
      };
      return await api.patch(`/users/${userId}`, updates);
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
      throw error;
    }
  }

  async getUserById(userId) {
    try {
      return await api.get(`/users/${userId}`);
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'utilisateur:', error);
      throw error;
    }
  }

  async searchUsers(query) {
    try {
      const users = await api.get('/users');
      return users.filter(user => 
        user.firstName.toLowerCase().includes(query.toLowerCase()) ||
        user.lastName.toLowerCase().includes(query.toLowerCase()) ||
        user.phone.includes(query)
      );
    } catch (error) {
      console.error('Erreur lors de la recherche d\'utilisateurs:', error);
      throw error;
    }
  }

  logout() {
    const currentUser = storage.getCurrentUser();
    if (currentUser) {
      this.updateUserStatus(currentUser.id, false);
    }
    storage.removeCurrentUser();
    storage.removeAuthToken();
  }

  getCurrentUser() {
    return storage.getCurrentUser();
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

export const userService = new UserService();