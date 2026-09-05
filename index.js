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

app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const usuariosConectados = new Map();

io.on('connection', (socket) => {
  console.log('Usuario conectado:', socket.id);

  socket.on('registrar_usuario', (nombre) => {
    const nombreUsuario = nombre && nombre.trim() !== '' ? nombre : `Usuario_${socket.id.substring(0,4)}`;
    usuariosConectados.set(socket.id, { id: socket.id, nombre: nombreUsuario });
    
    io.emit('actualizar_usuarios', Array.from(usuariosConectados.values()));
  });

  socket.on('enviar_mensaje', (datos) => {
    const usuario = usuariosConectados.get(socket.id);
    io.emit('recibir_mensaje', {
      emisorId: socket.id,
      emisorNombre: usuario ? usuario.nombre : 'Anónimo',
      texto: datos.texto
    });
  });

  socket.on('disconnect', () => {
    usuariosConectados.delete(socket.id);
    io.emit('actualizar_usuarios', Array.from(usuariosConectados.values()));
    console.log('Usuario desconectado:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor de APP ELI IDIOMAS corriendo en el puerto ${PORT}`);
});
