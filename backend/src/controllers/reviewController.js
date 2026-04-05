// ============================================================
// Review Controller — Xử lý request CRUD đánh giá sản phẩm
// ============================================================

const reviewService = require('../services/reviewService');
const { successResponse, createError } = require('../utils/responseHelper');

/**
 * POST /api/reviews
 * Tạo đánh giá mới cho sản phẩm.
 */
const createReview = async (req, res) => {
    const { productId, rating, comment } = req.body;

    // Validation đầu vào
    if (!productId) {
        throw createError(400, 'productId không được để trống.');
    }
    if (!rating || rating < 1 || rating > 5) {
        throw createError(400, 'Số sao đánh giá phải từ 1 đến 5.');
    }
    if (!comment || comment.trim().length < 2) {
        throw createError(400, 'Bình luận phải có ít nhất 2 ký tự.');
    }

    const review = await reviewService.createReview({
        productId,
        userId: req.user._id,
        rating: Number(rating),
        comment: comment.trim(),
    });

    return successResponse(res, 201, 'Đánh giá đã được tạo thành công.', { review });
};

/**
 * GET /api/reviews/product/:productId
 * Lấy danh sách đánh giá của sản phẩm (phân trang).
 */
const getReviewsByProduct = async (req, res) => {
    const { productId } = req.params;
    const { page, limit } = req.query;

    if (!productId) {
        throw createError(400, 'productId không được để trống.');
    }

    const data = await reviewService.getReviewsByProduct(productId, {
        page: page || 1,
        limit: limit || 10,
    });

    return successResponse(res, 200, 'Lấy danh sách đánh giá thành công.', data);
};

/**
 * PUT /api/reviews/:id
 * Cập nhật đánh giá (chỉ chủ sở hữu).
 */
const updateReview = async (req, res) => {
    const { id } = req.params;
    const { rating, comment } = req.body;

    // Validation
    if (rating !== undefined && (rating < 1 || rating > 5)) {
        throw createError(400, 'Số sao đánh giá phải từ 1 đến 5.');
    }
    if (comment !== undefined && comment.trim().length < 2) {
        throw createError(400, 'Bình luận phải có ít nhất 2 ký tự.');
    }

    const review = await reviewService.updateReview(id, req.user._id, {
        rating: rating !== undefined ? Number(rating) : undefined,
        comment: comment !== undefined ? comment.trim() : undefined,
    });

    return successResponse(res, 200, 'Đánh giá đã được cập nhật.', { review });
};

/**
 * DELETE /api/reviews/:id
 * Xóa đánh giá (chủ sở hữu hoặc admin).
 */
const deleteReview = async (req, res) => {
    const { id } = req.params;

    const result = await reviewService.deleteReview(id, req.user);

    return successResponse(res, 200, result.message, { id: result.id });
};

module.exports = {
    createReview,
    getReviewsByProduct,
    updateReview,
    deleteReview,
};
