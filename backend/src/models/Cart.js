const mongoose = require('mongoose');

// ── Schema Giỏ hàng ─────────────────────────────────────────────
// Mỗi user chỉ có 1 giỏ hàng duy nhất (1-1 relationship)
const cartSchema = new mongoose.Schema(
    {
        // Người sở hữu giỏ hàng — unique đảm bảo 1 user = 1 cart
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'UserId không được để trống'],
            unique: true,
        },
        // Danh sách sản phẩm trong giỏ
        products: [
            {
                productId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Product',
                    required: [true, 'ProductId không được để trống'],
                },
                quantity: {
                    type: Number,
                    required: [true, 'Số lượng không được để trống'],
                    min: [1, 'Số lượng phải lớn hơn 0'],
                },
            },
        ],
    },
    {
        timestamps: true, // Tự động thêm createdAt, updatedAt
    }
);

// Index hỗ trợ tìm kiếm nhanh theo userId
cartSchema.index({ userId: 1 });

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;
