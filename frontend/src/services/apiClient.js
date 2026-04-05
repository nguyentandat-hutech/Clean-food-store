import axios from 'axios';

// ── Tạo một Axios Instance với base URL từ biến môi trường ────
const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000, // Tự động timeout sau 10 giây
});

// ── REQUEST INTERCEPTOR ───────────────────────────────────────
// Tự động thêm JWT Token vào header mọi request (nếu có)
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// ── RESPONSE INTERCEPTOR ──────────────────────────────────────
// Xử lý lỗi toàn cục: tự động logout nếu token hết hạn (401)
apiClient.interceptors.response.use(
    (response) => response, // Trả về response nếu thành công
    (error) => {
        if (error.response?.status === 401) {
            // Token hết hạn hoặc không hợp lệ → xóa token và reload
            localStorage.removeItem('accessToken');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        // Ném lỗi ra ngoài để component tự xử lý (hiện toast, v.v.)
        return Promise.reject(error);
    }
);

export default apiClient;
