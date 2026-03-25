const mongoose = require('mongoose');

// ── Schema Lô hàng (Batch) ─────────────────────────────────────
// Mỗi lô hàng thuộc về một sản phẩm, có số lượng và hạn sử dụng riêng
const batchSchema = new mongoose.Schema(
    {
        // Khóa ngoại đến Sản phẩm
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: [true, 'Sản phẩm không được để trống'],
        },
        // Mã lô hàng (duy nhất toàn hệ thống)
        batchNumber: {
            type: String,
            required: [true, 'Mã lô hàng không được để trống'],
            unique: true,
            trim: true,
            maxlength: [50, 'Mã lô hàng không được vượt quá 50 ký tự'],
        },
        // Số lượng hiện tại còn lại trong lô
        quantity: {
            type: Number,
            required: [true, 'Số lượng không được để trống'],
            min: [0, 'Số lượng không được âm'],
        },
        // Số lượng ban đầu khi nhập kho (không thay đổi, dùng để đối soát)
        originalQuantity: {
            type: Number,
            required: [true, 'Số lượng ban đầu không được để trống'],
            min: [1, 'Số lượng ban đầu phải lớn hơn 0'],
        },
        // Ngày sản xuất
        manufacturingDate: {
            type: Date,
            required: [true, 'Ngày sản xuất không được để trống'],
        },
        // Ngày hết hạn — phải sau ngày sản xuất
        expiryDate: {
            type: Date,
            required: [true, 'Ngày hết hạn không được để trống'],
        },
        // Trạng thái lô hàng (cron job tự động cập nhật khi hết hạn)
        status: {
            type: String,
            enum: ['active', 'expired'],
            default: 'active',
        },
    },
    {
        timestamps: true, // Tự động thêm createdAt, updatedAt
    }
);

// ── Indexes hỗ trợ truy vấn nhanh ──────────────────────────────
batchSchema.index({ product: 1, expiryDate: 1 }); // Tính tồn kho theo sản phẩm + hạn
batchSchema.index({ expiryDate: 1 });              // Truy vấn lô sắp hết hạn
batchSchema.index({ batchNumber: 1 }, { unique: true }); // Tìm theo mã lô

const Batch = mongoose.model('Batch', batchSchema);

module.exports = Batch;
