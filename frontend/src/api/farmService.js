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
