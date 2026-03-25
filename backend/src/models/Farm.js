const mongoose = require('mongoose');

// ── Schema cho đối tác cung cấp thực phẩm sạch ────────────────
const farmSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Tên trang trại không được để trống'],
            trim: true,
            minlength: [2, 'Tên trang trại phải có ít nhất 2 ký tự'],
            maxlength: [100, 'Tên trang trại không được vượt quá 100 ký tự'],
        },
        location: {
            type: String,
            required: [true, 'Địa chỉ trang trại không được để trống'],
            trim: true,
            maxlength: [200, 'Địa chỉ không được vượt quá 200 ký tự'],
        },
        description: {
            type: String,
            trim: true,
            maxlength: [1000, 'Mô tả không được vượt quá 1000 ký tự'],
            default: '',
        },
        contact: {
            type: String,
            required: [true, 'Thông tin liên hệ không được để trống'],
            trim: true,
            maxlength: [200, 'Thông tin liên hệ không được vượt quá 200 ký tự'],
        },
        certificate: {
            type: String,
            required: [true, 'Chứng nhận không được để trống'],
            enum: {
                values: ['VietGAP', 'Organic', 'GlobalGAP', 'Khác'],
                message: 'Chứng nhận phải là: VietGAP, Organic, GlobalGAP hoặc Khác',
            },
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        // Người tạo (admin) — lưu để audit trail
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

// Index mờ để search nhanh theo tên & địa điểm
farmSchema.index({ name: 'text', location: 'text' });

const Farm = mongoose.model('Farm', farmSchema);

module.exports = Farm;
