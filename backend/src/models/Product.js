const mongoose = require('mongoose');

// ── Schema Sản phẩm thực phẩm sạch ────────────────────────────
const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Tên sản phẩm không được để trống'],
            trim: true,
            minlength: [2, 'Tên sản phẩm phải có ít nhất 2 ký tự'],
            maxlength: [200, 'Tên sản phẩm không được vượt quá 200 ký tự'],
        },
        description: {
            type: String,
            trim: true,
            maxlength: [2000, 'Mô tả không được vượt quá 2000 ký tự'],
            default: '',
        },
        price: {
            type: Number,
            required: [true, 'Giá sản phẩm không được để trống'],
            min: [0, 'Giá sản phẩm không được âm'],
        },
        unit: {
            type: String,
            required: [true, 'Đơn vị tính không được để trống'],
            enum: {
                values: ['kg', 'bó', 'gói', 'hộp', 'túi', 'trái', 'lít'],
                message: 'Đơn vị tính phải là: kg, bó, gói, hộp, túi, trái hoặc lít',
            },
        },
        // Khóa ngoại đến Danh mục
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            required: [true, 'Danh mục sản phẩm không được để trống'],
        },
        // Khóa ngoại đến Trang trại
        farm: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Farm',
            required: [true, 'Trang trại cung cấp không được để trống'],
        },
        // Tiêu chuẩn chất lượng
        standards: {
            type: String,
            required: [true, 'Tiêu chuẩn chất lượng không được để trống'],
            enum: {
                values: ['VietGAP', 'Organic', 'GlobalGAP', 'Khác'],
                message: 'Tiêu chuẩn phải là: VietGAP, Organic, GlobalGAP hoặc Khác',
            },
        },
        // Ngày thu hoạch — không được sau ngày hiện tại
        harvestDate: {
            type: Date,
            required: [true, 'Ngày thu hoạch không được để trống'],
        },
        // Ngày hết hạn — phải sau ngày thu hoạch
        expiryDate: {
            type: Date,
            required: [true, 'Ngày hết hạn không được để trống'],
        },
        // Mảng URL hình ảnh sản phẩm
        images: {
            type: [String],
            default: [],
            validate: {
                validator: function (arr) {
                    return arr.length <= 10; // Tối đa 10 hình
                },
                message: 'Tối đa 10 hình ảnh cho mỗi sản phẩm',
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
        timestamps: true, // Tự động thêm createdAt, updatedAt
    }
);

// Index hỗ trợ tìm kiếm nhanh và filter
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ farm: 1 });
productSchema.index({ price: 1 });
productSchema.index({ standards: 1 });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
