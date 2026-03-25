const inventoryService = require('../services/inventoryService');
const { successResponse } = require('../utils/responseHelper');

/**
 * GET /api/inventory/alerts?days=3
 * Lấy danh sách cảnh báo kho hàng:
 *   - Lô hàng đã hết hạn
 *   - Lô hàng sắp hết hạn (≤ N ngày)
 *   - Sản phẩm hết hàng
 */
const getInventoryAlerts = async (req, res) => {
    const days = req.query.days || 3;
    const alerts = await inventoryService.getInventoryAlerts(days);
    return successResponse(res, 200, 'Lấy cảnh báo kho hàng thành công', alerts);
};

module.exports = { getInventoryAlerts };
