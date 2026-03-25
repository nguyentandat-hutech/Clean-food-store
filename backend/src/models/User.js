const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ── Schema định nghĩa cấu trúc User trong MongoDB ─────────────
const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Họ tên không được để trống'],
            trim: true,
            minlength: [2, 'Họ tên phải có ít nhất 2 ký tự'],
            maxlength: [50, 'Họ tên không được vượt quá 50 ký tự'],
        },
        email: {
            type: String,
            required: [true, 'Email không được để trống'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Email không hợp lệ'],
        },
        password: {
            type: String,
            required: [true, 'Mật khẩu không được để trống'],
            minlength: [6, 'Mật khẩu phải có ít nhất 6 ký tự'],
            // select: false → không trả về password trong query mặc định
            select: false,
        },
        role: {
            type: String,
            enum: {
                values: ['user', 'admin'],
                message: 'Role phải là "user" hoặc "admin"',
            },
            default: 'user',
        },
        phone: {
            type: String,
            trim: true,
            default: '',
            match: [/^(\+?\d{9,15})?$/, 'Số điện thoại không hợp lệ'],
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true, // Tự động tạo createdAt & updatedAt
    }
);

// ── Pre-save Hook: Hash password TRƯỚC KHI lưu vào DB ─────────
// Chỉ chạy khi field password bị thay đổi (tránh hash lại khi update field khác)
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(12); // Cost factor 12 - cân bằng bảo mật/tốc độ
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// ── Instance Method: So sánh password nhập vào với hash trong DB ─
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// ── Loại bỏ field nhạy cảm khi chuyển sang JSON (gửi đến client) ─
userSchema.methods.toJSON = function () {
    const userObj = this.toObject();
    delete userObj.password;
    delete userObj.__v;
    return userObj;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
