// ============================================================
// FILE: backend/src/models/User.js
// Mục đích: Định nghĩa cấu trúc dữ liệu (Schema) cho User trong MongoDB
// Mỗi User trong DB sẽ có đúng các trường được khai báo ở đây
// ============================================================

// Nhập thư viện mongoose để làm việc với MongoDB
const mongoose = require('mongoose');

// Nhập thư viện bcryptjs để mã hoá (hash) mật khẩu
// Không bao giờ lưu mật khẩu gốc vào DB, phải hash trước
const bcrypt = require('bcryptjs');

// ── Tạo Schema (bản thiết kế cấu trúc document) cho User ──────────────────
const userSchema = new mongoose.Schema(
    {
        // Trường họ tên người dùng
        name: {
            type: String,                                          // Kiểu dữ liệu: chuỗi ký tự
            required: [true, 'Họ tên không được để trống'],       // Bắt buộc phải có, nếu thiếu báo lỗi
            trim: true,                                            // Tự động xóa khoảng trắng đầu/cuối
            minlength: [2, 'Họ tên phải có ít nhất 2 ký tự'],    // Độ dài tối thiểu
            maxlength: [50, 'Họ tên không được vượt quá 50 ký tự'], // Độ dài tối đa
        },

        // Trường email dùng để đăng nhập
        email: {
            type: String,                                          // Kiểu chuỗi
            required: [true, 'Email không được để trống'],         // Bắt buộc
            unique: true,                                          // Không cho phép 2 user cùng email
            lowercase: true,                                       // Tự động chuyển về chữ thường khi lưu
            trim: true,                                            // Xóa khoảng trắng đầu/cuối
            match: [/^\S+@\S+\.\S+$/, 'Email không hợp lệ'],     // Regex kiểm tra định dạng email
        },

        // Trường mật khẩu — sẽ được hash trước khi lưu (xem pre-save hook bên dưới)
        password: {
            type: String,
            required: [true, 'Mật khẩu không được để trống'],
            minlength: [6, 'Mật khẩu phải có ít nhất 6 ký tự'],
            select: false,  // Quan trọng: mặc định KHÔNG trả về password trong query
                            // Muốn lấy password phải dùng .select('+password') tường minh
        },

        // Trường phân quyền người dùng
        role: {
            type: String,
            enum: {
                values: ['user', 'admin'],                         // Chỉ cho phép 2 giá trị này
                message: 'Role phải là "user" hoặc "admin"',       // Thông báo lỗi nếu truyền giá trị khác
            },
            default: 'user',                                       // Mặc định khi tạo mới = 'user'
        },

        // Trường số điện thoại (không bắt buộc)
        phone: {
            type: String,
            trim: true,
            default: '',                                            // Mặc định chuỗi rỗng nếu không nhập
            match: [/^(\+?\d{9,15})?$/, 'Số điện thoại không hợp lệ'], // Cho phép rỗng hoặc 9-15 chữ số
        },

        // Trường trạng thái tài khoản (dùng để khóa tài khoản mà không cần xóa)
        isActive: {
            type: Boolean,
            default: true,  // Mặc định tài khoản đang hoạt động
        },
    },
    {
        // Tùy chọn Schema: tự động thêm 2 trường createdAt và updatedAt
        timestamps: true,
    }
);

// ── Pre-save Hook: Tự động chạy TRƯỚC KHI lưu document vào DB ─────────────
// "pre('save')" = "trước khi save()"
// Mục đích: hash mật khẩu trước khi lưu vào DB
userSchema.pre('save', async function (next) {
    // "this" ở đây là document User sắp được lưu
    // Kiểm tra: nếu field password KHÔNG bị thay đổi thì bỏ qua, không hash lại
    // Tránh trường hợp: update tên → hash lại password cũ → mật khẩu hỏng
    if (!this.isModified('password')) return next();

    // Tạo "salt" - chuỗi ngẫu nhiên dùng để hash (cost factor 12 = độ phức tạp)
    // Cost factor càng cao, hash càng chậm nhưng càng khó crack
    const salt = await bcrypt.genSalt(12);

    // Hash mật khẩu gốc với salt, ghi đè lên field password
    this.password = await bcrypt.hash(this.password, salt);

    // Gọi next() để tiếp tục quá trình lưu
    next();
});

// ── Instance Method: So sánh mật khẩu người dùng nhập với hash trong DB ───
// Dùng khi đăng nhập: user nhập password → so sánh với hash đã lưu
userSchema.methods.comparePassword = async function (candidatePassword) {
    // bcrypt.compare() tự động hash candidatePassword rồi so sánh với this.password
    // Trả về true nếu khớp, false nếu không
    return bcrypt.compare(candidatePassword, this.password);
};

// ── Loại bỏ field nhạy cảm khi chuyển document sang JSON gửi về client ────
// Mỗi lần gọi res.json(user), hàm này tự động chạy
userSchema.methods.toJSON = function () {
    const userObj = this.toObject(); // Chuyển Mongoose document thành plain object
    delete userObj.password;         // Xóa password khỏi object trước khi gửi về
    delete userObj.__v;              // Xóa __v (version key của Mongoose, không cần thiết)
    return userObj;
};

// Tạo Model từ Schema — Model là lớp để thao tác với collection "users" trong MongoDB
const User = mongoose.model('User', userSchema);

// Xuất Model để các file khác require() và sử dụng
module.exports = User;
