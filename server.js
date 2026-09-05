const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  maxHttpBufferSize: 1e7 // Permitir hasta 10MB para fotos y notas de voz
});

app.use(express.static(path.join(__dirname, 'public')));

const connectedUsers = new Map();

io.on('connection', (socket) => {
  const userProfile = {
    id: socket.id,
    username: `Usuario_${socket.id.substring(0, 4)}`,
    country: "🇨🇴 Colombia",
    avatar: "",
    languages: []
  };

  connectedUsers.set(socket.id, userProfile);
  socket.emit('init_profile', userProfile);
  io.emit('update_users', Array.from(connectedUsers.values()));

  socket.on('update_my_profile', (updatedProfile) => {
    const current = connectedUsers.get(socket.id);
    if (current) {
      Object.assign(current, updatedProfile);
      connectedUsers.set(socket.id, current);
      io.emit('update_users', Array.from(connectedUsers.values()));
    }
  });

  socket.on('request_users_update', () => {
    io.emit('update_users', Array.from(connectedUsers.values()));
  });

  socket.on('send_private_message', (data) => {
    const sender = connectedUsers.get(socket.id);
    if (!sender || !data.recipientId) return;

    io.to(data.recipientId).emit('receive_private_message', {
      senderId: socket.id,
      senderName: sender.username,
      message: data.message || '',
      mediaUrl: data.mediaUrl || null,
      mediaType: data.mediaType || null,
      audioUrl: data.audioUrl || null
    });
  });

  socket.on('disconnect', () => {
    connectedUsers.delete(socket.id);
    io.emit('update_users', Array.from(connectedUsers.values()));
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor de Hablemos Mundo ejecutándose en http://localhost:${PORT}`);
});
