import { userService } from '../services/userService.js';
import { eventBus } from '../utils/eventBus.js';

export class StatusModal {
  constructor() {
    this.modal = null;
  }

  show() {
    this.createModal();
  }

  createModal() {
    this.removeModal();

    this.modal = document.createElement('div');
    this.modal.className = 'fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center';
    
    this.modal.innerHTML = `
      <div class="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-white text-lg font-medium">Modifier le statut</h3>
          <button class="close-modal text-gray-400 hover:text-white">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="space-y-4">
          <div class="status-option p-3 rounded-lg hover:bg-gray-700 cursor-pointer" data-status="online">
            <div class="flex items-center space-x-3">
              <div class="w-3 h-3 bg-green-500 rounded-full"></div>
              <span class="text-white">En ligne</span>
            </div>
          </div>

          <div class="status-option p-3 rounded-lg hover:bg-gray-700 cursor-pointer" data-status="away">
            <div class="flex items-center space-x-3">
              <div class="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span class="text-white">Absent</span>
            </div>
          </div>

          <div class="status-option p-3 rounded-lg hover:bg-gray-700 cursor-pointer" data-status="busy">
            <div class="flex items-center space-x-3">
              <div class="w-3 h-3 bg-red-500 rounded-full"></div>
              <span class="text-white">Occupé</span>
            </div>
          </div>

          <div class="status-option p-3 rounded-lg hover:bg-gray-700 cursor-pointer" data-status="offline">
            <div class="flex items-center space-x-3">
              <div class="w-3 h-3 bg-gray-500 rounded-full"></div>
              <span class="text-white">Hors ligne</span>
            </div>
          </div>
        </div>

        <div class="mt-6">
          <label class="block text-white text-sm font-medium mb-2">Message de statut personnalisé</label>
          <input type="text" id="custom-status" 
                 placeholder="Entrez votre message de statut..."
                 class="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-green-500">
        </div>

        <div class="flex justify-end space-x-3 mt-6">
          <button class="cancel-btn px-4 py-2 text-gray-400 hover:text-white">
            Annuler
          </button>
          <button class="save-btn px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            Enregistrer
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(this.modal);
    this.attachEventListeners();
  }

  attachEventListeners() {
    const closeBtn = this.modal.querySelector('.close-modal');
    const cancelBtn = this.modal.querySelector('.cancel-btn');
    const saveBtn = this.modal.querySelector('.save-btn');
    const statusOptions = this.modal.querySelectorAll('.status-option');
    const customStatusInput = this.modal.querySelector('#custom-status');

    let selectedStatus = 'online';

    closeBtn.addEventListener('click', () => this.removeModal());
    cancelBtn.addEventListener('click', () => this.removeModal());

    statusOptions.forEach(option => {
      option.addEventListener('click', () => {
        statusOptions.forEach(opt => opt.classList.remove('bg-gray-700'));
        option.classList.add('bg-gray-700');
        selectedStatus = option.dataset.status;
      });
    });

    saveBtn.addEventListener('click', async () => {
      try {
        const currentUser = userService.getCurrentUser();
        const customMessage = customStatusInput.value.trim();
        
        await userService.updateProfile(currentUser.id, {
          status: customMessage || this.getStatusMessage(selectedStatus),
          userStatus: selectedStatus
        });

        eventBus.emit('user:statusUpdated', { status: selectedStatus, message: customMessage });
        this.removeModal();
      } catch (error) {
        console.error('Erreur lors de la mise à jour du statut:', error);
      }
    });

    // Fermer en cliquant à l'extérieur
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.removeModal();
      }
    });
  }

  getStatusMessage(status) {
    switch (status) {
      case 'online': return 'En ligne';
      case 'away': return 'Absent';
      case 'busy': return 'Occupé';
      case 'offline': return 'Hors ligne';
      default: return 'En ligne';
    }
  }

  removeModal() {
    if (this.modal) {
      document.body.removeChild(this.modal);
      this.modal = null;
    }
  }
}