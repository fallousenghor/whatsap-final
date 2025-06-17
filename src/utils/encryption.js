export class EncryptionUtils {
  static async generateKey() {
    return await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  static async encryptMessage(message, key) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(message);
      
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      const encrypted = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        data
      );

      return {
        encrypted: Array.from(new Uint8Array(encrypted)),
        iv: Array.from(iv)
      };
    } catch (error) {
      console.error('Erreur de chiffrement:', error);
      throw error;
    }
  }

  static async decryptMessage(encryptedData, key) {
    try {
      const { encrypted, iv } = encryptedData;
      
      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: new Uint8Array(iv)
        },
        key,
        new Uint8Array(encrypted)
      );

      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      console.error('Erreur de déchiffrement:', error);
      throw error;
    }
  }

  static async exportKey(key) {
    const exported = await crypto.subtle.exportKey('jwk', key);
    return JSON.stringify(exported);
  }

  static async importKey(keyData) {
    const keyObject = JSON.parse(keyData);
    return await crypto.subtle.importKey(
      'jwk',
      keyObject,
      {
        name: 'AES-GCM',
        length: 256
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  static generateHash(data) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(data))
      .then(hash => Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join(''));
  }
}