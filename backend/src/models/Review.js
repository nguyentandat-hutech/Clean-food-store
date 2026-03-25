const mongoose = require('mongoose');

// ── Schema Đánh giá sản phẩm ────────────────────────────────────
const reviewSchema = new mongoose.Schema(
    {
        // Sản phẩm được đánh giá
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: [true, 'ProductId không được để trống'],
        },
        // Người đánh giá
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'UserId không được để trống'],
        },
        // Số sao (1 - 5)
        rating: {
            type: Number,
            required: [true, 'Số sao đánh giá không được để trống'],
            min: [1, 'Số sao tối thiểu là 1'],
            max: [5, 'Số sao tối đa là 5'],
        },
        // Nội dung bình luận
        comment: {
            type: String,
            required: [true, 'Nội dung bình luận không được để trống'],
            trim: true,
            minlength: [2, 'Bình luận phải có ít nhất 2 ký tự'],
            maxlength: [1000, 'Bình luận không được vượt quá 1000 ký tự'],
        },
    },
    {
        timestamps: true, // Tự động thêm createdAt, updatedAt
    }
);

// ── Mỗi user chỉ được đánh giá 1 lần cho mỗi sản phẩm ────────
reviewSchema.index({ productId: 1, userId: 1 }, { unique: true });

// Index hỗ trợ truy vấn reviews theo sản phẩm (mới nhất trước)
reviewSchema.index({ productId: 1, createdAt: -1 });

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
