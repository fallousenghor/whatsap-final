import { callService } from '../services/callService.js';
import { eventBus } from '../utils/eventBus.js';
import { formatTime } from '../utils/dateUtils.js';

export class CallModal {
  constructor() {
    this.modal = null;
    this.currentCall = null;
    this.callTimer = null;
    this.callDuration = 0;
  }

  showIncomingCall(call) {
    this.currentCall = call;
    this.createModal('incoming');
  }

  showOutgoingCall(call) {
    this.currentCall = call;
    this.createModal('outgoing');
  }

  showActiveCall(call) {
    this.currentCall = call;
    this.createModal('active');
    this.startCallTimer();
  }

  createModal(type) {
    this.removeModal();

    this.modal = document.createElement('div');
    this.modal.className = 'fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center';
    
    this.modal.innerHTML = this.getModalContent(type);
    document.body.appendChild(this.modal);

    this.attachEventListeners(type);
  }

  getModalContent(type) {
    const isVideo = this.currentCall.type === 'video';
    
    switch (type) {
      case 'incoming':
        return `
          <div class="bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4 text-center">
            <div class="mb-6">
              <div class="w-24 h-24 rounded-full bg-blue-500 mx-auto mb-4 flex items-center justify-center">
                <i class="fas fa-user text-white text-3xl"></i>
              </div>
              <h3 class="text-white text-xl font-medium mb-2">Appel ${isVideo ? 'vidéo' : 'vocal'} entrant</h3>
              <p class="text-gray-300">Contact</p>
            </div>
            
            <div class="flex justify-center space-x-8">
              <button class="call-reject w-16 h-16 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600">
                <i class="fas fa-phone-slash text-white text-xl"></i>
              </button>
              <button class="call-answer w-16 h-16 bg-green-500 rounded-full flex items-center justify-center hover:bg-green-600">
                <i class="fas fa-phone text-white text-xl"></i>
              </button>
            </div>
          </div>
        `;
        
      case 'outgoing':
        return `
          <div class="bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4 text-center">
            <div class="mb-6">
              <div class="w-24 h-24 rounded-full bg-blue-500 mx-auto mb-4 flex items-center justify-center">
                <i class="fas fa-user text-white text-3xl"></i>
              </div>
              <h3 class="text-white text-xl font-medium mb-2">Appel en cours...</h3>
              <p class="text-gray-300">Contact</p>
            </div>
            
            <div class="flex justify-center">
              <button class="call-end w-16 h-16 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600">
                <i class="fas fa-phone-slash text-white text-xl"></i>
              </button>
            </div>
          </div>
        `;
        
      case 'active':
        return `
          <div class="w-full h-full flex flex-col">
            ${isVideo ? `
              <div class="flex-1 relative">
                <video id="remote-video" class="w-full h-full object-cover" autoplay></video>
                <video id="local-video" class="absolute top-4 right-4 w-32 h-24 object-cover rounded-lg border-2 border-white" autoplay muted></video>
              </div>
            ` : `
              <div class="flex-1 flex items-center justify-center">
                <div class="text-center">
                  <div class="w-32 h-32 rounded-full bg-blue-500 mx-auto mb-4 flex items-center justify-center">
                    <i class="fas fa-user text-white text-4xl"></i>
                  </div>
                  <h3 class="text-white text-2xl font-medium mb-2">Contact</h3>
                  <p class="text-gray-300 text-lg" id="call-duration">00:00</p>
                </div>
              </div>
            `}
            
            <div class="p-6 bg-gray-900 bg-opacity-80">
              <div class="flex justify-center space-x-6">
                <button class="call-mute w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center hover:bg-gray-500">
                  <i class="fas fa-microphone text-white"></i>
                </button>
                ${isVideo ? `
                  <button class="call-video w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center hover:bg-gray-500">
                    <i class="fas fa-video text-white"></i>
                  </button>
                ` : ''}
                <button class="call-end w-12 h-12 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600">
                  <i class="fas fa-phone-slash text-white"></i>
                </button>
              </div>
            </div>
          </div>
        `;
    }
  }

  attachEventListeners(type) {
    const answerBtn = this.modal.querySelector('.call-answer');
    const rejectBtn = this.modal.querySelector('.call-reject');
    const endBtn = this.modal.querySelector('.call-end');
    const muteBtn = this.modal.querySelector('.call-mute');
    const videoBtn = this.modal.querySelector('.call-video');

    answerBtn?.addEventListener('click', () => {
      callService.answerCall(this.currentCall.id);
    });

    rejectBtn?.addEventListener('click', () => {
      callService.rejectCall(this.currentCall.id);
    });

    endBtn?.addEventListener('click', () => {
      callService.endCall();
    });

    muteBtn?.addEventListener('click', () => {
      const isMuted = callService.toggleMute();
      const icon = muteBtn.querySelector('i');
      icon.className = isMuted ? 'fas fa-microphone-slash text-white' : 'fas fa-microphone text-white';
      muteBtn.classList.toggle('bg-red-500', isMuted);
    });

    videoBtn?.addEventListener('click', () => {
      const isVideoEnabled = callService.toggleVideo();
      const icon = videoBtn.querySelector('i');
      icon.className = isVideoEnabled ? 'fas fa-video text-white' : 'fas fa-video-slash text-white';
      videoBtn.classList.toggle('bg-red-500', !isVideoEnabled);
    });
  }

  startCallTimer() {
    this.callDuration = 0;
    this.callTimer = setInterval(() => {
      this.callDuration++;
      const durationElement = this.modal?.querySelector('#call-duration');
      if (durationElement) {
        const minutes = Math.floor(this.callDuration / 60);
        const seconds = this.callDuration % 60;
        durationElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }
    }, 1000);
  }

  removeModal() {
    if (this.callTimer) {
      clearInterval(this.callTimer);
      this.callTimer = null;
    }

    if (this.modal) {
      document.body.removeChild(this.modal);
      this.modal = null;
    }
  }
}