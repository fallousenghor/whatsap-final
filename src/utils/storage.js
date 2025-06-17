class StorageManager {
  constructor() {
    this.prefix = 'whatsapp_';
  }

  set(key, value) {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }

  get(key) {
    try {
      const item = localStorage.getItem(this.prefix + key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return null;
    }
  }

  remove(key) {
    localStorage.removeItem(this.prefix + key);
  }

  clear() {
    Object.keys(localStorage)
      .filter(key => key.startsWith(this.prefix))
      .forEach(key => localStorage.removeItem(key));
  }

  // Méthodes spécifiques pour l'application
  setCurrentUser(user) {
    this.set('currentUser', user);
  }

  getCurrentUser() {
    return this.get('currentUser');
  }

  removeCurrentUser() {
    this.remove('currentUser');
  }

  setAuthToken(token) {
    this.set('authToken', token);
  }

  getAuthToken() {
    return this.get('authToken');
  }

  removeAuthToken() {
    this.remove('authToken');
  }
}

export const storage = new StorageManager();