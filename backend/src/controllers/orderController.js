const orderService = require('../services/orderService');
const { successResponse } = require('../utils/responseHelper');

/**
 * ── Order Controller ─────────────────────────────────────────────
 * Xử lý Request/Response cho API Đơn hàng.
 * Chỉ nhận request, gọi service, trả JSON.
 */

// POST /api/orders/checkout — Đặt hàng COD
const checkout = async (req, res) => {
    const { shippingAddress, note, discountCode } = req.body;
    const order = await orderService.createOrderCOD(req.user._id, shippingAddress, note, discountCode);
    return successResponse(res, 201, 'Đặt hàng COD thành công', order);
};

// POST /api/orders/checkout-vnpay — Đặt hàng VNPay (trả URL thanh toán)
const checkoutVNPay = async (req, res) => {
    const { shippingAddress, bankCode, note, discountCode } = req.body;

    // Lấy IP client (hỗ trợ proxy/nginx)
    const ipAddr =
        req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        '127.0.0.1';

    const result = await orderService.createOrderVNPay(
        req.user._id,
        shippingAddress,
        ipAddr,
        bankCode,
        note,
        discountCode
    );

    return successResponse(res, 200, 'Tạo URL thanh toán VNPay thành công', {
        order: result.order,
        paymentUrl: result.paymentUrl,
    });
};

// GET /api/orders/vnpay-return — VNPay redirect user về đây sau thanh toán
const vnpayReturn = async (req, res) => {
    const result = await orderService.handleVnpayReturn(req.query);
    return successResponse(
        res,
        200,
        result.success ? 'Thanh toán VNPay thành công' : 'Thanh toán VNPay thất bại',
        result
    );
};

// GET /api/orders/vnpay-ipn — VNPay gọi server-to-server (IPN)
const vnpayIPN = async (req, res) => {
    const result = await orderService.handleVnpayIPN(req.query);
    // VNPay yêu cầu trả đúng format này
    return res.status(200).json(result);
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
    checkoutVNPay,
    vnpayReturn,
    vnpayIPN,
    getMyOrders,
    getOrderById,
    cancelOrder,
    updateOrderStatus,
    getAllOrders,
};
