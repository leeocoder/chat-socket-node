const express = require('express');
const path = require('path');
const http = require('http');

const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static(path.join(__dirname, '../public')));

server.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});

const connectedUsers = [];

io.on('connection', (socket) => {
  socket.on('join-request', (data) => {
    connectedUsers.push(data.userName);
    socket.userName = data.userName;
    io.emit('joined', { connectedUsers, userName: data.userName });

    socket.broadcast.emit('user-connected', {
      joined: data.userName,
      list: connectedUsers,
    });
  });

  socket.on('disconnect', () => {
    if (socket.userName) {
      const index = connectedUsers.indexOf(socket.userName);
      if (index !== -1) {
        connectedUsers.splice(index, 1);
      }

      socket.broadcast.emit('user-disconnected', {
        left: socket.userName,
        list: connectedUsers,
      });
    }
  });

  socket.on('message', (data) => {
    socket.broadcast.emit('message', {
      userName: socket.userName,
      message: data.message,
    });

    socket.emit('message', {
      userName: socket.userName,
      message: data.message,
    });
  });
});
