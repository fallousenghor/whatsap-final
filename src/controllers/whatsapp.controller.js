import { setupContactEvents } from "./contact.controller.js";
import { setupNouvelleDiscussionEvents } from "./nouvelle.discussion.controller.js";
import { setupGroupeEvents } from "./groupe.controller.js";
import { setupMessageEvents, setCurrentConversation } from "./message.controller.js";
import { setupDiscussionEvents, startDiscussionPolling } from "./discussion.controller.js";
import {
  getContacts,
  getContactById,
  blockContact,
  getBlockedContacts,
  unblockContact,
} from "../services/contact.service.js";
import {
  getGroupesByUserId,
  updateGroupe,
  getGroupeById,
} from "../services/groupe.service.js";
import { updateContactsList } from "../utils/utils.js";
import { templates } from "../../public/views/components/template.js";
import { notifications } from "../utils/notifications.js";
import { ModalManager } from "../utils/modal.js";

let selectedContactId = null;

async function loadTemplate(url, panelId = "panel", setupFunction = null) {
  try {
    const panel = document.getElementById(panelId);
    if (!panel) return;

    const response = await fetch(url);
    const html = await response.text();
    panel.innerHTML = html;

    if (setupFunction) {
      // Use requestAnimationFrame to ensure DOM elements are fully parsed and available
      requestAnimationFrame(() => {
        setupFunction();
      });
    }
  } catch (error) {
    console.error(`Erreur de chargement (${url}):`, error);
    notifications.error("Erreur lors du chargement de la page");
  }
}

async function showContactInfo(contact) {
  const modal = document.createElement("div");
  modal.classList = "mod";
  modal.innerHTML = templates.contactInfo(contact);
  document.body.appendChild(modal);

  modal.querySelector(".close-btn").addEventListener("click", () => {
    modal.remove();
  });
}

async function updateBlockedContactsCounter() {
  try {
    const blockedContacts = await getBlockedContacts();
    const nombreBloquer = document.getElementById("nombreBloquer");
    if (nombreBloquer) {
      nombreBloquer.textContent = blockedContacts.length;
    }
  } catch (error) {
    console.error("Erreur lors de la mise à jour du compteur:", error);
  }
}

