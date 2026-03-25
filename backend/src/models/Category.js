const mongoose = require('mongoose');

// ── Hàm tạo slug từ chuỗi tiếng Việt ──────────────────────────
const generateSlug = (text) => {
    return text
        .toLowerCase()
        .trim()
        // Chuyển ký tự tiếng Việt có dấu thành không dấu
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        // Thay khoảng trắng và ký tự đặc biệt bằng dấu gạch ngang
        .replace(/[^a-z0-9]+/g, '-')
        // Xóa dấu gạch ngang ở đầu và cuối
        .replace(/^-+|-+$/g, '');
};

// ── Schema Danh mục sản phẩm ───────────────────────────────────
const categorySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Tên danh mục không được để trống'],
            trim: true,
            unique: true, // Đảm bảo tên danh mục không trùng lặp
            minlength: [2, 'Tên danh mục phải có ít nhất 2 ký tự'],
            maxlength: [100, 'Tên danh mục không được vượt quá 100 ký tự'],
        },
        slug: {
            type: String,
            unique: true,
            index: true,
        },
        description: {
            type: String,
            trim: true,
            maxlength: [500, 'Mô tả không được vượt quá 500 ký tự'],
            default: '',
        },
        image: {
            type: String,
            trim: true,
            default: '', // URL hình ảnh đại diện cho danh mục
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

// ── Pre-save hook: tự động tạo slug từ name ────────────────────
categorySchema.pre('save', function (next) {
    if (this.isModified('name')) {
        this.slug = generateSlug(this.name);
    }
    next();
});

// ── Pre-findOneAndUpdate hook: cập nhật slug khi đổi tên ───────
categorySchema.pre('findOneAndUpdate', function (next) {
    const update = this.getUpdate();
    if (update.$set && update.$set.name) {
        update.$set.slug = generateSlug(update.$set.name);
    }
    next();
});

// Index cho tìm kiếm nhanh
categorySchema.index({ name: 'text', description: 'text' });

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
