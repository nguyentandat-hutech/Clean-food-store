import apiClient from '../services/apiClient';

/**
 * Gọi API đăng ký tài khoản mới.
 * @param {{ name: string, email: string, password: string }} data
 * @returns {{ user: object, token: string }}
 */
export const registerAPI = async (data) => {
    const res = await apiClient.post('/auth/register', data);
    // Backend trả về: { success: true, message, data: { user, token } }
    return res.data.data;
};

/**
 * Gọi API đăng nhập.
 * @param {{ email: string, password: string }} data
 * @returns {{ user: object, token: string }}
 */
export const loginAPI = async (data) => {
    const res = await apiClient.post('/auth/login', data);
    return res.data.data;
};

/**
 * Lấy thông tin user đang đăng nhập (cần token).
 * @returns {{ user: object }}
 */
export const getMeAPI = async () => {
    const res = await apiClient.get('/auth/me');
    return res.data.data;
};
