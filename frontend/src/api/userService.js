import apiClient from '../services/apiClient';

/**
 * Lấy thông tin profile của user đang đăng nhập.
 * @returns {{ user: object }}
 */
export const getProfileAPI = async () => {
    const res = await apiClient.get('/users/profile');
    return res.data.data;
};

/**
 * Cập nhật thông tin profile (họ tên, số điện thoại).
 * @param {{ name: string, phone?: string }} data
 * @returns {{ user: object }}
 */
export const updateProfileAPI = async (data) => {
    const res = await apiClient.put('/users/profile', data);
    return res.data.data;
};
