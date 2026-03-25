import apiClient from '../services/apiClient';

/**
 * Lấy thống kê doanh thu theo tháng hoặc ngày.
 * @param {string} period - 'monthly' hoặc 'daily'
 * @returns {Promise<{ period, totalRevenue, totalOrders, details }>}
 */
export const getRevenueAPI = async (period = 'monthly') => {
    const res = await apiClient.get('/stats/revenue', { params: { period } });
    return res.data.data;
};

/**
 * Lấy danh sách sản phẩm bán chạy nhất.
 * @param {number} limit - Số lượng (mặc định 5)
 * @returns {Promise<{ topSellers }>}
 */
export const getTopSellersAPI = async (limit = 5) => {
    const res = await apiClient.get('/stats/top-sellers', { params: { limit } });
    return res.data.data;
};

/**
 * Lấy thống kê lô hàng sắp hết hạn.
 * @param {number} days - Số ngày (mặc định 7)
 * @returns {Promise<{ totalBatches, days, batches }>}
 */
export const getExpiringSoonAPI = async (days = 7) => {
    const res = await apiClient.get('/stats/expiring-soon', { params: { days } });
    return res.data.data;
};