async function displayGroupes() {
  const groupesList = document.getElementById("groupes-list");
  if (!groupesList) {
    console.error("Element groupes-list non trouvé");
    return;
  }

  // Afficher un indicateur de chargement
  groupesList.innerHTML = `
    <div class="text-center p-8 text-gray-400">
      <i class="fas fa-spinner fa-spin text-4xl mb-4"></i>
      <p>Chargement des groupes...</p>
    </div>
  `;

  try {
    const currentUser = JSON.parse(localStorage.getItem("user"));

    if (!currentUser?.id) {
      throw new Error("Utilisateur non connecté");
    }

    const groupes = await getGroupesByUserId(currentUser.id);
    const activeGroupes = groupes.filter((g) => !g.closed);

    if (activeGroupes.length === 0) {
      groupesList.innerHTML = `
        <div class="text-center p-8 text-gray-400">
          <i class="fas fa-users text-4xl mb-4"></i>
          <p>Aucun groupe trouvé</p>
          <p class="text-sm mt-2">Créez votre premier groupe pour commencer</p>
          <button 
            class="mt-4 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            onclick="document.getElementById('newgroup').click()"
          >
            Créer un groupe
          </button>
        </div>
      `;
      return;
    }

    groupesList.innerHTML = activeGroupes
      .map(
        (groupe) => `
        <div class="groupe-item p-4 hover:bg-gray-700 cursor-pointer border-b border-gray-600" data-group-id="${
          groupe.id
        }">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div class="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center">
                <i class="fas fa-users text-white"></i>
              </div>
              <div>
                <h3 class="text-white font-medium">${groupe.nom}</h3>
                <p class="text-gray-400 text-sm">
                  ${groupe.membres ? groupe.membres.length : 0} membres
                  ${
                    groupe.admins && groupe.admins.length > 1
                      ? ` • ${groupe.admins.length} admins`
                      : ""
                  }
                </p>
              </div>
            </div>
            <div class="flex space-x-2">
              <button 
                class="text-gray-400 hover:text-white p-1"
                onclick="showGroupOptions('${groupe.id}')"
                title="Options du groupe"
              >
                <i class="fas fa-ellipsis-v"></i>
              </button>
            </div>
          </div>
          
          <!-- Menu d'options du groupe (caché par défaut) -->
          <div id="group-options-${
            groupe.id
          }" class="hidden mt-3 bg-gray-800 rounded-lg p-2 space-y-1">
            <button 
              class="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded flex items-center space-x-2"
              onclick="showAddMemberModal('${groupe.id}')"
            >
              <i class="fas fa-user-plus"></i>
              <span>Ajouter des membres</span>
            </button>
            <button 
              class="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded flex items-center space-x-2"
              onclick="showRemoveMemberModal('${groupe.id}')"
            >
              <i class="fas fa-user-minus"></i>
              <span>Retirer des membres</span>
            </button>
            <button 
              class="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded flex items-center space-x-2"
              onclick="showManageAdminsModal('${groupe.id}')"
            >
              <i class="fas fa-crown"></i>
              <span>Gérer les admins</span>
            </button>
            <button 
              class="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-gray-700 rounded flex items-center space-x-2"
              onclick="closeGroup('${groupe.id}')"
            >
              <i class="fas fa-times-circle"></i>
              <span>Fermer le groupe</span>
            </button>
          </div>
        </div>
      `
      )
      .join("");

    // Ajouter les événements de clic pour les groupes
    document.querySelectorAll('.groupe-item').forEach(item => {
      item.addEventListener('click', async (e) => {
        // Éviter de déclencher l'événement si on clique sur les boutons d'options
        if (e.target.closest('button')) return;
        
        const groupId = item.dataset.groupId;
        try {
          const groupe = await getGroupeById(groupId);
          if (groupe) {
            await setCurrentConversation('group', groupe.id, groupe.nom);
            
            // Marquer comme sélectionné
            document.querySelectorAll('.groupe-item').forEach(i => 
              i.classList.remove('border-green-500', 'bg-gray-750')
            );
            item.classList.add('border-green-500', 'bg-gray-750');
            
            // notifications.success(`Conversation avec le groupe ${groupe.nom} ouverte`);
          }
        } catch (error) {
          console.error('Erreur ouverture groupe:', error);
          notifications.error('Erreur lors de l\'ouverture du groupe');
        }
      });
    });

  } catch (error) {
    console.error("Erreur lors du chargement des groupes:", error);
    groupesList.innerHTML = `
      <div class="text-center p-8 text-red-400">
        <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
        <p>Erreur lors du chargement des groupes</p>
        <p class="text-sm mt-2">${error.message}</p>
        <button 
          class="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          onclick="displayGroupes()"
        >
          Réessayer
        </button>
      </div>
    `;
  }
}

async function toggleGroupesView() {
  const groupesContainer = document.getElementById("groupes-container");
  const conversationsList = document.querySelector(
    "#panel .overflow-y-auto:last-child"
  );
  const groupesBtn = document.getElementById("groupesBtn");
  const allTabs = document.querySelectorAll(
    "#panel .flex.border-b.border-gray-700 button"
  );

  if (!groupesContainer || !conversationsList) {
    console.error("Éléments manquants:", {
      groupesContainer,
      conversationsList,
    });
    return;
  }

  // Réinitialiser tous les onglets
  allTabs.forEach((tab) => {
    tab.classList.remove(
      "text-green-500",
      "border-b-2",
      "border-green-500",
      "font-medium"
    );
    tab.classList.add("text-gray-400", "hover:text-white");
  });

  if (groupesContainer.classList.contains("hidden")) {
    // Afficher les groupes
    groupesContainer.classList.remove("hidden");
    conversationsList.classList.add("hidden");

    // Activer l'onglet Groupes
    if (groupesBtn) {
      groupesBtn.classList.remove("text-gray-400", "hover:text-white");
      groupesBtn.classList.add(
        "text-green-500",
        "border-b-2",
        "border-green-500",
        "font-medium"
      );
    }

    await displayGroupes();
  } else {
    // Masquer les groupes et afficher les conversations
    groupesContainer.classList.add("hidden");
    conversationsList.classList.remove("hidden");

    // Activer l'onglet "Toutes"
    const toutesBtn = allTabs[0];
    if (toutesBtn) {
      toutesBtn.classList.remove("text-gray-400", "hover:text-white");
      toutesBtn.classList.add(
        "text-green-500",
        "border-b-2",
        "border-green-500",
        "font-medium"
      );
    }
  }
}

