const orderService = require('../services/orderService');
const { successResponse } = require('../utils/responseHelper');

/**
 * ── Order Controller ─────────────────────────────────────────────
 * Xử lý Request/Response cho API Đơn hàng.
 * Chỉ nhận request, gọi service, trả JSON.
 */

// POST /api/orders/checkout — Đặt hàng COD
const checkout = async (req, res) => {
    const { shippingAddress, note } = req.body;
    const order = await orderService.createOrderCOD(req.user._id, shippingAddress, note);
    return successResponse(res, 201, 'Đặt hàng thành công', order);
};

// GET /api/orders — Danh sách đơn hàng của user
const getMyOrders = async (req, res) => {
    const result = await orderService.getMyOrders(req.user._id, req.query);
    return successResponse(res, 200, 'Lấy danh sách đơn hàng thành công', result);
};

// GET /api/orders/:id — Chi tiết đơn hàng
const getOrderById = async (req, res) => {
    const order = await orderService.getOrderById(
        req.params.id,
        req.user._id,
        req.user.role
    );
    return successResponse(res, 200, 'Lấy chi tiết đơn hàng thành công', order);
};

// PATCH /api/orders/:id/cancel — User hủy đơn hàng
const cancelOrder = async (req, res) => {
    const order = await orderService.cancelOrder(req.params.id, req.user._id);
    return successResponse(res, 200, 'Hủy đơn hàng thành công. Tồn kho đã được hoàn lại', order);
};

// PATCH /api/orders/:id/status — Admin cập nhật trạng thái
const updateOrderStatus = async (req, res) => {
    const { status } = req.body;
    const order = await orderService.updateOrderStatus(req.params.id, status);
    return successResponse(res, 200, `Cập nhật trạng thái đơn hàng thành "${status}"`, order);
};

// GET /api/orders/admin/all — Admin lấy tất cả đơn hàng
const getAllOrders = async (req, res) => {
    const result = await orderService.getAllOrders(req.query);
    return successResponse(res, 200, 'Lấy tất cả đơn hàng thành công', result);
};

module.exports = {
    checkout,
    getMyOrders,
    getOrderById,
    cancelOrder,
    updateOrderStatus,
    getAllOrders,
};
