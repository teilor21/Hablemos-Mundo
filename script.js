const socket = io();

const listaUsuariosEl = document.getElementById('lista-usuarios');
const contadorUsuariosEl = document.getElementById('contador-usuarios');
const mensajesContainer = document.getElementById('mensajes-container');
const mensajeInput = document.getElementById('mensaje-input');
const btnEnviar = document.getElementById('btn-enviar');
const chatTitulo = document.getElementById('chat-titulo');

let miNombre = prompt("Ingresa tu nombre para entrar al chat de idiomas:") || "Usuario_Anonimo";

// Registrar usuario en el servidor al conectar
socket.emit('registrar_usuario', miNombre);

// Recibir lista de usuarios conectados en tiempo real
socket.on('actualizar_usuarios', (usuarios) => {
    contadorUsuariosEl.textContent = usuarios.length;
    listaUsuariosEl.innerHTML = '';

    usuarios.forEach(user => {
        const li = document.createElement('li');
        li.className = 'usuario-item';
        li.innerHTML = `<span class="status-dot"></span> ${user.nombre} ${user.id === socket.id ? '(Tú)' : ''}`;
        listaUsuariosEl.appendChild(li);
    });

    if (usuarios.length > 0 && chatTitulo.textContent === "Selecciona un usuario en línea") {
        chatTitulo.textContent = "Chat General - APP ELI IDIOMAS";
    }
});

// Enviar mensaje
function enviarMensaje() {
    const texto = mensajeInput.value.trim();
    if (texto !== '') {
        socket.emit('enviar_mensaje', { texto: texto });
        mensajeInput.value = '';
    }
}

btnEnviar.addEventListener('click', enviarMensaje);
mensajeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') enviarMensaje();
});

// Recibir mensaje e insertarlo en la pantalla
socket.on('recibir_mensaje', (datos) => {
    const esMio = datos.emisorId === socket.id;
    const msgDiv = document.createElement('div');
    msgDiv.className = `mensaje ${esMio ? 'mensaje-propio' : 'mensaje-recibido'}`;
    
    msgDiv.innerHTML = `
        <span class="emisor">${esMio ? 'Tú' : datos.emisorNombre}</span>
        <p class="texto">${datos.texto}</p>
    `;
    
    mensajesContainer.appendChild(msgDiv);
    mensajesContainer.scrollTop = mensajesContainer.scrollHeight;
});
