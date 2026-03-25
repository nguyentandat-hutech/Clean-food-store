import apiClient from '../services/apiClient';

/**
 * ── Cart API Service ─────────────────────────────────────────────
 * Tất cả hàm gọi API Giỏ hàng qua Axios instance.
 */

// Lấy giỏ hàng của user đang đăng nhập
export const getCartAPI = async () => {
    const res = await apiClient.get('/cart');
    return res.data.data;
};

// Thêm sản phẩm vào giỏ
export const addToCartAPI = async (productId, quantity = 1) => {
    const res = await apiClient.post('/cart', { productId, quantity });
    return res.data.data;
};

// Cập nhật số lượng sản phẩm trong giỏ
export const updateCartItemAPI = async (productId, quantity) => {
    const res = await apiClient.put(`/cart/${productId}`, { quantity });
    return res.data.data;
};

// Xóa 1 sản phẩm khỏi giỏ
export const removeCartItemAPI = async (productId) => {
    const res = await apiClient.delete(`/cart/${productId}`);
    return res.data.data;
};

// Xóa toàn bộ giỏ hàng
export const clearCartAPI = async () => {
    const res = await apiClient.delete('/cart');
    return res.data;
};
