const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Responder directamente en la raíz para confirmar que la app funciona
app.get('/', (req, res) => {
  res.send('<h1>¡Servidor de APP- ELI -IDIOMAS activo y funcionando!</h1>');
});

const connectedUsers = new Map();

io.on('connection', (socket) => {
    const userProfile = {
        id: socket.id,
        username: `Usuario_${socket.id.substring(0, 4)}`,
        country: "co Colombia",
        avatar: ""
    };

    connectedUsers.set(socket.id, userProfile);
    socket.emit('init_profile', userProfile);

    io.emit('update_users', Array.from(connectedUsers.values()));

    socket.on('request_users_update', () => {
        io.emit('update_users', Array.from(connectedUsers.values()));
    });

    socket.on('disconnect', () => {
        connectedUsers.delete(socket.id);
        io.emit('update_users', Array.from(connectedUsers.values()));
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});
