import apiClient from '../services/apiClient';

/**
 * Lấy danh sách tất cả danh mục (có phân trang & filter).
 * @param {object} params - Query params: { page, limit, isActive, search }
 * @returns {{ categories: Array, pagination: object }}
 */
export const getAllCategoriesAPI = async (params = {}) => {
    const res = await apiClient.get('/categories', { params });
    return res.data.data;
};

/**
 * Lấy chi tiết 1 danh mục theo ID.
 * @param {string} id - ID danh mục
 * @returns {{ category: object }}
 */
export const getCategoryByIdAPI = async (id) => {
    const res = await apiClient.get(`/categories/${id}`);
    return res.data.data;
};

/**
 * Tạo danh mục mới (Admin only).
 * @param {{ name: string, description?: string, image?: string }} data
 * @returns {{ category: object }}
 */
export const createCategoryAPI = async (data) => {
    const res = await apiClient.post('/categories', data);
    return res.data.data;
};

/**
 * Cập nhật thông tin danh mục (Admin only).
 * @param {string} id   - ID danh mục cần cập nhật
 * @param {object} data - Dữ liệu cần cập nhật
 * @returns {{ category: object }}
 */
export const updateCategoryAPI = async (id, data) => {
    const res = await apiClient.put(`/categories/${id}`, data);
    return res.data.data;
};

/**
 * Xóa danh mục (Admin only).
 * @param {string} id - ID danh mục cần xóa
 * @returns {{ id: string, name: string }}
 */
export const deleteCategoryAPI = async (id) => {
    const res = await apiClient.delete(`/categories/${id}`);
    return res.data.data;
};
