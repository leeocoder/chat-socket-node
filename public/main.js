// -------------------- variáveis --------------------
const socket = io();
let currentUserName = '';
let connectedUsers = [];

// -------------------- elementos (com fallback) --------------------
const loginPage = document.getElementById('loginPage');
const chatPage = document.getElementById('chatPage');

const userNameInput = document.getElementById('userNameInput');
const messageInput = document.getElementById('messageInput');

function createAndAttachUserListFallback() {
  const wrapper = document.createElement('div');
  wrapper.className = 'chatUsers-fallback';
  const title = document.createElement('h2');
  title.innerText = 'Usuários';
  const ul = document.createElement('ul');
  ul.id = 'userList';
  wrapper.appendChild(title);
  wrapper.appendChild(ul);

  // tenta anexar no container .chatArea se existir, senão no próprio chatPage
  const chatArea = chatPage.querySelector('.chatArea') || chatPage;
  chatArea.appendChild(wrapper);

  console.warn(
    '[main.js] userList não encontrado no DOM — criei fallback #userList'
  );
  return ul;
}

// procura por id primeiro, depois por classe, depois cria fallback
const userListElement =
  document.getElementById('userList') ||
  document.querySelector('.userList') ||
  createAndAttachUserListFallback();

const chatMessagesElement =
  document.getElementById('chatMessages') ||
  document.querySelector('.chatList');

// -------------------- utilitários --------------------
function isEnterKey(event) {
  return event.key && event.key.toUpperCase() === 'ENTER';
}

function safeText(text) {
  // evita injeção simples (não é sanitização completa do servidor)
  const div = document.createElement('div');
  div.innerText = text;
  return div.innerHTML;
}

// -------------------- UI (mostrar/esconder) --------------------
function hideElement(element) {
  if (!element) return;
  element.style.display = 'none';
}
function showElement(element, displayType = 'flex') {
  if (!element) return;
  element.style.display = displayType;
}
function showLoginPage() {
  showElement(loginPage, 'flex');
  hideElement(chatPage);
}
function showChatPage() {
  hideElement(loginPage);
  showElement(chatPage, 'flex');
}

// -------------------- render users --------------------
function clearUserList() {
  if (!userListElement) return;
  userListElement.innerHTML = '';
}

function createUserListItem(user) {
  const li = document.createElement('li');
  li.innerText = user;
  return li;
}

function renderUserList() {
  if (!userListElement) return;
  clearUserList();
  connectedUsers.forEach((user) => {
    userListElement.appendChild(createUserListItem(user));
  });
}

// -------------------- mensagens --------------------
function appendMessageElement(li) {
  if (!chatMessagesElement) return;
  chatMessagesElement.appendChild(li);
  chatMessagesElement.scrollTop = chatMessagesElement.scrollHeight;
}

function createStatusMessageElement(message) {
  const li = document.createElement('li');
  li.classList.add('message--status');
  li.innerText = message;
  return li;
}

function createTextMessageElement(user, message) {
  const li = document.createElement('li');
  li.classList.add('message--text');

  const userSpan = document.createElement('span');
  userSpan.innerText = `${user}: `;
  if (user === currentUserName) {
    userSpan.classList.add('mine');
    li.classList.add('message--mine');
  }

  li.appendChild(userSpan);

  // usa safeText para evitar que HTML vindo do servidor quebre a UI
  const txt = document.createElement('span');
  txt.innerHTML = safeText(message);
  li.appendChild(txt);

  return li;
}

function addStatusMessage(message) {
  appendMessageElement(createStatusMessageElement(message));
}
function addTextMessage(user, message) {
  appendMessageElement(createTextMessageElement(user, message));
}

// -------------------- login & envio --------------------
function setCurrentUserName(name) {
  currentUserName = name;
  document.title = `Chat - ${currentUserName}`;
}
function requestJoinChat(name) {
  console.log('[main.js] emit join-request', name);
  socket.emit('join-request', { userName: name });
}
function handleLoginInput(event) {
  if (!isEnterKey(event)) return;
  const name = event.target.value.trim();
  if (name.length === 0) return;
  setCurrentUserName(name);
  requestJoinChat(name);
}

function clearMessageInput() {
  if (!messageInput) return;
  messageInput.value = '';
}
function requestSendMessage(message) {
  socket.emit('message', { message });
}
function handleMessageInput(event) {
  if (!isEnterKey(event)) return;
  const message = event.target.value.trim();
  if (message.length === 0) return;
  requestSendMessage(message);
  clearMessageInput();
}

// -------------------- socket handlers --------------------
function handleJoinedEvent(data) {
  console.log('[main.js] event joined', data);
  // Se o servidor enviar a lista no joined, usamos como fallback
  if (Array.isArray(data.connectedUsers) && data.connectedUsers.length > 0) {
    connectedUsers = data.connectedUsers;
    renderUserList();
  }
  showChatPage();
  if (messageInput) messageInput.focus();

  if (data.userName === currentUserName) {
    addStatusMessage('Você entrou no chat');
  }
}

function handleUserConnectedEvent(data) {
  console.log('[main.js] event user-connected', data);
  if (data.joined !== currentUserName) {
    addStatusMessage(`${data.joined} entrou no chat`);
  } else {
    // caso o server use joined para comunicar o próprio cliente
    addStatusMessage('Você entrou no chat');
  }
}

function handleUserDisconnectedEvent(data) {
  console.log('[main.js] event user-disconnected', data);
  addStatusMessage(`${data.left} saiu do chat`);
}

function handleUserListUpdateEvent(data) {
  console.log('[main.js] event update-user-list', data);
  if (Array.isArray(data.users)) {
    connectedUsers = data.users;
    renderUserList();
  } else {
    console.warn('[main.js] update-user-list recebeu payload inesperado', data);
  }
}

function handleMessageEvent(data) {
  addTextMessage(data.userName, data.message);
}

function handleReconnectErrorEvent() {
  addStatusMessage('Tentando reconectar...');
}
function handleDisconnectEvent() {
  addStatusMessage('Você foi desconectado do servidor');
}
function handleReconnectEvent() {
  addStatusMessage('Reconectado ao servidor');
  if (currentUserName.length > 0) {
    requestJoinChat(currentUserName);
  }
}

// -------------------- registro de eventos --------------------
function registerUIEvents() {
  if (userNameInput) userNameInput.addEventListener('keyup', handleLoginInput);
  if (messageInput) messageInput.addEventListener('keyup', handleMessageInput);
}

function registerSocketEvents() {
  socket.on('joined', handleJoinedEvent);
  socket.on('user-connected', handleUserConnectedEvent);
  socket.on('user-disconnected', handleUserDisconnectedEvent);
  socket.on('update-user-list', handleUserListUpdateEvent);
  socket.on('message', handleMessageEvent);
  socket.on('reconnect_error', handleReconnectErrorEvent);
  socket.on('disconnect', handleDisconnectEvent);
  socket.on('reconnect', handleReconnectEvent);
}

// -------------------- init --------------------
function init() {
  showLoginPage();
  registerUIEvents();
  registerSocketEvents();
  console.log('[main.js] client inicializado');
}
init();
