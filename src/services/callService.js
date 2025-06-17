import { eventBus } from '../utils/eventBus.js';
import { userService } from './userService.js';

class CallService {
  constructor() {
    this.currentCall = null;
    this.localStream = null;
    this.remoteStream = null;
    this.peerConnection = null;
  }

  async startCall(conversationId, type = 'voice') {
    try {
      const currentUser = userService.getCurrentUser();
      if (!currentUser) {
        throw new Error('Utilisateur non connecté');
      }

      // Demander l'accès aux médias
      const constraints = {
        audio: true,
        video: type === 'video'
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      const call = {
        id: this.generateId(),
        conversationId,
        callerId: currentUser.id,
        type,
        status: 'calling',
        startTime: new Date().toISOString()
      };

      this.currentCall = call;
      eventBus.emit('call:started', call);
      
      return call;
    } catch (error) {
      console.error('Erreur lors du démarrage de l\'appel:', error);
      throw error;
    }
  }

  async answerCall(callId) {
    try {
      if (!this.currentCall || this.currentCall.id !== callId) {
        throw new Error('Appel non trouvé');
      }

      const constraints = {
        audio: true,
        video: this.currentCall.type === 'video'
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      this.currentCall.status = 'connected';
      this.currentCall.answerTime = new Date().toISOString();
      
      eventBus.emit('call:answered', this.currentCall);
      
      return this.currentCall;
    } catch (error) {
      console.error('Erreur lors de la réponse à l\'appel:', error);
      throw error;
    }
  }

  rejectCall(callId) {
    if (this.currentCall && this.currentCall.id === callId) {
      this.currentCall.status = 'rejected';
      this.currentCall.endTime = new Date().toISOString();
      
      eventBus.emit('call:rejected', this.currentCall);
      this.endCall();
    }
  }

  endCall() {
    if (this.currentCall) {
      this.currentCall.status = 'ended';
      this.currentCall.endTime = new Date().toISOString();
      
      eventBus.emit('call:ended', this.currentCall);
    }

    // Nettoyer les ressources
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.currentCall = null;
  }

  toggleMute() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        eventBus.emit('call:muteToggled', { muted: !audioTrack.enabled });
        return !audioTrack.enabled;
      }
    }
    return false;
  }

  toggleVideo() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        eventBus.emit('call:videoToggled', { videoEnabled: videoTrack.enabled });
        return videoTrack.enabled;
      }
    }
    return false;
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

export const callService = new CallService();