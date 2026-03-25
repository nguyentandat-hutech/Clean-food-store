const mongoose = require('mongoose');

// ── Schema Đơn hàng ─────────────────────────────────────────────
const orderSchema = new mongoose.Schema(
    {
        // Người đặt hàng
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'UserId không được để trống'],
        },
        // Snapshot sản phẩm tại thời điểm đặt hàng (giữ nguyên giá lúc mua)
        products: [
            {
                productId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Product',
                    required: true,
                },
                name: { type: String, required: true },       // Tên sản phẩm lúc mua
                price: { type: Number, required: true },       // Giá lúc mua
                unit: { type: String, required: true },        // Đơn vị tính
                quantity: { type: Number, required: true, min: 1 },
                subtotal: { type: Number, required: true },    // price × quantity
            },
        ],
        // Tổng tiền đơn hàng
        totalPrice: {
            type: Number,
            required: [true, 'Tổng tiền không được để trống'],
            min: [0, 'Tổng tiền không được âm'],
        },
        // Địa chỉ giao hàng
        shippingAddress: {
            fullName: { type: String, required: [true, 'Họ tên người nhận không được để trống'] },
            phone: { type: String, required: [true, 'Số điện thoại không được để trống'] },
            address: { type: String, required: [true, 'Địa chỉ giao hàng không được để trống'] },
        },
        // Phương thức thanh toán
        paymentMethod: {
            type: String,
            enum: ['COD', 'VNPay'],
            required: [true, 'Phương thức thanh toán không được để trống'],
            default: 'COD',
        },
        // Trạng thái đơn hàng
        status: {
            type: String,
            enum: ['Pending', 'Processing', 'Shipping', 'Delivered', 'Cancelled'],
            default: 'Pending',
        },
        // Ghi chú đơn hàng (tùy chọn)
        note: {
            type: String,
            trim: true,
            maxlength: [500, 'Ghi chú không được vượt quá 500 ký tự'],
            default: '',
        },
    },
    {
        timestamps: true, // Tự động thêm createdAt, updatedAt
    }
);

// Indexes hỗ trợ truy vấn
orderSchema.index({ userId: 1, createdAt: -1 }); // Đơn hàng của user, mới nhất trước
orderSchema.index({ status: 1 });                 // Filter theo trạng thái

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
