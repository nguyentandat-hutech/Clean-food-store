import apiClient from '../services/apiClient';

/**
 * Lấy danh sách tất cả trang trại (dùng cho dropdown trong form sản phẩm).
 * @param {object} params - Query params: { page, limit, isActive, search }
 * @returns {{ farms: Array, pagination: object }}
 */
export const getAllFarmsAPI = async (params = {}) => {
    const res = await apiClient.get('/farms', { params });
    return res.data.data;
};

/**
 * Lấy chi tiết 1 trang trại theo ID.
 * @param {string} id - ID trang trại
 * @returns {{ farm: object }}
 */
export const getFarmByIdAPI = async (id) => {
    const res = await apiClient.get(`/farms/${id}`);
    return res.data.data;
};

/**
 * Tạo trang trại mới (Admin only).
 * @param {object} data - { name, location, description, contact, certificate, isActive }
 * @returns {{ farm: object }}
 */
export const createFarmAPI = async (data) => {
    const res = await apiClient.post('/farms', data);
    return res.data.data;
};

/**
 * Cập nhật thông tin trang trại (Admin only).
 * @param {string} id - ID trang trại
 * @param {object} data - Các field cần cập nhật
 * @returns {{ farm: object }}
 */
export const updateFarmAPI = async (id, data) => {
    const res = await apiClient.put(`/farms/${id}`, data);
    return res.data.data;
};

/**
 * Xóa trang trại (Admin only).
 * @param {string} id - ID trang trại
 */
export const deleteFarmAPI = async (id) => {
    const res = await apiClient.delete(`/farms/${id}`);
    return res.data;
};
