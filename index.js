<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>APP ELI IDIOMAS</title>
    <link rel="stylesheet" href="style.css">
    <script src="/socket.io/socket.io.js"></script>
</head>
<body>
    <div class="app-container">
        <!-- BARRA LATERAL -->
        <aside class="sidebar">
            <div class="header-sidebar">
                <h2>APP ELI IDIOMAS</h2>
                <!-- Desplegable de idiomas para práctica -->
                <div class="idioma-selector">
                    <label for="select-idioma">Idioma de práctica:</label>
                    <select id="select-idioma">
                        <option value="en">Inglés - English</option>
                        <option value="es">Español - Spanish</option>
                        <option value="fr">Francés - Français</option>
                        <option value="de">Alemán - Deutsch</option>
                        <option value="it">Italiano - Italiano</option>
                        <option value="pt">Portugués - Português</option>
                    </select>
                </div>
            </div>

            <div class="usuarios-seccion">
                <h3>Personas en línea (<span id="contador-usuarios">0</span>)</h3>
                <ul id="lista-usuarios" class="lista-usuarios">
                    <!-- Lista en tiempo real de contactos conectados -->
                </ul>
            </div>
        </aside>

        <!-- ÁREA PRINCIPAL DE CHAT -->
        <main class="chat-main">
            <div class="chat-header">
                <h3 id="chat-titulo">Chat General - APP ELI IDIOMAS</h3>
            </div>
            
            <div id="mensajes-container" class="mensajes-container">
                <p class="placeholder-text">Selecciona un contacto o escribe en el chat para iniciar la conversación.</p>
            </div>

            <div class="chat-input-bar">
                <input type="text" id="mensaje-input" placeholder="Escribe tu mensaje aquí..." autocomplete="off">
                <button id="btn-enviar">Enviar</button>
            </div>
        </main>
    </div>

    <script src="script.js"></script>
</body>
</html>
