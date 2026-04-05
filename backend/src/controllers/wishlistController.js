// ============================================================
// Wishlist Controller — Xử lý request danh sách yêu thích
// ============================================================

const wishlistService = require('../services/wishlistService');
const { successResponse, createError } = require('../utils/responseHelper');

/**
 * GET /api/wishlist
 * Lấy danh sách yêu thích của user đang đăng nhập (có populate sản phẩm).
 */
const getWishlist = async (req, res) => {
    const wishlist = await wishlistService.getWishlist(req.user._id);
    return successResponse(res, 200, 'Lấy danh sách yêu thích thành công.', { wishlist });
};

/**
 * POST /api/wishlist/:productId
 * Toggle sản phẩm vào/ra khỏi wishlist.
 * - Nếu chưa có trong wishlist → thêm vào, trả về added: true
 * - Nếu đã có trong wishlist → xóa ra, trả về added: false
 */
const toggleProduct = async (req, res) => {
    const { productId } = req.params;

    if (!productId) {
        throw createError(400, 'productId không được để trống.');
    }

    const { wishlist, added } = await wishlistService.toggleProduct(req.user._id, productId);
    const message = added
        ? 'Đã thêm sản phẩm vào danh sách yêu thích.'
        : 'Đã xóa sản phẩm khỏi danh sách yêu thích.';

    return successResponse(res, 200, message, { wishlist, added });
};

/**
 * DELETE /api/wishlist/:productId
 * Xóa một sản phẩm khỏi wishlist.
 * Trả về 404 nếu sản phẩm không có trong wishlist.
 */
const removeProduct = async (req, res) => {
    const { productId } = req.params;

    if (!productId) {
        throw createError(400, 'productId không được để trống.');
    }

    const wishlist = await wishlistService.removeProduct(req.user._id, productId);
    return successResponse(res, 200, 'Đã xóa sản phẩm khỏi danh sách yêu thích.', { wishlist });
};

/**
 * GET /api/wishlist/check/:productId
 * Kiểm tra một sản phẩm có nằm trong wishlist của user không.
 * Trả về { inWishlist: true/false }
 */
const checkProduct = async (req, res) => {
    const { productId } = req.params;

    if (!productId) {
        throw createError(400, 'productId không được để trống.');
    }

    const inWishlist = await wishlistService.checkProduct(req.user._id, productId);
    return successResponse(res, 200, 'Kiểm tra thành công.', { inWishlist });
};

module.exports = {
    getWishlist,
    toggleProduct,
    removeProduct,
    checkProduct,
};