export async function setupPanelEvents() {
  document.addEventListener("click", async (event) => {
    const pup = document.getElementById("pup");

    const buttonHandlers = {
      "#plus": "/views/pages/nouvelle.discussion.html",
      "#retourbtn": "/views/pages/nouvelle.discussion.html",
      "#newContact": "/views/pages/newContact.view.html",
      "#backnewgroupe": "/views/pages/nouvelle.discussion.html",
      "#paramsBtn": "/views/components/params.html",
      "#confback": "/views/components/params.html",
      "#blockback": "/views/components/bloquerListe.html",
      "#contactBlocked": "/views/components/bloquerListe.html",
      "#newgroup": "/views/pages/nouveau.groupe.html",
      "#listedescontactbloquer": "/views/components/listecontactbloquer.html",
    };

    for (const [selector, url] of Object.entries(buttonHandlers)) {
      if (event.target.closest(selector)) {
        let setupFn;
        if (selector === "#plus" || selector === "#retourbtn") {
          setupFn = setupNouvelleDiscussionEvents;
        } else if (selector === "#newgroup") {
          setupFn = setupGroupeEvents;
        } else if (selector === "#listedescontactbloquer") {
          setupFn = displayBlockedContacts;
        } else if (selector === "#contactBlocked") {
          setupFn = async () => {
            await displayBlockedContacts();
            await updateBlockedContactsCounter();
          };
        } else {
          setupFn = setupContactEvents;
        }

        await loadTemplate(url, "panel", setupFn);
        return;
      }
    }

    // Gestion du clic sur l'onglet Groupes
    if (event.target.closest("#tab-groups")) {
      await toggleGroupesView();
      return;
    }

    const menupopup = event.target.closest("#menupopup");
    if (menupopup) {
      try {
        const response = await fetch("/views/components/popup.html");
        const html = await response.text();
        pup.innerHTML = html;
        pup.style.display = "block";

        pup.querySelector(".info-btn")?.addEventListener("click", async () => {
          if (!selectedContactId) {
            notifications.warning("Veuillez sélectionner un contact");
            return;
          }
          try {
            const contact = await getContactById(selectedContactId);
            showContactInfo(contact);
            pup.style.display = "none";
          } catch (error) {
            notifications.error("Erreur lors de la récupération des informations");
            console.error(error);
          }
        });

        pup.querySelector(".block-btn")?.addEventListener("click", async () => {
          if (!selectedContactId) {
            notifications.warning("Veuillez sélectionner un contact");
            return;
          }
          
          ModalManager.confirm(
            "Êtes-vous sûr de vouloir bloquer ce contact ?",
            async () => {
              try {
                await blockContact(selectedContactId);
                const contactElement = document.querySelector(
                  `[data-contact-id="${selectedContactId}"]`
                );
                if (contactElement) contactElement.remove();

                // Mettre à jour le compteur de contacts bloqués
                await updateBlockedContactsCounter();

                notifications.success("Contact bloqué avec succès");
                pup.style.display = "none";
              } catch (error) {
                notifications.error("Erreur lors du blocage du contact");
                console.error(error);
              }
            }
          );
        });
      } catch (error) {
        console.error("Erreur lors du chargement du popup:", error);
        notifications.error("Erreur lors du chargement du menu");
      }
    } else if (!event.target.closest("#pup")) {
      pup.style.display = "none";
    }

    const reurnInfo = event.target.closest("#reurnInfo .close-btn");
    if (reurnInfo) {
      reurnInfo.closest("#reurnInfo").remove();
    }
  });
}

export function setupAccueilEvents() {
  console.log('Configuration des événements d\'accueil');
  
  // Initialiser les événements de messagerie
  setupMessageEvents();
  
  // Initialiser les discussions
  setupDiscussionEvents();
  
  // Démarrer le polling des discussions
  startDiscussionPolling();

  // Configurer la sélection de contacts
  setupContactSelection();

  document.addEventListener("click", (event) => {
    if (event.target.closest("#logoutBtn")) {
      ModalManager.confirm(
        "Êtes-vous sûr de vouloir vous déconnecter ?",
        () => {
          localStorage.removeItem("user");
          notifications.info("Déconnexion réussie");
          setTimeout(() => {
            location.reload();
          }, 1000);
        }
      );
    }
  });
}

