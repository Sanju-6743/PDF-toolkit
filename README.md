# PDF Toolkit Frontend

Static frontend for Vercel. Configure backend API in `config.js`.

## Configure
Edit `config.js` and set:
```js
window.API_BASE_URL = 'https://your-render-service.onrender.com';
window.SOCKET_URL = window.API_BASE_URL;
```

## Deploy to Vercel
- Import this repo in Vercel
- Framework preset: Other (static)
- vercel.json handles routing