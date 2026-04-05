const mongoose = require('mongoose');

/**
 * ── Schema Chi tiết đơn hàng (OrderItem) ───────────────────────
 * Lưu snapshot sản phẩm tại thời điểm đặt hàng — tách riêng khỏi Order
 * để hỗ trợ truy vấn phân tích (top sellers, doanh thu theo sản phẩm...).
 *
 * Dữ liệu là SNAPSHOT — giá và tên giữ nguyên tại thời điểm mua,
 * không bị ảnh hưởng khi sản phẩm gốc bị sửa/xóa sau này.
 */
const orderItemSchema = new mongoose.Schema(
    {
        // Liên kết đến Order cha
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order',
            required: [true, 'OrderId không được để trống'],
        },
        // Tham chiếu đến sản phẩm gốc (có thể null nếu sản phẩm bị xóa)
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: [true, 'ProductId không được để trống'],
        },
        // ── Snapshot tại thời điểm đặt hàng ────────────────────
        name: {
            type: String,
            required: [true, 'Tên sản phẩm không được để trống'],
            trim: true,
        },
        price: {
            type: Number,
            required: [true, 'Giá sản phẩm không được để trống'],
            min: [0, 'Giá không được âm'],
        },
        unit: {
            type: String,
            required: [true, 'Đơn vị tính không được để trống'],
            trim: true,
        },
        quantity: {
            type: Number,
            required: [true, 'Số lượng không được để trống'],
            min: [1, 'Số lượng phải ít nhất là 1'],
        },
        // Thành tiền = price × quantity (tính sẵn để tránh phép tính lặp)
        subtotal: {
            type: Number,
            required: [true, 'Thành tiền không được để trống'],
            min: [0, 'Thành tiền không được âm'],
        },
    },
    {
        timestamps: true,
        // Virtual populate đến Product để có thể join khi cần
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// ── Indexes ─────────────────────────────────────────────────────
orderItemSchema.index({ orderId: 1 });              // Lấy items theo order
orderItemSchema.index({ productId: 1 });            // Phân tích theo sản phẩm
orderItemSchema.index({ orderId: 1, productId: 1 }); // Compound

const OrderItem = mongoose.model('OrderItem', orderItemSchema);

module.exports = OrderItem;
