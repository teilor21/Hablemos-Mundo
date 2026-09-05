const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Servir archivos estáticos y la página principal
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Eventos de comunicación en tiempo real con Socket.io
io.on('connection', (socket) => {
  console.log('Usuario conectado:', socket.id);

  // Escuchar cuando el usuario hace clic en el botón
  socket.on('enviar_saludo', (mensajeCliente) => {
    console.log('Mensaje recibido del cliente:', mensajeCliente);
    // Enviar respuesta desde el servidor de vuelta al usuario
    socket.emit('respuesta_servidor', '¡Servidor de APP ELI IDIOMAS respondiendo en tiempo real!');
  });

  socket.on('disconnect', () => {
    console.log('Usuario desconectado:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