export function setupSidebarEvents() {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      ModalManager.confirm(
        "Êtes-vous sûr de vouloir vous déconnecter ?",
        () => {
          localStorage.removeItem("user");
          localStorage.removeItem("contacts");
          notifications.info("Déconnexion réussie");
          setTimeout(() => {
            window.location.href = "/views/pages/login.views.html";
          }, 1000);
        }
      );
    });
  }
}

export function setupContactSelection() {
  console.log('Configuration de la sélection de contacts');
  
  document.addEventListener("click", async (event) => {
    // Gestion des clics sur les éléments de discussion
    const discussionItem = event.target.closest(".discussion-item");
    if (discussionItem && !event.target.closest('button')) {
      console.log('Clic sur discussion item:', discussionItem);
      
      const discussionId = discussionItem.dataset.discussionId;
      const discussionType = discussionItem.dataset.discussionType;
      const discussionName = discussionItem.dataset.discussionName;

      if (discussionId && discussionType && discussionName) {
        // Désélectionner tous les autres éléments
        document.querySelectorAll(".discussion-item, .contact-item").forEach((item) => 
          item.classList.remove("selected", "border-green-500", "bg-gray-750")
        );
        
        // Sélectionner l'élément cliqué
        discussionItem.classList.add("selected", "border-green-500", "bg-gray-750");
        selectedContactId = discussionId;

        try {
          await setCurrentConversation(discussionType, discussionId, discussionName);
          // notifications.success(`Conversation avec ${discussionName} ouverte`);
        } catch (error) {
          console.error("Erreur:", error);
          notifications.error("Erreur lors de l'ouverture de la conversation");
        }
      }
      return;
    }

    // Gestion des clics sur les contacts (pour la compatibilité)
    const contactItem = event.target.closest(".contact-item");
    if (contactItem && !event.target.closest('button')) {
      console.log('Clic sur contact item:', contactItem);
      
      // Désélectionner tous les autres contacts
      document.querySelectorAll(".contact-item, .discussion-item").forEach((item) => 
        item.classList.remove("selected", "border-green-500", "bg-gray-750")
      );
      
      // Sélectionner le contact cliqué
      contactItem.classList.add("selected", "border-green-500", "bg-gray-750");
      selectedContactId = contactItem.dataset.contactId;

      try {
        const contact = await getContactById(selectedContactId);
        if (contact) {
          console.log('Contact sélectionné:', contact);
          
          // Définir la conversation courante
          await setCurrentConversation('contact', contact.id, `${contact.prenom} ${contact.nom}`);
          
          // notifications.success(`Conversation avec ${contact.prenom} ${contact.nom} ouverte`);
        }
      } catch (error) {
        console.error("Erreur:", error);
        notifications.error("Erreur lors de l'ouverture de la conversation");
      }
    }
  });
}

async function displayBlockedContacts() {
  const blockedContactsList = document.getElementById("blocked-contacts-list");
  if (!blockedContactsList) return;

  try {
    const blockedContacts = await getBlockedContacts();
    blockedContactsList.innerHTML =
      templates.blockedContactsList(blockedContacts);

    // Mettre à jour le compteur de contacts bloqués
    await updateBlockedContactsCounter();

    blockedContactsList.addEventListener("click", async (e) => {
      const unblockBtn = e.target.closest(".unblock-btn");
      if (!unblockBtn) return;

      const contactItem = unblockBtn.closest(".blocked-contact-item");
      const contactId = contactItem?.dataset.contactId;
      if (!contactId) return;

      ModalManager.confirm(
        "Êtes-vous sûr de vouloir débloquer ce contact ?",
        async () => {
          try {
            await unblockContact(contactId);
            contactItem.remove();

            const currentUser = JSON.parse(localStorage.getItem("user"));
            if (currentUser?.id) {
              const contacts = await getContacts(currentUser.id);
              updateContactsList(contacts);
            }

            if (blockedContactsList.children.length === 0) {
              blockedContactsList.innerHTML = templates.blockedContactsList([]);
            }

            // Mettre à jour le compteur après déblocage
            await updateBlockedContactsCounter();
            notifications.success("Contact débloqué avec succès");
          } catch (error) {
            console.error("Erreur lors du déblocage:", error);
            notifications.error("Erreur lors du déblocage du contact");
          }
        }
      );
    });
  } catch (error) {
    console.error("Erreur lors du chargement des contacts bloqués:", error);
    blockedContactsList.innerHTML = templates.blockedContactsError;
  }
}

