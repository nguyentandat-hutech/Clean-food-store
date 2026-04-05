const mongoose = require('mongoose');

/**
 * ── Schema Đơn hàng (Order) ─────────────────────────────────────
 * Lưu thông tin tổng quát đơn hàng.
 * Chi tiết sản phẩm → xem model OrderItem (orderId reference).
 * Thông tin thanh toán → xem model Payment (orderId reference).
 */
const orderSchema = new mongoose.Schema(
    {
        // Người đặt hàng
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'UserId không được để trống'],
        },
        // Tổng tiền trước khi giảm giá
        totalPrice: {
            type: Number,
            required: [true, 'Tổng tiền không được để trống'],
            min: [0, 'Tổng tiền không được âm'],
        },
        // Mã giảm giá đã áp dụng (nếu có)
        discountCode: {
            type: String,
            default: '',
            trim: true,
            uppercase: true,
        },
        // Số tiền được giảm (VNĐ)
        discountAmount: {
            type: Number,
            default: 0,
            min: [0, 'Số tiền giảm không được âm'],
        },
        // Tổng tiền sau khi giảm giá (thực tế phải thanh toán)
        finalPrice: {
            type: Number,
            required: [true, 'Giá cuối không được để trống'],
            min: [0, 'Giá cuối không được âm'],
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
            enum: ['Pending', 'Paid', 'Processing', 'Shipping', 'Delivered', 'Cancelled'],
            default: 'Pending',
        },
        // Cờ xác nhận kho đã được trừ (để tránh restore kho ảo khi hủy)
        // COD: true ngay sau khi tạo đơn thành công
        // VNPay: true chỉ sau khi IPN xác nhận thanh toán thành công
        stockDeducted: {
            type: Boolean,
            default: false,
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
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Virtual populate OrderItems (chi tiết sản phẩm)
orderSchema.virtual('items', {
    ref: 'OrderItem',
    localField: '_id',
    foreignField: 'orderId',
});

// Virtual populate Payment (thông tin thanh toán)
orderSchema.virtual('payment', {
    ref: 'Payment',
    localField: '_id',
    foreignField: 'orderId',
    justOne: true,
});

// Indexes hỗ trợ truy vấn
orderSchema.index({ userId: 1, createdAt: -1 }); // Đơn hàng của user, mới nhất trước
orderSchema.index({ status: 1 });                 // Filter theo trạng thái
orderSchema.index({ createdAt: -1 });

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
