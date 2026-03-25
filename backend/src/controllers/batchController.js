const batchService = require('../services/batchService');
const { successResponse } = require('../utils/responseHelper');

/**
 * POST /api/batches
 * Tạo lô hàng mới (Admin only).
 * Body: { product, batchNumber, quantity, manufacturingDate, expiryDate }
 */
const createBatch = async (req, res) => {
    const batch = await batchService.createBatch(req.body);
    return successResponse(res, 201, 'Tạo lô hàng thành công', { batch });
};

/**
 * GET /api/batches
 * Lấy danh sách lô hàng (có phân trang, filter).
 * Query: ?page=1&limit=20&product=ID&expired=true/false
 */
const getAllBatches = async (req, res) => {
    const result = await batchService.getAllBatches(req.query);
    return successResponse(res, 200, 'Lấy danh sách lô hàng thành công', result);
};

/**
 * GET /api/batches/:id
 * Lấy chi tiết 1 lô hàng theo ID.
 */
const getBatchById = async (req, res) => {
    const batch = await batchService.getBatchById(req.params.id);
    return successResponse(res, 200, 'Lấy thông tin lô hàng thành công', { batch });
};

/**
 * PUT /api/batches/:id
 * Cập nhật thông tin lô hàng (Admin only).
 * Body: { batchNumber?, quantity?, manufacturingDate?, expiryDate? }
 */
const updateBatch = async (req, res) => {
    const batch = await batchService.updateBatch(req.params.id, req.body);
    return successResponse(res, 200, 'Cập nhật lô hàng thành công', { batch });
};

/**
 * DELETE /api/batches/:id
 * Xóa lô hàng (Admin only).
 */
const deleteBatch = async (req, res) => {
    const deleted = await batchService.deleteBatch(req.params.id);
    return successResponse(res, 200, 'Xóa lô hàng thành công', deleted);
};

/**
 * GET /api/batches/stock/:productId
 * Lấy tồn kho thực tế của 1 sản phẩm (chỉ tính lô còn hạn).
 */
const getEffectiveStock = async (req, res) => {
    const stockInfo = await batchService.getEffectiveStock(req.params.productId);
    return successResponse(res, 200, 'Lấy tồn kho thực tế thành công', stockInfo);
};

/**
 * GET /api/batches/inventory-report
 * Báo cáo tồn kho tổng hợp: tất cả sản phẩm + tồn kho thực tế.
 */
const getInventoryReport = async (req, res) => {
    const report = await batchService.getInventoryReport();
    return successResponse(res, 200, 'Lấy báo cáo tồn kho thành công', { report });
};

/**
 * GET /api/batches/expiring?days=7
 * Lấy danh sách lô hàng sắp hết hạn trong N ngày tới.
 */
const getExpiringBatches = async (req, res) => {
    const days = req.query.days || 7;
    const batches = await batchService.getExpiringBatches(days);
    return successResponse(res, 200, 'Lấy danh sách lô sắp hết hạn thành công', { batches });
};

module.exports = {
    createBatch,
    getAllBatches,
    getBatchById,
    updateBatch,
    deleteBatch,
    getEffectiveStock,
    getInventoryReport,
    getExpiringBatches,
};
