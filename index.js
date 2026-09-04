const connectedUsers = new Map();

io.on('connection', (socket) => {
  // Crear un usuario de prueba al conectar
  const userProfile = {
    id: socket.id,
    username: `Usuario_${socket.id.substring(0, 4)}`,
    country: "🇨🇴 Colombia",
    avatar: ""
  };

  connectedUsers.set(socket.id, userProfile);
  socket.emit('init_profile', userProfile);

  // Notificar a todos la nueva lista de usuarios
  io.emit('update_users', Array.from(connectedUsers.values()));

  socket.on('request_users_update', () => {
    io.emit('update_users', Array.from(connectedUsers.values()));
  });

  // Reenviar mensajes privados
  socket.on('send_private_message', ({ recipientId, message }) => {
    const sender = connectedUsers.get(socket.id);
    io.to(recipientId).emit('receive_private_message', {
      senderId: socket.id,
      senderName: sender ? sender.username : 'Usuario',
      message: message
    });
  });

  socket.on('disconnect', () => {
    connectedUsers.delete(socket.id);
    io.emit('update_users', Array.from(connectedUsers.values()));
  });
});