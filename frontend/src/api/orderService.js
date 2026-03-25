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

// Đặt hàng VNPay — trả về { order, paymentUrl }
export const checkoutVNPayAPI = async (shippingAddress, bankCode = '', note = '') => {
    const res = await apiClient.post('/orders/checkout-vnpay', { shippingAddress, bankCode, note });
    return res.data.data;
};

// Xử lý kết quả VNPay return (query params)
export const vnpayReturnAPI = async (queryString) => {
    const res = await apiClient.get(`/orders/vnpay-return?${queryString}`);
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

// ── Admin APIs ───────────────────────────────────────────────────

// Admin lấy tất cả đơn hàng
export const getAllOrdersAPI = async (params = {}) => {
    const res = await apiClient.get('/orders/admin/all', { params });
    return res.data.data;
};

// Admin cập nhật trạng thái đơn hàng
export const updateOrderStatusAPI = async (orderId, status) => {
    const res = await apiClient.patch(`/orders/${orderId}/status`, { status });
    return res.data.data;
};
