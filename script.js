const socket = io();

const listaUsuariosEl = document.getElementById('lista-usuarios');
const contadorUsuariosEl = document.getElementById('contador-usuarios');
const mensajesContainer = document.getElementById('mensajes-container');
const mensajeInput = document.getElementById('mensaje-input');
const btnEnviar = document.getElementById('btn-enviar');

let miNombre = prompt("Ingresa tu nombre para ingresar a APP ELI IDIOMAS:") || "Usuario";

socket.emit('registrar_usuario', miNombre);

socket.on('actualizar_usuarios', (usuarios) => {
    if (contadorUsuariosEl) contadorUsuariosEl.textContent = usuarios.length;
    if (listaUsuariosEl) {
        listaUsuariosEl.innerHTML = '';
        usuarios.forEach(user => {
            const li = document.createElement('li');
            li.className = 'usuario-item';
            li.innerHTML = `<span class="status-dot"></span> <strong>${user.nombre}</strong> ${user.id === socket.id ? '(Tú)' : ''}`;
            listaUsuariosEl.appendChild(li);
        });
    }
});

function enviarMensaje() {
    const texto = mensajeInput.value.trim();
    if (texto !== '') {
        socket.emit('enviar_mensaje', { texto: texto });
        mensajeInput.value = '';
    }
}

if (btnEnviar) {
    btnEnviar.addEventListener('click', enviarMensaje);
}

if (mensajeInput) {
    mensajeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') enviarMensaje();
    });
}

socket.on('recibir_mensaje', (datos) => {
    const placeholder = document.querySelector('.placeholder-text');
    if (placeholder) placeholder.remove();

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
