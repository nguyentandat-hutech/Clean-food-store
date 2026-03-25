const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { createError } = require('../utils/responseHelper');

// ── Tạo JWT Token từ payload user ─────────────────────────────
const generateToken = (user) => {
    return jwt.sign(
        { id: user._id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

// ── ĐĂNG KÝ tài khoản mới ─────────────────────────────────────
const register = async ({ name, email, password }) => {
    // Kiểm tra các field bắt buộc
    if (!name || !email || !password) {
        throw createError(400, 'Vui lòng cung cấp đầy đủ họ tên, email và mật khẩu');
    }

    // Kiểm tra email đã tồn tại chưa
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
        throw createError(409, 'Email này đã được đăng ký. Vui lòng dùng email khác');
    }

    // Kiểm tra độ dài mật khẩu (Mongoose sẽ check minlength, nhưng check sớm cho UX)
    if (password.length < 6) {
        throw createError(400, 'Mật khẩu phải có ít nhất 6 ký tự');
    }

    // Tạo user mới - password sẽ được hash bởi pre-save hook trong Model
    const user = await User.create({ name, email, password });

    // Tạo token ngay sau khi đăng ký (auto login)
    const token = generateToken(user);

    return { user, token };
};

// ── ĐĂNG NHẬP ─────────────────────────────────────────────────
const login = async ({ email, password }) => {
    // Kiểm tra input
    if (!email || !password) {
        throw createError(400, 'Vui lòng nhập email và mật khẩu');
    }

    // Tìm user theo email, bật lại field password (vì schema có select: false)
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user) {
        // Trả về thông báo chung để tránh lộ thông tin (username enumeration attack)
        throw createError(401, 'Email hoặc mật khẩu không chính xác');
    }

    // Kiểm tra tài khoản có bị khoá không
    if (!user.isActive) {
        throw createError(403, 'Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ admin');
    }

    // So sánh password nhập vào với hash trong DB
    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
        throw createError(401, 'Email hoặc mật khẩu không chính xác');
    }

    // Tạo JWT token với role được nhúng trong payload
    const token = generateToken(user);

    return { user, token };
};

// ── LẤY THÔNG TIN user đang đăng nhập (từ token) ─────────────
const getMe = async (userId) => {
    const user = await User.findById(userId);
    if (!user) {
        throw createError(404, 'Không tìm thấy thông tin người dùng');
    }
    return user;
};

module.exports = { register, login, getMe };
