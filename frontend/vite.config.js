import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        port: 3000, // Khớp với CLIENT_URL trong .env của backend
        // Proxy mọi request /api sang backend để tránh lỗi CORS khi dev
        proxy: {
            '/api': {
                target: 'http://localhost:5000',
                changeOrigin: true,
            },
        },
    },
});
