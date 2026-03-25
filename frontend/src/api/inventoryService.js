import apiClient from '../services/apiClient';

/**
 * Lấy cảnh báo kho hàng (lô hết hạn, sắp hết hạn, sản phẩm hết hàng).
 * @param {number} days - Số ngày cảnh báo trước (mặc định 3)
 * @returns {{ expiredBatches, expiringBatches, outOfStockProducts, summary }}
 */
export const getInventoryAlertsAPI = async (days = 3) => {
    const res = await apiClient.get('/inventory/alerts', { params: { days } });
    return res.data.data;
};
