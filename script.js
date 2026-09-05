// ==========================================
// CONFIGURACIÓN DE SOCKETS Y ESTADOS GLOBALES
// ==========================================
const socket = io();

let currentUser = { username: '', avatar: '' };
let activeChatUser = null;
let archivedChats = JSON.parse(localStorage.getItem('hm_archived_chats')) || [];
let blockedUsers = JSON.parse(localStorage.getItem('hm_blocked_users')) || [];

// Variables para notas de voz
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;

// ==========================================
// 1. INICIALIZACIÓN Y EVENTOS DE INTERFAZ
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  const avatarInput = document.getElementById('avatar-input');
  const usernameInput = document.getElementById('username-input');
  const mediaInput = document.getElementById('media-input');

  // Cambiar avatar
  if (avatarInput) {
    avatarInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function (event) {
          currentUser.avatar = event.target.result;
          const preview = document.getElementById('my-avatar-preview');
          if (preview) {
            preview.innerHTML = `<img src="${currentUser.avatar}" class="w-full h-full object-cover">`;
          }
          socket.emit('update_my_profile', currentUser);
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Cambiar nombre
  if (usernameInput) {
    usernameInput.addEventListener('change', () => {
      const val = usernameInput.value.trim();
      if (val) {
        currentUser.username = val;
        socket.emit('update_my_profile', currentUser);
      }
    });
  }

  // Adjuntar Fotos o Videos
  if (mediaInput) {
    mediaInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (!activeChatUser) {
        alert("Selecciona un usuario antes de enviar archivos.");
        e.target.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = function (evt) {
        const fileData = evt.target.result;
        const isVideo = file.type.startsWith('video/');
        const mediaType = isVideo ? 'video' : 'image';

        // Renderizar localmente
        appendMessage({
          sender: 'Tú',
          mediaUrl: fileData,
          mediaType: mediaType,
          isSelf: true
        });

        // Enviar por sockets
        socket.emit('send_private_message', {
          recipientId: activeChatUser.id,
          mediaUrl: fileData,
          mediaType: mediaType
        });
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    });
  }

  // Enviar mensaje de texto
  const chatForm = document.getElementById('chat-form');
  const messageInput = document.getElementById('message-input');

  if (chatForm) {
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = messageInput ? messageInput.value.trim() : '';

      if (!text) return;

      if (!activeChatUser) {
        alert("Selecciona un usuario en la lista lateral para hablar.");
        return;
      }

      if (blockedUsers.some(b => b.id === activeChatUser.id)) {
        alert("Este usuario está en tu lista de bloqueados.");
        return;
      }

      appendMessage({
        sender: 'Tú',
        text: text,
        isSelf: true
      });

      socket.emit('send_private_message', {
        recipientId: activeChatUser.id,
        message: text
      });

      if (messageInput) messageInput.value = '';
    });
  }

  updatePanelBadges();
});

// ==========================================
// 2. SISTEMA DE NOTAS DE VOZ
// ==========================================
async function toggleVoiceRecord() {
  if (!activeChatUser) {
    alert("Selecciona un usuario para enviar la nota de voz.");
    return;
  }

  const micBtn = document.getElementById('mic-btn');

  if (!isRecording) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = function (evt) {
          const audioUrl = evt.target.result;

          appendMessage({
            sender: 'Tú',
            audioUrl: audioUrl,
            isSelf: true
          });

          socket.emit('send_private_message', {
            recipientId: activeChatUser.id,
            audioUrl: audioUrl
          });
        };
        reader.readAsDataURL(audioBlob);

        // Detener micro
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      isRecording = true;
      if (micBtn) {
        micBtn.classList.add('bg-red-600', 'animate-pulse');
        micBtn.innerHTML = '⏹️';
        micBtn.title = "Detener y enviar nota de voz";
      }
    } catch (err) {
      alert("No se pudo acceder al micrófono.");
    }
  } else {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    isRecording = false;
    if (micBtn) {
      micBtn.classList.remove('bg-red-600', 'animate-pulse');
      micBtn.innerHTML = '🎙️';
      micBtn.title = "Grabar nota de voz";
    }
  }
}

