import apiClient from '../services/apiClient';

/**
 * Lấy danh sách tất cả sản phẩm (có phân trang & filter).
 * @param {object} params - Query params: { page, limit, category, farm, standards, minPrice, maxPrice, search }
 * @returns {{ products: Array, pagination: object }}
 */
export const getAllProductsAPI = async (params = {}) => {
    const res = await apiClient.get('/products', { params });
    return res.data.data;
};

/**
 * Tìm kiếm sản phẩm nâng cao (alias endpoint).
 * @param {object} params - { name, category, farm, minPrice, maxPrice, page, limit }
 * @returns {{ products: Array, pagination: object }}
 */
export const searchProductsAPI = async (params = {}) => {
    const res = await apiClient.get('/products/search', { params });
    return res.data.data;
};

/**
 * Lấy chi tiết 1 sản phẩm theo ID (bao gồm thông tin trang trại).
 * @param {string} id - ID sản phẩm
 * @returns {{ product: object }}
 */
export const getProductByIdAPI = async (id) => {
    const res = await apiClient.get(`/products/${id}`);
    return res.data.data;
};

/**
 * Tạo sản phẩm mới (Admin only) - Gửi FormData để hỗ trợ upload ảnh.
 * @param {FormData} formData - Dữ liệu sản phẩm + files ảnh
 * @returns {{ product: object }}
 */
export const createProductAPI = async (formData) => {
    const res = await apiClient.post('/products', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
};

/**
 * Cập nhật thông tin sản phẩm (Admin only) - Gửi FormData để hỗ trợ upload ảnh mới.
 * @param {string} id        - ID sản phẩm cần cập nhật
 * @param {FormData} formData - Dữ liệu cần cập nhật + files ảnh mới
 * @returns {{ product: object }}
 */
export const updateProductAPI = async (id, formData) => {
    const res = await apiClient.put(`/products/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
};

/**
 * Xóa sản phẩm (Admin only).
 * @param {string} id - ID sản phẩm cần xóa
 * @returns {{ id: string, name: string }}
 */
export const deleteProductAPI = async (id) => {
    const res = await apiClient.delete(`/products/${id}`);
    return res.data.data;
};
