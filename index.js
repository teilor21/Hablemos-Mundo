const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Servir archivos estáticos desde la raíz del proyecto
app.use(express.static(__dirname));

// Responder a la ruta principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
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
