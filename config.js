// Configure your backend base URL (Render) and Socket.IO URL here.
// Example after deploy: https://pdf-toolkit-backend.onrender.com
window.API_BASE_URL = window.API_BASE_URL || (window.location.origin.includes('localhost') ? 'http://localhost:5000' : 'https://pdf-toolkit-backend-5nlx.onrender.com');
// Socket URL usually same origin as API for this app
window.SOCKET_URL = window.SOCKET_URL || (window.location.origin.includes('localhost') ? window.API_BASE_URL : window.API_BASE_URL.replace('https://', 'wss://'));
