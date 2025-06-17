import { eventBus } from '../utils/eventBus.js';
import { userService } from './userService.js';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  connect() {
    try {
      // Simulation d'une connexion WebSocket
      this.socket = {
        send: (data) => {
          console.log('Sending data:', data);
          // Simuler l'envoi de données
          this.handleMessage(data);
        },
        close: () => {
          this.isConnected = false;
          console.log('Socket disconnected');
        }
      };

      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      console.log('Socket connected');
      eventBus.emit('socket:connected');

      // Simuler la réception de messages
      this.startMessageSimulation();
      
    } catch (error) {
      console.error('Socket connection failed:', error);
      this.handleReconnect();
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.isConnected = false;
    }
  }

  sendMessage(message) {
    if (this.isConnected && this.socket) {
      this.socket.send(JSON.stringify({
        type: 'message',
        data: message
      }));
    }
  }

  sendTyping(conversationId, isTyping) {
    if (this.isConnected && this.socket) {
      this.socket.send(JSON.stringify({
        type: 'typing',
        data: { conversationId, isTyping }
      }));
    }
  }

  sendPresence(status) {
    if (this.isConnected && this.socket) {
      this.socket.send(JSON.stringify({
        type: 'presence',
        data: { status }
      }));
    }
  }

  handleMessage(data) {
    try {
      const message = typeof data === 'string' ? JSON.parse(data) : data;
      
      switch (message.type) {
        case 'message':
          eventBus.emit('socket:messageReceived', message.data);
          break;
        case 'typing':
          eventBus.emit('socket:typingReceived', message.data);
          break;
        case 'presence':
          eventBus.emit('socket:presenceReceived', message.data);
          break;
        case 'messageStatus':
          eventBus.emit('socket:messageStatusReceived', message.data);
          break;
      }
    } catch (error) {
      console.error('Error handling socket message:', error);
    }
  }

  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('Max reconnection attempts reached');
      eventBus.emit('socket:connectionFailed');
    }
  }

  startMessageSimulation() {
    // Simuler la réception de messages pour les tests
    setInterval(() => {
      if (Math.random() > 0.95) { // 5% de chance de recevoir un message
        const simulatedMessage = {
          id: Date.now().toString(),
          conversationId: 'conv1',
          senderId: 'user2',
          content: 'Message simulé',
          type: 'text',
          timestamp: new Date().toISOString(),
          status: 'sent'
        };
        
        eventBus.emit('socket:messageReceived', simulatedMessage);
      }
    }, 5000);
  }
}

export const socketService = new SocketService();