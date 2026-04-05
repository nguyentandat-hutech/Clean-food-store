const mongoose = require('mongoose');

// ── Schema Danh sách yêu thích ──────────────────────────────
// Mỗi user có đúng 1 document Wishlist chứa mảng các sản phẩm yêu thích.
// Dùng $addToSet để tránh trùng lặp và $pull để xóa nguyên tử.
const wishlistSchema = new mongoose.Schema(
    {
        // Mỗi user có đúng một danh sách yêu thích
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'UserId không được để trống'],
            unique: true,
            index: true,
        },
        // Mảng các sản phẩm đã thêm vào yêu thích
        products: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product',
            },
        ],
    },
    {
        timestamps: true, // Tự động thêm createdAt, updatedAt
    }
);

module.exports = mongoose.model('Wishlist', wishlistSchema);
