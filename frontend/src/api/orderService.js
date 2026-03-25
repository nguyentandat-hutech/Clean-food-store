import apiClient from '../services/apiClient';

/**
 * ── Order API Service ────────────────────────────────────────────
 * Tất cả hàm gọi API Đơn hàng qua Axios instance.
 */

// Đặt hàng COD
export const checkoutCODAPI = async (shippingAddress, note = '') => {
    const res = await apiClient.post('/orders/checkout', { shippingAddress, note });
    return res.data.data;
};

// Lấy danh sách đơn hàng của user
export const getMyOrdersAPI = async (params = {}) => {
    const res = await apiClient.get('/orders', { params });
    return res.data.data;
};

// Lấy chi tiết 1 đơn hàng
export const getOrderByIdAPI = async (orderId) => {
    const res = await apiClient.get(`/orders/${orderId}`);
    return res.data.data;
};

// Hủy đơn hàng
export const cancelOrderAPI = async (orderId) => {
    const res = await apiClient.patch(`/orders/${orderId}/cancel`);
    return res.data.data;
};