// ==========================================
// 3. RECIBIR MENSAJES Y RENDERIZAR
// ==========================================
socket.on('init_profile', (profile) => {
  currentUser = profile;
  const profileInfo = document.getElementById('my-profile-info');
  const usernameInput = document.getElementById('username-input');
  
  if (profileInfo) profileInfo.innerText = `${profile.username} (En línea)`;
  if (usernameInput) usernameInput.value = profile.username;
});

socket.on('update_users', (users) => {
  const usersList = document.getElementById('users-list');
  const usersCount = document.getElementById('users-count');
  if (!usersList) return;

  usersList.innerHTML = '';
  const otherUsers = users.filter(u => u.id !== socket.id);

  if (usersCount) usersCount.innerText = otherUsers.length;

  if (otherUsers.length === 0) {
    usersList.innerHTML = `<p class="text-center text-slate-500 text-xs py-6">Esperando otros usuarios...</p>`;
    return;
  }

  otherUsers.forEach(user => {
    if (blockedUsers.some(b => b.id === user.id)) return;

    const userCard = document.createElement('div');
    const isActive = activeChatUser && activeChatUser.id === user.id;

    userCard.className = `p-2.5 rounded-xl border border-slate-800 hover:bg-slate-800/60 cursor-pointer transition flex items-center gap-3 ${isActive ? 'bg-slate-800 border-yellow-500/50' : 'bg-slate-900/60'}`;
    
    const avatarHtml = user.avatar 
      ? `<img src="${user.avatar}" class="w-10 h-10 rounded-full object-cover border border-slate-700">`
      : `<div class="w-10 h-10 rounded-full bg-yellow-500/20 text-yellow-400 font-bold flex items-center justify-center text-sm border border-yellow-500/30">${user.username.charAt(0).toUpperCase()}</div>`;

    userCard.innerHTML = `
      <div class="relative">
        ${avatarHtml}
        <span class="w-2.5 h-2.5 bg-green-500 rounded-full absolute bottom-0 right-0 border-2 border-slate-900"></span>
      </div>
      <div class="flex-1 min-w-0">
        <h4 class="text-xs font-semibold text-slate-100 truncate">${user.username}</h4>
        <p class="text-[10px] text-slate-400 truncate">${user.country || '🇨🇴 Colombia'}</p>
      </div>
    `;

    userCard.onclick = () => selectUserToChat(user);
    usersList.appendChild(userCard);
  });
});

function selectUserToChat(user) {
  activeChatUser = user;

  const headerName = document.getElementById('active-user-name');
  const headerStatus = document.getElementById('active-user-status');
  const avatarContainer = document.getElementById('active-avatar-container');
  const chatMessages = document.getElementById('chat-messages');

  if (headerName) headerName.innerText = user.username;
  if (headerStatus) headerStatus.innerText = "En línea • " + (user.country || "🇨🇴 Colombia");

  if (avatarContainer) {
    if (user.avatar) {
      avatarContainer.innerHTML = `<img src="${user.avatar}" class="w-10 h-10 rounded-full object-cover border border-slate-700">`;
    } else {
      avatarContainer.innerHTML = `<div class="w-10 h-10 rounded-full bg-yellow-500/20 text-yellow-400 font-bold flex items-center justify-center text-sm border border-yellow-500/30">${user.username.charAt(0).toUpperCase()}</div>`;
    }
  }

  if (chatMessages) {
    chatMessages.innerHTML = `<div class="text-center text-slate-500 text-xs py-4">Iniciaste conversación con ${user.username}</div>`;
  }
}

socket.on('receive_private_message', (data) => {
  if (blockedUsers.some(b => b.id === data.senderId)) return;

  if (activeChatUser && activeChatUser.id === data.senderId) {
    appendMessage({
      sender: data.senderName,
      text: data.message,
      mediaUrl: data.mediaUrl,
      mediaType: data.mediaType,
      audioUrl: data.audioUrl,
      isSelf: false
    });
  } else {
    alert(`Nuevo mensaje de ${data.senderName}`);
  }
});

