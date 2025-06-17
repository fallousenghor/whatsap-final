import { 
  sendMessage, 
  getMessagesBetweenUsers, 
  getGroupMessages,
  markMessageAsRead
} from "../services/message.service.js";
import { getContactById } from "../services/contact.service.js";
import { getGroupeById } from "../services/groupe.service.js";
import { refreshDiscussions } from "./discussion.controller.js";
import { createOrUpdateDiscussion } from "../services/discussion.service.js";
import { notifications } from "../utils/notifications.js";

let currentConversation = null;
let messagePollingInterval = null;

export function setupMessageEvents() {
  const messageInput = document.getElementById('message-input');
  const sendButton = document.getElementById('send-button');

  if (!messageInput || !sendButton) {
    console.error('Éléments de messagerie non trouvés');
    return;
  }

  console.log('Événements de messagerie configurés');

  // Envoi de message
  sendButton.addEventListener('click', handleSendMessage);
  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });

  // Activer/désactiver le bouton d'envoi selon le contenu
  messageInput.addEventListener('input', () => {
    const hasContent = messageInput.value.trim().length > 0;
    sendButton.disabled = !hasContent || !currentConversation;
    sendButton.classList.toggle('opacity-50', !hasContent || !currentConversation);
  });

  // Démarrer le polling des messages
  startMessagePolling();
}

async function handleSendMessage() {
  const messageInput = document.getElementById('message-input');
  const messageText = messageInput.value.trim();
  
  if (!messageText || !currentConversation) {
    console.log('Pas de texte ou pas de conversation courante');
    console.log('Message:', messageText);
    console.log('Conversation:', currentConversation);
    return;
  }

  try {
    const currentUser = JSON.parse(localStorage.getItem('user'));
    if (!currentUser?.id) {
      notifications.error('Utilisateur non connecté');
      return;
    }

    console.log('Envoi du message:', messageText, 'à:', currentConversation);

    const messageData = {
      content: messageText,
      type: 'text',
      senderId: currentUser.id,
      timestamp: new Date().toISOString(),
      status: 'sent'
    };

    if (currentConversation.type === 'contact') {
      messageData.receiverId = currentConversation.id;
      
      console.log('Message pour contact:', messageData);
      
      // Créer ou mettre à jour la discussion
      await createOrUpdateDiscussion({
        contactId: currentConversation.id,
        participants: [currentUser.id, currentConversation.id],
        lastMessage: {
          content: messageText,
          senderId: currentUser.id,
          timestamp: new Date().toISOString(),
          status: 'sent'
        },
        hasUnreadMessages: false
      });
    } else if (currentConversation.type === 'group') {
      messageData.groupId = currentConversation.id;
      
      console.log('Message pour groupe:', messageData);
      
      // Créer ou mettre à jour la discussion de groupe
      await createOrUpdateDiscussion({
        groupId: currentConversation.id,
        isGroup: true,
        participants: [currentUser.id],
        lastMessage: {
          content: messageText,
          senderId: currentUser.id,
          timestamp: new Date().toISOString(),
          status: 'sent'
        },
        hasUnreadMessages: false
      });
    }

    // Envoyer le message
    const sentMessage = await sendMessage(messageData);
    console.log('Message envoyé avec succès:', sentMessage);

    // Vider le champ de saisie
    messageInput.value = '';
    
    // Désactiver le bouton d'envoi
    const sendButton = document.getElementById('send-button');
    sendButton.disabled = true;
    sendButton.classList.add('opacity-50');
    
    // Rafraîchir les messages immédiatement
    await loadMessages();
    
    // Rafraîchir les discussions
    setTimeout(() => {
      refreshDiscussions();
    }, 500);
    
    notifications.success('Message envoyé');
    
  } catch (error) {
    console.error('Erreur envoi message:', error);
    notifications.error('Erreur lors de l\'envoi du message: ' + error.message);
  }
}

