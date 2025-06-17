import { api } from '../utils/api.js';
import { userService } from '../services/userService.js';
import { contactManager } from './ContactManager.js';
import { eventBus } from '../utils/eventBus.js';
import { notifications } from '../utils/notifications.js';

export class GroupManager {
  constructor() {
    this.groups = [];
    this.currentUser = null;
  }

  async init() {
    this.currentUser = userService.getCurrentUser();
    if (!this.currentUser) {
      throw new Error('Utilisateur non connecté');
    }
    
    await this.loadGroups();
  }

  async loadGroups() {
    try {
      const groups = await api.get('/groups');
      this.groups = groups.filter(group => 
        group.members.includes(this.currentUser.id) && !group.isDeleted
      );
      
      eventBus.emit('groups:loaded', this.groups);
    } catch (error) {
      console.error('Erreur lors du chargement des groupes:', error);
      notifications.error('Erreur lors du chargement des groupes');
    }
  }

  async createGroup(groupData) {
    try {
      const { name, description, members } = groupData;
      
      if (!name || !name.trim()) {
        throw new Error('Le nom du groupe est requis');
      }
      
      if (members.length < 2) {
        throw new Error('Un groupe doit avoir au moins 2 membres');
      }

      const group = {
        id: this.generateId(),
        name: name.trim(),
        description: description || '',
        avatar: null,
        members: [this.currentUser.id, ...members],
        admins: [this.currentUser.id],
        createdBy: this.currentUser.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDeleted: false,
        settings: {
          onlyAdminsCanMessage: false,
          onlyAdminsCanEditInfo: true,
          onlyAdminsCanAddMembers: true
        }
      };

      const createdGroup = await api.post('/groups', group);
      this.groups.push(createdGroup);
      
      eventBus.emit('group:created', createdGroup);
      notifications.success('Groupe créé avec succès');
      
      return createdGroup;
    } catch (error) {
      console.error('Erreur lors de la création du groupe:', error);
      notifications.error(error.message);
      throw error;
    }
  }

  async updateGroupInfo(groupId, updates) {
    try {
      const group = this.getGroupById(groupId);
      if (!group) {
        throw new Error('Groupe non trouvé');
      }

      if (!this.isAdmin(groupId, this.currentUser.id)) {
        throw new Error('Seuls les administrateurs peuvent modifier les informations du groupe');
      }

      const updatedGroup = await api.patch(`/groups/${groupId}`, {
        ...updates,
        updatedAt: new Date().toISOString()
      });

      const index = this.groups.findIndex(g => g.id === groupId);
      if (index !== -1) {
        this.groups[index] = updatedGroup;
      }

      eventBus.emit('group:updated', updatedGroup);
      notifications.success('Informations du groupe mises à jour');
      
      return updatedGroup;
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      notifications.error(error.message);
      throw error;
    }
  }

  async addMembers(groupId, memberIds) {
    try {
      const group = this.getGroupById(groupId);
      if (!group) {
        throw new Error('Groupe non trouvé');
      }

      if (!this.canAddMembers(groupId, this.currentUser.id)) {
        throw new Error('Vous n\'avez pas l\'autorisation d\'ajouter des membres');
      }

      const newMembers = memberIds.filter(id => !group.members.includes(id));
      if (newMembers.length === 0) {
        throw new Error('Tous les utilisateurs sélectionnés sont déjà membres du groupe');
      }

      const updatedMembers = [...group.members, ...newMembers];
      const updatedGroup = await api.patch(`/groups/${groupId}`, {
        members: updatedMembers,
        updatedAt: new Date().toISOString()
      });

      const index = this.groups.findIndex(g => g.id === groupId);
      if (index !== -1) {
        this.groups[index] = updatedGroup;
      }

      eventBus.emit('group:membersAdded', { groupId, newMembers });
      notifications.success(`${newMembers.length} membre(s) ajouté(s) au groupe`);
      
      return updatedGroup;
    } catch (error) {
      console.error('Erreur lors de l\'ajout de membres:', error);
      notifications.error(error.message);
      throw error;
    }
  }

  async removeMembers(groupId, memberIds) {
    try {
      const group = this.getGroupById(groupId);
      if (!group) {
        throw new Error('Groupe non trouvé');
      }

      if (!this.isAdmin(groupId, this.currentUser.id)) {
        throw new Error('Seuls les administrateurs peuvent retirer des membres');
      }

      // Vérifier qu'on ne retire pas tous les admins
      const remainingAdmins = group.admins.filter(id => !memberIds.includes(id));
      if (remainingAdmins.length === 0) {
        throw new Error('Il doit y avoir au moins un administrateur dans le groupe');
      }

      const updatedMembers = group.members.filter(id => !memberIds.includes(id));
      const updatedAdmins = group.admins.filter(id => !memberIds.includes(id));

      const updatedGroup = await api.patch(`/groups/${groupId}`, {
        members: updatedMembers,
        admins: updatedAdmins,
        updatedAt: new Date().toISOString()
      });

      const index = this.groups.findIndex(g => g.id === groupId);
      if (index !== -1) {
        this.groups[index] = updatedGroup;
      }

      eventBus.emit('group:membersRemoved', { groupId, removedMembers: memberIds });
      notifications.success(`${memberIds.length} membre(s) retiré(s) du groupe`);
      
      return updatedGroup;
    } catch (error) {
      console.error('Erreur lors du retrait de membres:', error);
      notifications.error(error.message);
      throw error;
    }
  }