// Rendre displayGroupes accessible globalement pour le débogage
window.displayGroupes = displayGroupes;

// Fonctions globales pour la gestion des groupes
window.showGroupOptions = (groupId) => {
  // Fermer tous les autres menus d'options
  document.querySelectorAll('[id^="group-options-"]').forEach((menu) => {
    if (menu.id !== `group-options-${groupId}`) {
      menu.classList.add("hidden");
    }
  });

  // Basculer le menu d'options du groupe sélectionné
  const optionsMenu = document.getElementById(`group-options-${groupId}`);
  if (optionsMenu) {
    optionsMenu.classList.toggle("hidden");
  }
};

window.showAddMemberModal = async (groupId) => {
  try {
    const currentUser = JSON.parse(localStorage.getItem("user"));
    if (!currentUser?.id) {
      notifications.error("Utilisateur non connecté");
      return;
    }

    // Récupérer le groupe et tous les contacts de l'utilisateur
    const groupe = await getGroupeById(groupId);
    const allContacts = await getContacts(currentUser.id);

    if (!groupe) {
      notifications.error("Groupe introuvable !");
      return;
    }

    // Filtrer les contacts qui ne sont pas déjà membres du groupe
    const availableContacts = allContacts.filter(
      (contact) => !groupe.membres.includes(contact.id) && !contact.blocked
    );

    if (availableContacts.length === 0) {
      notifications.info("Aucun contact disponible à ajouter");
      return;
    }

    const modal = document.createElement("div");
    modal.className =
      "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50";
    modal.innerHTML = `
      <div class="bg-gray-800 rounded-lg p-6 w-96 max-h-96 overflow-y-auto">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-white text-lg font-medium">Ajouter des membres</h3>
          <button class="text-gray-400 hover:text-white" onclick="this.closest('.fixed').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="space-y-2">
          ${availableContacts
            .map(
              (contact) => `
            <div class="flex items-center justify-between p-2 hover:bg-gray-700 rounded">
              <div class="flex items-center space-x-3">
                <div class="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm">
                  ${contact.prenom[0]}${contact.nom[0]}
                </div>
                <div>
                  <div class="text-white text-sm">${contact.prenom} ${contact.nom}</div>
                  <div class="text-gray-400 text-xs">${contact.telephone}</div>
                </div>
              </div>
              <button 
                class="text-green-500 hover:text-green-400 text-sm"
                onclick="addMemberToGroup('${groupId}', '${contact.id}', this)"
              >
                Ajouter
              </button>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  } catch (error) {
    console.error("Erreur:", error);
    notifications.error("Erreur lors du chargement des contacts");
  }
};

window.showRemoveMemberModal = async (groupId) => {
  try {
    const currentUser = JSON.parse(localStorage.getItem("user"));
    if (!currentUser?.id) {
      notifications.error("Utilisateur non connecté");
      return;
    }

    const groupe = await getGroupeById(groupId);

    if (!groupe || !groupe.membres || groupe.membres.length === 0) {
      notifications.info("Aucun membre à retirer");
      return;
    }

    // Récupérer les détails des membres
    const membersDetails = await Promise.all(
      groupe.membres.map(async (memberId) => {
        try {
          return await getContactById(memberId);
        } catch (error) {
          console.error(
            `Erreur lors de la récupération du contact ${memberId}:`,
            error
          );
          return null;
        }
      })
    );

    const validMembers = membersDetails.filter((member) => member !== null);

    if (validMembers.length === 0) {
      notifications.info("Aucun membre valide trouvé");
      return;
    }

    const modal = document.createElement("div");
    modal.className =
      "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50";
    modal.innerHTML = `
      <div class="bg-gray-800 rounded-lg p-6 w-96 max-h-96 overflow-y-auto">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-white text-lg font-medium">Retirer des membres</h3>
          <button class="text-gray-400 hover:text-white" onclick="this.closest('.fixed').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="space-y-2">
          ${validMembers
            .map(
              (member) => `
            <div class="flex items-center justify-between p-2 hover:bg-gray-700 rounded">
              <div class="flex items-center space-x-3">
                <div class="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white text-sm">
                  ${member.prenom[0]}${member.nom[0]}
                </div>
                <div>
                  <div class="text-white text-sm">${member.prenom} ${member.nom}</div>
                  <div class="text-gray-400 text-xs">${member.telephone}</div>
                </div>
              </div>
              <button 
                class="text-red-500 hover:text-red-400 text-sm"
                onclick="removeMemberFromGroup('${groupId}', '${member.id}', this)"
              >
                Retirer
              </button>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  } catch (error) {
    console.error("Erreur:", error);
    notifications.error("Erreur lors du chargement des membres");
  }
};

