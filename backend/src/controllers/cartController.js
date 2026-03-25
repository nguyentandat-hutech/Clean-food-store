const cartService = require('../services/cartService');
const { successResponse } = require('../utils/responseHelper');

/**
 * ── Cart Controller ──────────────────────────────────────────────
 * Xử lý Request/Response cho API Giỏ hàng.
 * Chỉ nhận request, gọi service, trả JSON — KHÔNG chứa logic nghiệp vụ.
 */

// GET /api/cart — Lấy giỏ hàng của user đang đăng nhập
const getCart = async (req, res) => {
    const cart = await cartService.getCart(req.user._id);
    return successResponse(res, 200, 'Lấy giỏ hàng thành công', cart);
};

// POST /api/cart — Thêm sản phẩm vào giỏ
const addToCart = async (req, res) => {
    const { productId, quantity } = req.body;
    const cart = await cartService.addToCart(req.user._id, productId, quantity);
    return successResponse(res, 200, 'Thêm vào giỏ hàng thành công', cart);
};

// PUT /api/cart/:productId — Cập nhật số lượng sản phẩm trong giỏ
const updateCartItem = async (req, res) => {
    const { productId } = req.params;
    const { quantity } = req.body;
    const cart = await cartService.updateCartItem(req.user._id, productId, quantity);
    return successResponse(res, 200, 'Cập nhật giỏ hàng thành công', cart);
};

// DELETE /api/cart/:productId — Xóa 1 sản phẩm khỏi giỏ
const removeCartItem = async (req, res) => {
    const { productId } = req.params;
    const cart = await cartService.removeCartItem(req.user._id, productId);
    return successResponse(res, 200, 'Đã xóa sản phẩm khỏi giỏ hàng', cart);
};

// DELETE /api/cart — Xóa toàn bộ giỏ hàng
const clearCart = async (req, res) => {
    const result = await cartService.clearCart(req.user._id);
    return successResponse(res, 200, result.message);
};

module.exports = {
    getCart,
    addToCart,
    updateCartItem,
    removeCartItem,
    clearCart,
};
