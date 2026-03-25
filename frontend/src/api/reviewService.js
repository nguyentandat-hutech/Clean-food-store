import apiClient from '../services/apiClient';

/**
 * Lấy danh sách đánh giá của sản phẩm (phân trang).
 * @param {string} productId - ID sản phẩm
 * @param {object} params - { page, limit }
 * @returns {Promise<{ reviews, pagination, productRating }>}
 */
export const getReviewsAPI = async (productId, params = {}) => {
    const res = await apiClient.get(`/reviews/product/${productId}`, { params });
    return res.data.data;
};

/**
 * Tạo đánh giá mới.
 * @param {object} data - { productId, rating, comment }
 * @returns {Promise<{ review }>}
 */
export const createReviewAPI = async (data) => {
    const res = await apiClient.post('/reviews', data);
    return res.data.data;
};

/**
 * Cập nhật đánh giá.
 * @param {string} reviewId - ID review
 * @param {object} data - { rating, comment }
 * @returns {Promise<{ review }>}
 */
export const updateReviewAPI = async (reviewId, data) => {
    const res = await apiClient.put(`/reviews/${reviewId}`, data);
    return res.data.data;
};

/**
 * Xóa đánh giá.
 * @param {string} reviewId - ID review
 * @returns {Promise<{ id }>}
 */
export const deleteReviewAPI = async (reviewId) => {
    const res = await apiClient.delete(`/reviews/${reviewId}`);
    return res.data.data;
};
