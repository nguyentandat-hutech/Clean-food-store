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

/**
 * [Admin] Lấy danh sách tất cả người dùng với phân trang và tìm kiếm.
 * @param {{ page?, limit?, search?, role? }} params
 * @returns {{ users: object[], pagination: object }}
 */
export const getAllUsersAPI = async (params = {}) => {
    const res = await apiClient.get('/users', { params });
    return res.data.data;
};

/**
 * [Admin] Thay đổi role của người dùng.
 * Business rule: Admin không thể thay đổi role của Admin khác.
 * @param {string} userId
 * @param {'user'|'admin'} role
 * @returns {{ user: object }}
 */
export const updateUserRoleAPI = async (userId, role) => {
    const res = await apiClient.patch(`/users/${userId}/role`, { role });
    return res.data.data;
};
