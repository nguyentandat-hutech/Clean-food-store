const User = require('../models/User');
const { createError } = require('../utils/responseHelper');

/**
 * Lấy thông tin profile của user đang đăng nhập.
 * req.user đã được gán bởi protect middleware — trả thẳng về.
 * Dùng findById để đảm bảo dữ liệu mới nhất từ DB.
 *
 * @param {string} userId - ID của user từ req.user._id
 */
const getProfile = async (userId) => {
    const user = await User.findById(userId);
    if (!user) {
        throw createError(404, 'Không tìm thấy người dùng');
    }
    return user;
};

/**
 * Cập nhật thông tin profile (họ tên, số điện thoại).
 * Email và role KHÔNG được phép thay đổi qua endpoint này.
 *
 * @param {string} userId  - ID của user từ req.user._id
 * @param {object} payload - { name, phone }
 */
const updateProfile = async (userId, payload) => {
    const { name, phone } = payload;

    // Validation nghiệp vụ
    if (!name || name.trim().length < 2) {
        throw createError(400, 'Họ tên phải có ít nhất 2 ký tự');
    }
    if (name.trim().length > 50) {
        throw createError(400, 'Họ tên không được vượt quá 50 ký tự');
    }
    if (phone && !/^(\+?\d{9,15})?$/.test(phone.trim())) {
        throw createError(400, 'Số điện thoại không hợp lệ (9-15 chữ số)');
    }

    // Chỉ cho phép cập nhật các field an toàn
    const allowedUpdate = {
        name: name.trim(),
        phone: phone ? phone.trim() : '',
    };

    const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: allowedUpdate },
        {
            new: true,          // Trả về document sau khi update
            runValidators: true, // Chạy validator của Mongoose schema
        }
    );

    if (!updatedUser) {
        throw createError(404, 'Không tìm thấy người dùng');
    }

    return updatedUser;
};

module.exports = { getProfile, updateProfile };