window.showManageAdminsModal = async (groupId) => {
  try {
    const currentUser = JSON.parse(localStorage.getItem("user"));
    if (!currentUser?.id) {
      notifications.error("Utilisateur non connecté");
      return;
    }

    const groupe = await getGroupeById(groupId);

    if (!groupe || !groupe.membres || groupe.membres.length === 0) {
      notifications.info("Aucun membre dans le groupe");
      return;
    }

    // Récupérer les détails des membres
    const membersDetails = await Promise.all(
      groupe.membres.map(async (memberId) => {
        try {
          const contact = await getContactById(memberId);
          return {
            ...contact,
            isAdmin: groupe.admins && groupe.admins.includes(memberId),
            isCreator: groupe.adminId === memberId,
          };
        } catch (error) {
          console.error(
            `Erreur lors de la récupération du contact ${memberId}:`,
            error
          );
          return null;
        }
      })
    );

    const validMembers = membersDetails.filter((member) => member !== null);

    const modal = document.createElement("div");
    modal.className =
      "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50";
    modal.innerHTML = `
      <div class="bg-gray-800 rounded-lg p-6 w-96 max-h-96 overflow-y-auto">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-white text-lg font-medium">Gérer les administrateurs</h3>
          <button class="text-gray-400 hover:text-white" onclick="this.closest('.fixed').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="space-y-2">
          ${validMembers
            .map(
              (member) => `
            <div class="flex items-center justify-between p-2 hover:bg-gray-700 rounded">
              <div class="flex items-center space-x-3">
                <div class="w-8 h-8 rounded-full ${
                  member.isAdmin ? "bg-yellow-500" : "bg-gray-500"
                } flex items-center justify-center text-white text-sm">
                  ${
                    member.isAdmin
                      ? '<i class="fas fa-crown text-xs"></i>'
                      : member.prenom[0] + member.nom[0]
                  }
                </div>
                <div>
                  <div class="text-white text-sm">
                    ${member.prenom} ${member.nom}
                    ${
                      member.isCreator
                        ? '<span class="text-blue-400 text-xs ml-2">Créateur</span>'
                        : member.isAdmin
                        ? '<span class="text-yellow-400 text-xs ml-2">Admin</span>'
                        : ""
                    }
                  </div>
                  <div class="text-gray-400 text-xs">${member.telephone}</div>
                </div>
              </div>
              ${
                member.isCreator
                  ? '<span class="text-gray-500 text-sm">Créateur</span>'
                  : `<button 
                class="${
                  member.isAdmin
                    ? "text-red-500 hover:text-red-400"
                    : "text-yellow-500 hover:text-yellow-400"
                } text-sm"
                onclick="toggleAdminStatus('${groupId}', '${member.id}', ${
                      member.isAdmin
                    }, this)"
              >
                ${member.isAdmin ? "Retirer admin" : "Nommer admin"}
              </button>`
              }
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  } catch (error) {
    console.error("Erreur:", error);
    notifications.error("Erreur lors du chargement des membres");
  }
};

window.addMemberToGroup = async (groupId, memberId, buttonElement) => {
  try {
    const groupe = await getGroupeById(groupId);

    if (!groupe) {
      notifications.error("Groupe introuvable !");
      return;
    }

    if (groupe.membres.includes(memberId)) {
      notifications.warning("Le membre est déjà dans le groupe !");
      return;
    }

    // Ajouter le membre au groupe
    groupe.membres.push(memberId);
    await updateGroupe(groupe);

    buttonElement.textContent = "Ajouté";
    buttonElement.disabled = true;
    buttonElement.classList.remove("text-green-500", "hover:text-green-400");
    buttonElement.classList.add("text-gray-500");

    setTimeout(() => {
      const modal = buttonElement.closest(".fixed");
      if (modal) modal.remove();
      displayGroupes(); // Rafraîchir l'affichage des groupes
    }, 1000);

    notifications.success("Membre ajouté avec succès !");
  } catch (error) {
    console.error("Erreur lors de l'ajout du membre :", error);
    notifications.error("Erreur lors de l'ajout du membre !");
  }
};

