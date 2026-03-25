// ============================================================
// Review Service — CRUD đánh giá sản phẩm + tính averageRating
// ============================================================

const Review = require('../models/Review');
const Product = require('../models/Product');
const { createError } = require('../utils/responseHelper');

/**
 * Tính lại averageRating và reviewCount cho một sản phẩm.
 * Sử dụng MongoDB Aggregation Pipeline để tính trực tiếp từ DB.
 *
 * @param {string} productId - ID sản phẩm cần tính lại rating
 */
const recalculateProductRating = async (productId) => {
    const result = await Review.aggregate([
        { $match: { productId: productId } },
        {
            $group: {
                _id: '$productId',
                averageRating: { $avg: '$rating' },
                reviewCount: { $sum: 1 },
            },
        },
    ]);

    if (result.length > 0) {
        await Product.findByIdAndUpdate(productId, {
            averageRating: Math.round(result[0].averageRating * 10) / 10, // Làm tròn 1 chữ số
            reviewCount: result[0].reviewCount,
        });
    } else {
        // Không còn review nào → reset về 0
        await Product.findByIdAndUpdate(productId, {
            averageRating: 0,
            reviewCount: 0,
        });
    }
};

/**
 * Tạo đánh giá mới cho sản phẩm.
 * Kiểm tra: sản phẩm tồn tại, user chưa đánh giá sản phẩm này.
 *
 * @param {object} data - { productId, userId, rating, comment }
 * @returns {Promise<object>} Review vừa tạo (đã populate user)
 */
const createReview = async ({ productId, userId, rating, comment }) => {
    // Kiểm tra sản phẩm tồn tại
    const product = await Product.findById(productId);
    if (!product) {
        throw createError(404, 'Sản phẩm không tồn tại.');
    }

    // Kiểm tra user đã đánh giá sản phẩm này chưa
    const existingReview = await Review.findOne({ productId, userId });
    if (existingReview) {
        throw createError(400, 'Bạn đã đánh giá sản phẩm này rồi. Hãy sửa đánh giá cũ thay vì tạo mới.');
    }

    // Tạo review mới
    const review = await Review.create({ productId, userId, rating, comment });

    // Tính lại averageRating cho sản phẩm
    await recalculateProductRating(productId);

    // Populate thông tin user trước khi trả về
    const populatedReview = await Review.findById(review._id).populate('userId', 'name email');

    return populatedReview;
};

/**
 * Lấy danh sách đánh giá của một sản phẩm (có phân trang).
 *
 * @param {string} productId - ID sản phẩm
 * @param {object} options - { page, limit }
 * @returns {Promise<{ reviews: Array, pagination: object }>}
 */
const getReviewsByProduct = async (productId, { page = 1, limit = 10 }) => {
    // Kiểm tra sản phẩm tồn tại
    const product = await Product.findById(productId);
    if (!product) {
        throw createError(404, 'Sản phẩm không tồn tại.');
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const [reviews, totalReviews] = await Promise.all([
        Review.find({ productId })
            .populate('userId', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .lean(),
        Review.countDocuments({ productId }),
    ]);

    return {
        reviews,
        pagination: {
            currentPage: pageNum,
            totalPages: Math.ceil(totalReviews / limitNum),
            totalReviews,
            limit: limitNum,
        },
        productRating: {
            averageRating: product.averageRating || 0,
            reviewCount: product.reviewCount || 0,
        },
    };
};

/**
 * Cập nhật đánh giá (chỉ chủ sở hữu mới được sửa).
 *
 * @param {string} reviewId - ID review cần sửa
 * @param {string} userId - ID user đang đăng nhập
 * @param {object} data - { rating, comment }
 * @returns {Promise<object>} Review đã cập nhật
 */
const updateReview = async (reviewId, userId, { rating, comment }) => {
    const review = await Review.findById(reviewId);
    if (!review) {
        throw createError(404, 'Đánh giá không tồn tại.');
    }

    // Chỉ chủ sở hữu mới được sửa
    if (review.userId.toString() !== userId.toString()) {
        throw createError(403, 'Bạn không có quyền sửa đánh giá này.');
    }

    // Cập nhật các trường
    if (rating !== undefined) review.rating = rating;
    if (comment !== undefined) review.comment = comment;

    await review.save();

    // Tính lại averageRating
    await recalculateProductRating(review.productId);

    // Populate và trả về
    const updatedReview = await Review.findById(reviewId).populate('userId', 'name email');

    return updatedReview;
};

/**
 * Xóa đánh giá (chủ sở hữu hoặc admin).
 *
 * @param {string} reviewId - ID review cần xóa
 * @param {object} currentUser - User đang đăng nhập ({ _id, role })
 * @returns {Promise<object>} Review đã xóa
 */
const deleteReview = async (reviewId, currentUser) => {
    const review = await Review.findById(reviewId);
    if (!review) {
        throw createError(404, 'Đánh giá không tồn tại.');
    }

    // Chỉ chủ sở hữu hoặc admin mới được xóa
    const isOwner = review.userId.toString() === currentUser._id.toString();
    const isAdmin = currentUser.role === 'admin';

    if (!isOwner && !isAdmin) {
        throw createError(403, 'Bạn không có quyền xóa đánh giá này.');
    }

    const productId = review.productId;

    await Review.findByIdAndDelete(reviewId);

    // Tính lại averageRating sau khi xóa
    await recalculateProductRating(productId);

    return { id: reviewId, message: 'Đã xóa đánh giá thành công.' };
};

module.exports = {
    createReview,
    getReviewsByProduct,
    updateReview,
    deleteReview,
};
