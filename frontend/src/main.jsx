import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './index.css';

import App from './App.jsx';

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <App />
        {/* Container toàn cục để hiển thị thông báo toast ở mọi trang */}
        <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
        />
    </StrictMode>
);
