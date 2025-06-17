export class MediaViewer {
  constructor() {
    this.viewer = null;
    this.currentMedia = null;
  }

  showImage(imageUrl, caption = '') {
    this.createViewer('image', imageUrl, caption);
  }

  showVideo(videoUrl, caption = '') {
    this.createViewer('video', videoUrl, caption);
  }

  createViewer(type, url, caption) {
    this.removeViewer();

    this.viewer = document.createElement('div');
    this.viewer.className = 'fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center';
    
    this.viewer.innerHTML = `
      <div class="relative max-w-4xl max-h-full p-4">
        <button class="absolute top-4 right-4 z-10 w-10 h-10 bg-gray-800 bg-opacity-50 rounded-full flex items-center justify-center text-white hover:bg-opacity-75">
          <i class="fas fa-times"></i>
        </button>
        
        <div class="media-container">
          ${type === 'image' ? `
            <img src="${url}" alt="Image" class="max-w-full max-h-screen object-contain">
          ` : `
            <video src="${url}" controls class="max-w-full max-h-screen">
              Votre navigateur ne supporte pas la lecture vidéo.
            </video>
          `}
        </div>
        
        ${caption ? `
          <div class="mt-4 text-center">
            <p class="text-white text-lg">${caption}</p>
          </div>
        ` : ''}
        
        <div class="flex justify-center mt-4 space-x-4">
          <button class="download-btn px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <i class="fas fa-download mr-2"></i>
            Télécharger
          </button>
          <button class="share-btn px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            <i class="fas fa-share mr-2"></i>
            Partager
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(this.viewer);
    this.attachEventListeners(url);
  }

  attachEventListeners(url) {
    const closeBtn = this.viewer.querySelector('.fa-times').parentElement;
    const downloadBtn = this.viewer.querySelector('.download-btn');
    const shareBtn = this.viewer.querySelector('.share-btn');

    closeBtn.addEventListener('click', () => this.removeViewer());

    downloadBtn.addEventListener('click', () => this.downloadMedia(url));

    shareBtn.addEventListener('click', () => this.shareMedia(url));

    // Fermer avec Escape
    document.addEventListener('keydown', this.handleKeydown.bind(this));

    // Fermer en cliquant à l'extérieur
    this.viewer.addEventListener('click', (e) => {
      if (e.target === this.viewer) {
        this.removeViewer();
      }
    });
  }

  downloadMedia(url) {
    const link = document.createElement('a');
    link.href = url;
    link.download = `media_${Date.now()}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  shareMedia(url) {
    if (navigator.share) {
      navigator.share({
        title: 'Média partagé',
        url: url
      }).catch(console.error);
    } else {
      // Fallback: copier l'URL
      navigator.clipboard.writeText(url).then(() => {
        alert('URL copiée dans le presse-papiers');
      }).catch(console.error);
    }
  }

  handleKeydown(e) {
    if (e.key === 'Escape') {
      this.removeViewer();
    }
  }

  removeViewer() {
    if (this.viewer) {
      document.body.removeChild(this.viewer);
      this.viewer = null;
      document.removeEventListener('keydown', this.handleKeydown.bind(this));
    }
  }
}

// Instance globale
export const mediaViewer = new MediaViewer();

// Fonction globale pour ouvrir le visualiseur d'images
window.openImageViewer = (imageUrl, caption) => {
  mediaViewer.showImage(imageUrl, caption);
};

window.openVideoViewer = (videoUrl, caption) => {
  mediaViewer.showVideo(videoUrl, caption);
};