export async function setCurrentConversation(type, id, name) {
  console.log('Définition de la conversation courante:', { type, id, name });
  
  currentConversation = { type, id, name };
  
  // Mettre à jour l'interface
  const contactNameElement = document.getElementById('contactName');
  const firstCharElement = document.getElementById('firstChar');
  const contactStatusElement = document.getElementById('contactStatus');
  const messageInput = document.getElementById('message-input');
  const sendButton = document.getElementById('send-button');
  
  // Activer la zone de saisie et le bouton d'envoi
  if (messageInput) {
    messageInput.disabled = false;
    messageInput.placeholder = 'Tapez un message';
  }

  if (sendButton) {
    sendButton.disabled = false;
  }
  
  if (contactNameElement) {
    contactNameElement.textContent = name;
  }
  
  if (firstCharElement && name) {
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
    firstCharElement.textContent = initials;
    firstCharElement.innerHTML = initials;
    
    // Changer la couleur selon le type
    firstCharElement.className = `avatar ${type === 'group' ? 'bg-green-500' : 'bg-blue-500'}`;
  }

  if (contactStatusElement) {
    contactStatusElement.textContent = type === 'group' ? 'Groupe' : 'en ligne';
  }

  // Activer la zone de saisie
  if (messageInput) {
    messageInput.disabled = false;
    messageInput.placeholder = `Envoyer un message à ${name}`;
    messageInput.focus();
  }

  if (sendButton) {
    sendButton.disabled = !messageInput?.value.trim();
    sendButton.classList.toggle('opacity-50', !messageInput?.value.trim());
  }

  // Charger les messages
  await loadMessages();
}

async function loadMessages() {
  if (!currentConversation) {
    console.log('Pas de conversation courante pour charger les messages');
    return;
  }

  const messagesContainer = document.getElementById('messages-container');
  if (!messagesContainer) {
    console.error('Conteneur de messages non trouvé');
    return;
  }

  try {
    let messages = [];
    const currentUser = JSON.parse(localStorage.getItem('user'));

    console.log('Chargement des messages pour:', currentConversation);

    if (currentConversation.type === 'contact') {
      messages = await getMessagesBetweenUsers(currentUser.id, currentConversation.id);
    } else if (currentConversation.type === 'group') {
      messages = await getGroupMessages(currentConversation.id);
    }

    console.log('Messages récupérés:', messages);

    // Marquer les messages comme lus
    const unreadMessages = messages.filter(m => 
      m.receiverId === currentUser.id && m.status !== 'read'
    );
    
    for (const message of unreadMessages) {
      try {
        await markMessageAsRead(message.id);
      } catch (error) {
        console.error('Erreur marquage message lu:', error);
      }
    }

    displayMessages(messages, currentUser.id);
    
  } catch (error) {
    console.error('Erreur chargement messages:', error);
    displayEmptyMessages();
  }
}

function displayEmptyMessages() {
  const messagesContainer = document.getElementById('messages-container');
  if (!messagesContainer) return;

  messagesContainer.innerHTML = `
    <div class="text-center p-8 text-gray-400">
      <i class="fas fa-comment-dots text-4xl mb-4"></i>
      <p>Aucun message dans cette conversation</p>
      <p class="text-sm mt-2">Envoyez le premier message !</p>
    </div>
  `;
}

