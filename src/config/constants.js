// export const API_BASE_URL = 'http://localhost:3000';
export const API_BASE_URL  = "https://backend-js-server-vrai.onrender.com";

export const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  DOCUMENT: 'document',
  LOCATION: 'location',
  CONTACT: 'contact'
};

export const MESSAGE_STATUS = {
  SENDING: 'sending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed'
};

export const CONVERSATION_TYPES = {
  PRIVATE: 'private',
  GROUP: 'group'
};

export const USER_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  AWAY: 'away',
  BUSY: 'busy'
};

export const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export const MAX_FILE_SIZE = 16 * 1024 * 1024; // 16MB
export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
export const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg'];
export const SUPPORTED_AUDIO_TYPES = ['audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a'];