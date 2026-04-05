import apiClient from '../services/apiClient';

/**
 * Lấy toàn bộ wishlist của user đang đăng nhập (có populate sản phẩm).
 * @returns {Promise<{ wishlist }>}
 */
export const getWishlistAPI = async () => {
    const res = await apiClient.get('/wishlist');
    return res.data.data;
};

/**
 * Toggle sản phẩm vào/ra khỏi wishlist.
 * @param {string} productId - ID sản phẩm
 * @returns {Promise<{ wishlist, added: boolean }>}
 */
export const toggleWishlistAPI = async (productId) => {
    const res = await apiClient.post(`/wishlist/${productId}`);
    return res.data.data;
};

/**
 * Xóa sản phẩm khỏi wishlist.
 * @param {string} productId - ID sản phẩm
 * @returns {Promise<{ wishlist }>}
 */
export const removeFromWishlistAPI = async (productId) => {
    const res = await apiClient.delete(`/wishlist/${productId}`);
    return res.data.data;
};

/**
 * Kiểm tra sản phẩm có trong wishlist không.
 * @param {string} productId - ID sản phẩm
 * @returns {Promise<{ inWishlist: boolean }>}
 */
export const checkWishlistAPI = async (productId) => {
    const res = await apiClient.get(`/wishlist/check/${productId}`);
    return res.data.data;
};
