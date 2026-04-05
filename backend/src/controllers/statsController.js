// ============================================================
// Stats Controller — Xử lý request thống kê cho Admin Dashboard
// ============================================================

const statsService = require('../services/statsService');
const { successResponse, createError } = require('../utils/responseHelper');

/**
 * GET /api/stats/revenue?period=monthly|daily
 * Thống kê doanh thu theo tháng hoặc ngày.
 */
const getRevenue = async (req, res) => {
    const { period } = req.query;

    // Validate period
    const validPeriods = ['monthly', 'daily'];
    const selectedPeriod = validPeriods.includes(period) ? period : 'monthly';

    const data = await statsService.getRevenue(selectedPeriod);

    // Tính tổng doanh thu và tổng đơn hàng
    const totalRevenue = data.reduce((sum, item) => sum + item.totalRevenue, 0);
    const totalOrders = data.reduce((sum, item) => sum + item.orderCount, 0);

    return successResponse(res, 200, 'Lấy thống kê doanh thu thành công.', {
        period: selectedPeriod,
        totalRevenue,
        totalOrders,
        details: data,
    });
};

/**
 * GET /api/stats/top-sellers?limit=5
 * Lấy danh sách sản phẩm bán chạy nhất.
 */
const getTopSellers = async (req, res) => {
    const { limit } = req.query;

    const data = await statsService.getTopSellers(limit || 5);

    return successResponse(res, 200, 'Lấy danh sách sản phẩm bán chạy thành công.', {
        topSellers: data,
    });
};

/**
 * GET /api/stats/expiring-soon?days=7
 * Thống kê lô hàng sắp hết hạn.
 */
const getExpiringSoon = async (req, res) => {
    const { days } = req.query;

    const data = await statsService.getExpiringSoon(days || 7);

    return successResponse(res, 200, 'Lấy thống kê lô sắp hết hạn thành công.', data);
};

module.exports = {
    getRevenue,
    getTopSellers,
    getExpiringSoon,
};