  async promoteToAdmin(groupId, memberId) {
    try {
      const group = this.getGroupById(groupId);
      if (!group) {
        throw new Error('Groupe non trouvé');
      }

      if (!this.isAdmin(groupId, this.currentUser.id)) {
        throw new Error('Seuls les administrateurs peuvent promouvoir d\'autres membres');
      }

      if (!group.members.includes(memberId)) {
        throw new Error('L\'utilisateur n\'est pas membre du groupe');
      }

      if (group.admins.includes(memberId)) {
        throw new Error('L\'utilisateur est déjà administrateur');
      }

      const updatedAdmins = [...group.admins, memberId];
      const updatedGroup = await api.patch(`/groups/${groupId}`, {
        admins: updatedAdmins,
        updatedAt: new Date().toISOString()
      });

      const index = this.groups.findIndex(g => g.id === groupId);
      if (index !== -1) {
        this.groups[index] = updatedGroup;
      }

      eventBus.emit('group:adminPromoted', { groupId, memberId });
      notifications.success('Membre promu administrateur');
      
      return updatedGroup;
    } catch (error) {
      console.error('Erreur lors de la promotion:', error);
      notifications.error(error.message);
      throw error;
    }
  }

  async demoteAdmin(groupId, adminId) {
    try {
      const group = this.getGroupById(groupId);
      if (!group) {
        throw new Error('Groupe non trouvé');
      }

      if (!this.isAdmin(groupId, this.currentUser.id)) {
        throw new Error('Seuls les administrateurs peuvent rétrograder d\'autres administrateurs');
      }

      if (group.createdBy === adminId) {
        throw new Error('Le créateur du groupe ne peut pas être rétrogradé');
      }

      if (group.admins.length <= 1) {
        throw new Error('Il doit y avoir au moins un administrateur dans le groupe');
      }

      const updatedAdmins = group.admins.filter(id => id !== adminId);
      const updatedGroup = await api.patch(`/groups/${groupId}`, {
        admins: updatedAdmins,
        updatedAt: new Date().toISOString()
      });

      const index = this.groups.findIndex(g => g.id === groupId);
      if (index !== -1) {
        this.groups[index] = updatedGroup;
      }

      eventBus.emit('group:adminDemoted', { groupId, adminId });
      notifications.success('Administrateur rétrogradé');
      
      return updatedGroup;
    } catch (error) {
      console.error('Erreur lors de la rétrogradation:', error);
      notifications.error(error.message);
      throw error;
    }
  }

  async leaveGroup(groupId) {
    try {
      const group = this.getGroupById(groupId);
      if (!group) {
        throw new Error('Groupe non trouvé');
      }

      if (!group.members.includes(this.currentUser.id)) {
        throw new Error('Vous n\'êtes pas membre de ce groupe');
      }

      // Si c'est le seul admin, transférer les droits ou supprimer le groupe
      if (group.admins.includes(this.currentUser.id) && group.admins.length === 1) {
        if (group.members.length > 1) {
          // Promouvoir un autre membre comme admin
          const newAdmin = group.members.find(id => id !== this.currentUser.id);
          await this.promoteToAdmin(groupId, newAdmin);
        } else {
          // Supprimer le groupe s'il n'y a plus personne
          return await this.deleteGroup(groupId);
        }
      }

      const updatedMembers = group.members.filter(id => id !== this.currentUser.id);
      const updatedAdmins = group.admins.filter(id => id !== this.currentUser.id);

      await api.patch(`/groups/${groupId}`, {
        members: updatedMembers,
        admins: updatedAdmins,
        updatedAt: new Date().toISOString()
      });

      this.groups = this.groups.filter(g => g.id !== groupId);

      eventBus.emit('group:left', groupId);
      notifications.success('Vous avez quitté le groupe');
      
    } catch (error) {
      console.error('Erreur lors de la sortie du groupe:', error);
      notifications.error(error.message);
      throw error;
    }
  }

  async deleteGroup(groupId) {
    try {
      const group = this.getGroupById(groupId);
      if (!group) {
        throw new Error('Groupe non trouvé');
      }

      if (group.createdBy !== this.currentUser.id) {
        throw new Error('Seul le créateur du groupe peut le supprimer');
      }

      await api.patch(`/groups/${groupId}`, {
        isDeleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy: this.currentUser.id
      });

      this.groups = this.groups.filter(g => g.id !== groupId);

      eventBus.emit('group:deleted', groupId);
      notifications.success('Groupe supprimé');
      
    } catch (error) {
      console.error('Erreur lors de la suppression du groupe:', error);
      notifications.error(error.message);
      throw error;
    }
  }

  // Méthodes utilitaires
  getGroupById(groupId) {
    return this.groups.find(g => g.id === groupId);
  }

  isAdmin(groupId, userId) {
    const group = this.getGroupById(groupId);
    return group && group.admins.includes(userId);
  }

  isMember(groupId, userId) {
    const group = this.getGroupById(groupId);
    return group && group.members.includes(userId);
  }

  canAddMembers(groupId, userId) {
    const group = this.getGroupById(groupId);
    if (!group) return false;
    
    return group.settings.onlyAdminsCanAddMembers 
      ? this.isAdmin(groupId, userId)
      : this.isMember(groupId, userId);
  }

  canSendMessage(groupId, userId) {
    const group = this.getGroupById(groupId);
    if (!group) return false;
    
    return group.settings.onlyAdminsCanMessage 
      ? this.isAdmin(groupId, userId)
      : this.isMember(groupId, userId);
  }

  getUserGroups() {
    return this.groups.filter(g => g.members.includes(this.currentUser.id));
  }

  getAdminGroups() {
    return this.groups.filter(g => g.admins.includes(this.currentUser.id));
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

export const groupManager = new GroupManager();