window.removeMemberFromGroup = async (groupId, memberId, buttonElement) => {
  ModalManager.confirm(
    "Êtes-vous sûr de vouloir retirer ce membre du groupe ?",
    async () => {
      try {
        const groupe = await getGroupeById(groupId);

        if (!groupe) {
          notifications.error("Groupe introuvable !");
          return;
        }

        if (!groupe.membres.includes(memberId)) {
          notifications.warning("Le membre n'est pas dans le groupe !");
          return;
        }

        // Retirer le membre du groupe
        groupe.membres = groupe.membres.filter((m) => m !== memberId);

        // Retirer aussi des admins si c'était un admin
        if (groupe.admins && groupe.admins.includes(memberId)) {
          groupe.admins = groupe.admins.filter((a) => a !== memberId);
        }

        await updateGroupe(groupe);

        buttonElement.textContent = "Retiré";
        buttonElement.disabled = true;
        buttonElement.classList.remove("text-red-500", "hover:text-red-400");
        buttonElement.classList.add("text-gray-500");

        setTimeout(() => {
          const modal = buttonElement.closest(".fixed");
          if (modal) modal.remove();
          displayGroupes(); // Rafraîchir l'affichage des groupes
        }, 1000);

        notifications.success("Membre retiré avec succès !");
      } catch (error) {
        console.error("Erreur lors du retrait du membre :", error);
        notifications.error("Erreur lors du retrait du membre !");
      }
    }
  );
};

window.toggleAdminStatus = async (
  groupId,
  memberId,
  isCurrentlyAdmin,
  buttonElement
) => {
  const action = isCurrentlyAdmin
    ? "retirer les droits d'administrateur à"
    : "nommer comme administrateur";

  ModalManager.confirm(
    `Êtes-vous sûr de vouloir ${action} ce membre ?`,
    async () => {
      try {
        const groupe = await getGroupeById(groupId);

        if (!groupe) {
          notifications.error("Groupe introuvable !");
          return;
        }

        // Initialiser le tableau des admins s'il n'existe pas
        if (!groupe.admins) {
          groupe.admins = [groupe.adminId]; // L'admin principal
        }

        if (isCurrentlyAdmin) {
          // Retirer des admins
          if (groupe.adminId === memberId) {
            notifications.error("Impossible de retirer les droits du créateur du groupe !");
            return;
          }
          groupe.admins = groupe.admins.filter((a) => a !== memberId);
        } else {
          // Ajouter aux admins
          if (!groupe.admins.includes(memberId)) {
            groupe.admins.push(memberId);
          }
        }

        await updateGroupe(groupe);

        buttonElement.textContent = isCurrentlyAdmin
          ? "Droits retirés"
          : "Nommé admin";
        buttonElement.disabled = true;
        buttonElement.classList.remove(
          "text-yellow-500",
          "hover:text-yellow-400",
          "text-red-500",
          "hover:text-red-400"
        );
        buttonElement.classList.add("text-gray-500");

        setTimeout(() => {
          const modal = buttonElement.closest(".fixed");
          if (modal) modal.remove();
          displayGroupes(); // Rafraîchir l'affichage des groupes
        }, 1000);

        notifications.success(
          isCurrentlyAdmin
            ? "Droits d'administrateur retirés avec succès !"
            : "Membre nommé administrateur avec succès !"
        );
      } catch (error) {
        console.error("Erreur lors de la modification du statut admin :", error);
        notifications.error("Erreur lors de la modification du statut !");
      }
    }
  );
};

window.closeGroup = async (groupId) => {
  ModalManager.confirm(
    "Êtes-vous sûr de vouloir fermer ce groupe ? Cette action est irréversible.",
    async () => {
      try {
        const groupe = await getGroupeById(groupId);

        if (!groupe) {
          notifications.error("Groupe introuvable !");
          return;
        }

        groupe.closed = true;
        groupe.closedAt = new Date().toISOString();

        await updateGroupe(groupe);

        notifications.success("Groupe fermé avec succès !");
        displayGroupes(); // Rafraîchir l'affichage des groupes
      } catch (error) {
        console.error("Erreur lors de la fermeture du groupe :", error);
        notifications.error("Erreur lors de la fermeture du groupe !");
      }
    }
  );
};