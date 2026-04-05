import apiClient from '../services/apiClient';

/**
 * ── Discount API Service ─────────────────────────────────────────
 */

// Validate + tính toán mã giảm giá (user đã đăng nhập)
export const validateDiscountAPI = async (code, orderTotal) => {
    const res = await apiClient.post('/discounts/validate', { code, orderTotal });
    return res.data.data; // { discount, discountAmount, finalPrice }
};

// ── Admin CRUD ───────────────────────────────────────────────────

export const getAllDiscountsAPI = async (params = {}) => {
    const res = await apiClient.get('/discounts', { params });
    return res.data.data; // { discounts, pagination }
};

export const getDiscountByIdAPI = async (id) => {
    const res = await apiClient.get(`/discounts/${id}`);
    return res.data.data;
};

export const createDiscountAPI = async (data) => {
    const res = await apiClient.post('/discounts', data);
    return res.data.data;
};

export const updateDiscountAPI = async (id, data) => {
    const res = await apiClient.put(`/discounts/${id}`, data);
    return res.data.data;
};

export const deleteDiscountAPI = async (id) => {
    const res = await apiClient.delete(`/discounts/${id}`);
    return res.data;
};
