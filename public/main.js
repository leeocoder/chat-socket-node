const socket = io();
let userName = '';
let userList = [];

let loginPage = document.getElementById('loginPage');
let chatPage = document.getElementById('chatPage');

let userNameInput = document.getElementById('userNameInput');
let messageInput = document.getElementById('messageInput');

const showChatPage = () => {
  loginPage.style.display = 'none';
  chatPage.style.display = 'flex';
};

const showLoginPage = () => {
  loginPage.style.display = 'flex';
  chatPage.style.display = 'none';
};

showLoginPage();

userNameInput.addEventListener('keyup', (e) => {
  if (e.key.toLocaleUpperCase() === 'Enter'.toLocaleUpperCase()) {
    const name = e.target.value.trim();
    if (name.length > 0) {
      userName = name;
      document.title = `Chat - ${userName}`;
      socket.emit('join-request', { userName });
    }
  }
});

socket.on('joined', (data) => {
  userList = data.connectedUsers;
  messageInput.focus();
  showChatPage();
  updateUserList();

  if (data.userName === userName) {
    addMessage('status', null, 'você entrou no chat');
  }
});

const updateUserList = () => {
  let ul = chatPage.querySelector('.userList');
  ul.innerHTML = '';

  userList.forEach((u) => {
    let li = document.createElement('li');
    li.textContent = u;
    ul.appendChild(li);
  });
};

socket.on('user-connected', (data) => {
  userList = data.list;
  updateUserList();

  if (data.joined === userName) {
    addMessage('status', null, 'entrou no chat');
  } else {
    addMessage('status', data.joined, `${data.joined} entrou no chat`);
  }
});

socket.on('user-disconnected', (data) => {
  userList = data.list;
  updateUserList();
  addMessage('status', userName, `${data.left} saiu do chat`);
});

messageInput.addEventListener('keyup', (e) => {
  if (e.key === 'Enter') {
    const message = e.target.value.trim();
    if (message.length > 0) {
      socket.emit('message', { userName, message });
      e.target.value = '';
    }
  }
});

// Function to add messages to the chat area
const addMessage = (type, user, message) => {
  const chatList = chatPage.querySelector('.chatList');
  let li = document.createElement('li');

  if (type === 'status') {
    li.classList.add('m-status');
    li.innerText = message;
  } else if (type === 'message') {
    li.classList.add('m-message');
    let span = document.createElement('span');
    span.innerText = `${user}: `;
    if (user === userName) {
      span.classList.add('mine');
    }
    li.appendChild(span);
    li.innerHTML += message;
  }
  chatList.appendChild(li);
  chatList.scrollTop = chatList.scrollHeight;
};
