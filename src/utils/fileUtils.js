import { MAX_FILE_SIZE, SUPPORTED_IMAGE_TYPES, SUPPORTED_VIDEO_TYPES, SUPPORTED_AUDIO_TYPES } from '../config/constants.js';

export class FileUtils {
  static validateFile(file) {
    const errors = [];

    // Vérifier la taille
    if (file.size > MAX_FILE_SIZE) {
      errors.push(`Le fichier est trop volumineux. Taille maximale: ${this.formatFileSize(MAX_FILE_SIZE)}`);
    }

    return errors;
  }

  static getFileType(file) {
    if (SUPPORTED_IMAGE_TYPES.includes(file.type)) {
      return 'image';
    } else if (SUPPORTED_VIDEO_TYPES.includes(file.type)) {
      return 'video';
    } else if (SUPPORTED_AUDIO_TYPES.includes(file.type)) {
      return 'audio';
    } else {
      return 'document';
    }
  }

  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static async compressImage(file, maxWidth = 1920, maxHeight = 1080, quality = 0.8) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculer les nouvelles dimensions
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;

        // Dessiner l'image redimensionnée
        ctx.drawImage(img, 0, 0, width, height);

        // Convertir en blob
        canvas.toBlob(resolve, file.type, quality);
      };

      img.src = URL.createObjectURL(file);
    });
  }

  static generateThumbnail(file) {
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        this.generateImageThumbnail(file).then(resolve);
      } else if (file.type.startsWith('video/')) {
        this.generateVideoThumbnail(file).then(resolve);
      } else {
        resolve(null);
      }
    });
  }

  static generateImageThumbnail(file) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        const size = 150;
        canvas.width = size;
        canvas.height = size;

        // Calculer le crop centré
        const scale = Math.max(size / img.width, size / img.height);
        const x = (size - img.width * scale) / 2;
        const y = (size - img.height * scale) / 2;

        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
        
        canvas.toBlob(resolve, 'image/jpeg', 0.7);
      };

      img.src = URL.createObjectURL(file);
    });
  }

  static generateVideoThumbnail(file) {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      video.onloadedmetadata = () => {
        video.currentTime = Math.min(1, video.duration / 2); // Prendre une frame au milieu
      };

      video.onseeked = () => {
        const size = 150;
        canvas.width = size;
        canvas.height = size;

        const scale = Math.max(size / video.videoWidth, size / video.videoHeight);
        const x = (size - video.videoWidth * scale) / 2;
        const y = (size - video.videoHeight * scale) / 2;

        ctx.drawImage(video, x, y, video.videoWidth * scale, video.videoHeight * scale);
        
        canvas.toBlob(resolve, 'image/jpeg', 0.7);
      };

      video.src = URL.createObjectURL(file);
    });
  }

  static async uploadFile(file, onProgress) {
    // Simulation d'upload avec progression
    return new Promise((resolve, reject) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 20;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          
          // Simuler une URL de fichier uploadé
          const fileUrl = URL.createObjectURL(file);
          resolve({
            url: fileUrl,
            fileName: file.name,
            fileSize: file.size,
            fileType: this.getFileType(file)
          });
        }
        
        if (onProgress) {
          onProgress(Math.min(progress, 100));
        }
      }, 100);
    });
  }

  static createFilePreview(file) {
    const fileType = this.getFileType(file);
    
    switch (fileType) {
      case 'image':
        return this.createImagePreview(file);
      case 'video':
        return this.createVideoPreview(file);
      case 'audio':
        return this.createAudioPreview(file);
      default:
        return this.createDocumentPreview(file);
    }
  }

  static createImagePreview(file) {
    const preview = document.createElement('div');
    preview.className = 'file-preview relative inline-block';
    
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    img.className = 'max-w-xs max-h-48 rounded-lg';
    
    preview.appendChild(img);
    return preview;
  }

  static createVideoPreview(file) {
    const preview = document.createElement('div');
    preview.className = 'file-preview relative inline-block';
    
    const video = document.createElement('video');
    video.src = URL.createObjectURL(file);
    video.className = 'max-w-xs max-h-48 rounded-lg';
    video.controls = true;
    
    preview.appendChild(video);
    return preview;
  }

  static createAudioPreview(file) {
    const preview = document.createElement('div');
    preview.className = 'file-preview bg-gray-700 p-4 rounded-lg max-w-xs';
    
    preview.innerHTML = `
      <div class="flex items-center space-x-3">
        <i class="fas fa-music text-blue-400 text-2xl"></i>
        <div>
          <p class="text-white font-medium">${file.name}</p>
          <p class="text-gray-400 text-sm">${this.formatFileSize(file.size)}</p>
        </div>
      </div>
      <audio src="${URL.createObjectURL(file)}" controls class="w-full mt-3"></audio>
    `;
    
    return preview;
  }

  static createDocumentPreview(file) {
    const preview = document.createElement('div');
    preview.className = 'file-preview bg-gray-700 p-4 rounded-lg max-w-xs';
    
    const icon = this.getFileIcon(file.type);
    
    preview.innerHTML = `
      <div class="flex items-center space-x-3">
        <i class="${icon} text-blue-400 text-2xl"></i>
        <div>
          <p class="text-white font-medium">${file.name}</p>
          <p class="text-gray-400 text-sm">${this.formatFileSize(file.size)}</p>
        </div>
      </div>
    `;
    
    return preview;
  }

  static getFileIcon(mimeType) {
    if (mimeType.includes('pdf')) return 'fas fa-file-pdf';
    if (mimeType.includes('word')) return 'fas fa-file-word';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'fas fa-file-excel';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'fas fa-file-powerpoint';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return 'fas fa-file-archive';
    return 'fas fa-file';
  }
}