function displayMessages(messages, currentUserId) {
  const messagesContainer = document.getElementById('messages-container');
  if (!messagesContainer) return;

  if (messages.length === 0) {
    displayEmptyMessages();
    return;
  }

  // Trier les messages par timestamp
  const sortedMessages = messages.sort((a, b) => 
    new Date(a.timestamp) - new Date(b.timestamp)
  );

  // Grouper les messages par date
  const messagesByDate = groupMessagesByDate(sortedMessages);
  
  let messagesHTML = '';

  Object.entries(messagesByDate).forEach(([date, dayMessages]) => {
    // Ajouter le séparateur de date
    messagesHTML += `
      <div class="text-center mb-6">
        <span class="bg-gray-700 px-3 py-1 rounded-full text-xs text-gray-300">
          ${formatDateSeparator(date)}
        </span>
      </div>
    `;

    // Ajouter les messages du jour
    dayMessages.forEach(message => {
      const isOwn = message.senderId === currentUserId;
      const time = new Date(message.timestamp).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      });

      if (isOwn) {
        messagesHTML += `
          <div class="flex justify-end mb-4">
            <div class="message-bubble bg-green-600 p-3 max-w-xs lg:max-w-md">
              <p class="text-sm text-white break-words">${escapeHtml(message.content)}</p>
              <div class="flex items-center justify-end space-x-1 mt-1">
                <span class="text-xs text-green-200">${time}</span>
                <i class="fas fa-check-double ${getStatusIcon(message.status)}"></i>
              </div>
            </div>
          </div>
        `;
      } else {
        messagesHTML += `
          <div class="flex items-start space-x-2 mb-4">
            <div class="avatar bg-blue-500 text-xs">
              ${currentConversation.name ? currentConversation.name.split(' ').map(n => n[0]).join('') : 'U'}
            </div>
            <div class="message-bubble bg-gray-700 p-3 max-w-xs lg:max-w-md">
              <p class="text-sm text-white break-words">${escapeHtml(message.content)}</p>
              <span class="text-xs text-gray-400">${time}</span>
            </div>
          </div>
        `;
      }
    });
  });

  messagesContainer.innerHTML = messagesHTML;
  
  // Scroll vers le bas
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function groupMessagesByDate(messages) {
  const groups = {};
  
  messages.forEach(message => {
    const date = new Date(message.timestamp).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
  });

  return groups;
}

function formatDateSeparator(dateString) {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Aujourd\'hui';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Hier';
  } else {
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getStatusIcon(status) {
  switch (status) {
    case 'sent':
      return 'text-gray-400';
    case 'delivered':
      return 'text-blue-300';
    case 'read':
      return 'text-blue-400';
    default:
      return 'text-gray-400';
  }
}

function startMessagePolling() {
  if (messagePollingInterval) {
    clearInterval(messagePollingInterval);
  }
  
  messagePollingInterval = setInterval(async () => {
    if (currentConversation) {
      await loadMessages();
    }
  }, 5000); // Vérifier les nouveaux messages toutes les 5 secondes
}

export function stopMessagePolling() {
  if (messagePollingInterval) {
    clearInterval(messagePollingInterval);
    messagePollingInterval = null;
  }
}

// Fonction pour réinitialiser la conversation
export function clearCurrentConversation() {
  currentConversation = null;
  
  const contactNameElement = document.getElementById('contactName');
  const firstCharElement = document.getElementById('firstChar');
  const contactStatusElement = document.getElementById('contactStatus');
  const messageInput = document.getElementById('message-input');
  const sendButton = document.getElementById('send-button');
  const messagesContainer = document.getElementById('messages-container');
  
  if (contactNameElement) {
    contactNameElement.textContent = 'Sélectionnez une conversation';
  }
  
  if (firstCharElement) {
    firstCharElement.innerHTML = '<i class="fas fa-user"></i>';
    firstCharElement.className = 'avatar bg-gray-500';
  }

  if (contactStatusElement) {
    contactStatusElement.textContent = '';
  }

  if (messageInput) {
    messageInput.disabled = true;
    messageInput.placeholder = 'Entrez un message';
    messageInput.value = '';
  }

  if (sendButton) {
    sendButton.disabled = true;
    sendButton.classList.add('opacity-50');
  }

  if (messagesContainer) {
    messagesContainer.innerHTML = `
      <div class="text-center p-8 text-gray-400">
        <i class="fas fa-comment-dots text-4xl mb-4"></i>
        <p>Sélectionnez une conversation pour commencer à discuter</p>
      </div>
    `;
  }
}