function appendMessage({ sender, text, mediaUrl, mediaType, audioUrl, isSelf }) {
  const chatMessages = document.getElementById('chat-messages');
  if (!chatMessages) return;

  const msgDiv = document.createElement('div');
  msgDiv.className = `flex flex-col ${isSelf ? 'items-end' : 'items-start'}`;

  let contentHtml = '';

  if (text) {
    contentHtml += `<p class="break-words">${text}</p>`;
  }

  if (mediaUrl) {
    if (mediaType === 'image') {
      contentHtml += `<img src="${mediaUrl}" class="max-w-xs rounded-lg mt-1 border border-black/20 max-h-60 object-cover">`;
    } else if (mediaType === 'video') {
      contentHtml += `<video src="${mediaUrl}" controls class="max-w-xs rounded-lg mt-1 border border-black/20 max-h-60"></video>`;
    }
  }

  if (audioUrl) {
    contentHtml += `<audio src="${audioUrl}" controls class="mt-1 h-8 w-60"></audio>`;
  }

  msgDiv.innerHTML = `
    <div class="max-w-[75%] rounded-xl px-3.5 py-2 text-xs ${isSelf ? 'bg-yellow-500 text-slate-950 font-medium shadow-md' : 'bg-slate-800 text-slate-100 border border-slate-700'}">
      <span class="block text-[10px] ${isSelf ? 'text-slate-900/70 font-bold' : 'text-yellow-400 font-semibold'} mb-0.5">${sender}</span>
      ${contentHtml}
    </div>
  `;

  chatMessages.appendChild(msgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ==========================================
// 4. LLAMADAS Y MODALES
// ==========================================
function startCall(type) {
  if (!activeChatUser) {
    alert("Selecciona un contacto para iniciar la llamada.");
    return;
  }

  const isVideo = type === 'video';
  const modalHtml = `
    <div id="call-modal" class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div class="bg-slate-900 text-white p-6 rounded-2xl max-w-sm w-full border border-slate-700 text-center space-y-4 shadow-2xl relative overflow-hidden">
        <h3 class="text-base font-bold text-yellow-400">${isVideo ? '📹 Videollamada HD' : '📞 Llamada de Voz'}</h3>
        <p class="text-xs text-slate-400">Conectando con <b class="text-white">${activeChatUser.username}</b>...</p>
        <div class="relative w-32 h-32 mx-auto rounded-full overflow-hidden border-2 border-yellow-500 flex items-center justify-center bg-slate-800 shadow-xl">
          ${activeChatUser.avatar ? `<img src="${activeChatUser.avatar}" class="w-full h-full object-cover">` : `<span class="text-3xl font-bold text-yellow-400">${activeChatUser.username.charAt(0)}</span>`}
        </div>
        <div class="pt-2 flex justify-center gap-3">
          <button onclick="endCall()" class="px-6 py-2 bg-red-600 hover:bg-red-500 font-bold rounded-xl text-xs text-white transition shadow-lg shadow-red-600/30">Finalizar Llamada</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function endCall() {
  document.getElementById('call-modal')?.remove();
}

function showVipModal() {
  const NEQUI_DAVIPLATA = "3205061135";
  const CORREO_PAYPAL = "arangoelizabeth00160@gmail.com";

  const modalHtml = `
    <div id="vip-modal" class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div class="bg-slate-800 text-white p-6 rounded-xl max-w-md w-full border border-yellow-500/30 text-center space-y-4 shadow-2xl">
        <h3 class="text-xl font-bold text-yellow-400">👑 Suscripción VIP Hablemos Mundo</h3>
        <p class="text-xs text-slate-300">Acceso ilimitado a llamadas, videollamadas y funciones exclusivas.</p>
        <div class="bg-slate-900 p-3 rounded-lg text-left text-xs space-y-1.5 border border-slate-700">
          <p class="font-bold text-purple-400 border-b border-slate-700 pb-1">🇨🇴 Colombia (Nequi / Daviplata)</p>
          <p>• <b>Número:</b> ${NEQUI_DAVIPLATA}</p>
          <p>• <b>Monto:</b> $10.000 COP / mes</p>
        </div>
        <div class="bg-slate-900 p-3 rounded-lg text-left text-xs space-y-1.5 border border-slate-700">
          <p class="font-bold text-blue-400 border-b border-slate-700 pb-1">🌎 Internacional (PayPal)</p>
          <p>• <b>Monto:</b> ~$2.50 USD / mes</p>
          <p>• <b>Enviar pago a:</b> <br><span class="text-yellow-300 font-mono text-[11px] select-all">${CORREO_PAYPAL}</span></p>
        </div>
        <div class="flex gap-2 pt-2">
          <button onclick="activateVipDemo()" class="flex-1 py-2 bg-green-600 hover:bg-green-500 font-bold rounded text-xs text-white transition">Confirmar Pago (Activar VIP)</button>
          <button onclick="closeVipModal()" class="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-xs text-white transition">Cerrar</button>
        </div>
      </div>
    </div>
  `;
  closeVipModal();
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closeVipModal() {
  document.getElementById('vip-modal')?.remove();
}

function activateVipDemo() {
  alert("¡Pago confirmado! Beneficios VIP activados.");
  closeVipModal();
}

function archiveCurrentChat() {
  if (!activeChatUser) return alert("Selecciona un chat para archivar.");
  if (!archivedChats.some(c => c.id === activeChatUser.id)) {
    archivedChats.push({ id: activeChatUser.id, username: activeChatUser.username });
    localStorage.setItem('hm_archived_chats', JSON.stringify(archivedChats));
    updatePanelBadges();
    alert(`Conversación archivada.`);
  }
}

function toggleArchivedModal() {
  const existing = document.getElementById('archived-modal');
  if (existing) return existing.remove();
  let list = archivedChats.map(c => `
    <div class="flex items-center justify-between p-2 bg-slate-900 rounded text-xs">
      <span>👤 ${c.username}</span>
      <button onclick="unarchiveChat('${c.id}')" class="text-yellow-400 font-bold">Desarchivar</button>
    </div>
  `).join('') || '<p class="text-center text-xs text-slate-500 py-2">Sin chats archivados</p>';

  document.body.insertAdjacentHTML('beforeend', `
    <div id="archived-modal" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div class="bg-slate-800 text-white p-4 rounded-xl max-w-sm w-full space-y-3">
        <div class="flex justify-between items-center border-b border-slate-700 pb-2">
          <h4 class="text-xs font-bold text-yellow-400">📁 Archivados</h4>
          <button onclick="document.getElementById('archived-modal').remove()" class="text-xs">✕</button>
        </div>
        <div class="space-y-2">${list}</div>
      </div>
    </div>
  `);
}

function unarchiveChat(id) {
  archivedChats = archivedChats.filter(c => c.id !== id);
  localStorage.setItem('hm_archived_chats', JSON.stringify(archivedChats));
  updatePanelBadges();
  document.getElementById('archived-modal')?.remove();
}

function blockCurrentContact() {
  if (!activeChatUser) return;
  if (confirm(`¿Bloquear a ${activeChatUser.username}?`)) {
    blockedUsers.push({ id: activeChatUser.id, username: activeChatUser.username });
    localStorage.setItem('hm_blocked_users', JSON.stringify(blockedUsers));
    alert("Contacto bloqueado.");
    socket.emit('request_users_update');
  }
}

function toggleBlockedListModal() {
  const existing = document.getElementById('blocked-modal');
  if (existing) return existing.remove();
  let list = blockedUsers.map(u => `
    <div class="flex items-center justify-between p-2 bg-slate-900 rounded text-xs">
      <span class="text-red-400">🚫 ${u.username}</span>
      <button onclick="unblockUser('${u.id}')" class="text-slate-300 font-bold">Desbloquear</button>
    </div>
  `).join('') || '<p class="text-center text-xs text-slate-500 py-2">Sin bloqueados</p>';

  document.body.insertAdjacentHTML('beforeend', `
    <div id="blocked-modal" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div class="bg-slate-800 text-white p-4 rounded-xl max-w-sm w-full space-y-3">
        <div class="flex justify-between items-center border-b border-slate-700 pb-2">
          <h4 class="text-xs font-bold text-red-400">🚫 Bloqueados</h4>
          <button onclick="document.getElementById('blocked-modal').remove()" class="text-xs">✕</button>
        </div>
        <div class="space-y-2">${list}</div>
      </div>
    </div>
  `);
}

function unblockUser(id) {
  blockedUsers = blockedUsers.filter(u => u.id !== id);
  localStorage.setItem('hm_blocked_users', JSON.stringify(blockedUsers));
  document.getElementById('blocked-modal')?.remove();
  socket.emit('request_users_update');
}

function updatePanelBadges() {
  const count = document.getElementById('archived-count');
  if (count) count.innerText = archivedChats.length;
}