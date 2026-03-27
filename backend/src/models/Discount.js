const mongoose = require('mongoose');

/**
 * ── Schema Mã giảm giá (Discount) ──────────────────────────────
 * Quản lý mã giảm giá và chương trình khuyến mãi.
 * Hỗ trợ 2 loại: phần trăm (percentage) và số tiền cố định (fixed).
 */
const discountSchema = new mongoose.Schema(
    {
        // Mã giảm giá (unique, tự động uppercase khi lưu)
        code: {
            type: String,
            required: [true, 'Mã giảm giá không được để trống'],
            unique: true,
            trim: true,
            uppercase: true,
            maxlength: [20, 'Mã giảm giá không được vượt quá 20 ký tự'],
            match: [/^[A-Z0-9_-]+$/, 'Mã giảm giá chỉ được chứa chữ hoa, số, gạch dưới và gạch ngang'],
        },
        // Loại giảm giá
        type: {
            type: String,
            enum: {
                values: ['percentage', 'fixed'],
                message: 'Loại giảm giá phải là "percentage" hoặc "fixed"',
            },
            required: [true, 'Loại giảm giá không được để trống'],
        },
        // Giá trị giảm: nếu type=percentage thì là %, nếu type=fixed thì là VNĐ
        value: {
            type: Number,
            required: [true, 'Giá trị giảm không được để trống'],
            min: [1, 'Giá trị giảm phải lớn hơn 0'],
        },
        // Giá trị đơn hàng tối thiểu để áp dụng mã
        minOrderAmount: {
            type: Number,
            default: 0,
            min: [0, 'Giá trị đơn hàng tối thiểu không được âm'],
        },
        // Giới hạn số lần sử dụng (null = không giới hạn)
        maxUses: {
            type: Number,
            default: null,
            min: [1, 'Số lần sử dụng tối đa phải lớn hơn 0'],
        },
        // Số lần đã được sử dụng
        usedCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        // Ngày hết hạn của mã giảm giá (null = không hết hạn)
        expiryDate: {
            type: Date,
            default: null,
        },
        // Trạng thái kích hoạt
        isActive: {
            type: Boolean,
            default: true,
        },
        // Người tạo mã (admin)
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
discountSchema.index({ code: 1 }, { unique: true });
discountSchema.index({ isActive: 1, expiryDate: 1 }); // Tìm mã còn hiệu lực
discountSchema.index({ createdAt: -1 });

const Discount = mongoose.model('Discount', discountSchema);

module.exports = Discount;
