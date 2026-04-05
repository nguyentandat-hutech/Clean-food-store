const mongoose = require('mongoose');
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

/**
 * Lấy danh sách tất cả users — chỉ Admin được gọi.
 * Hỗ trợ tìm kiếm theo tên/email, lọc theo role và phân trang.
 *
 * @param {object} options - { page, limit, search, role }
 */
const getAllUsers = async ({ page = 1, limit = 20, search = '', role = '' } = {}) => {
    const query = {};

    // Tìm kiếm theo tên hoặc email (case-insensitive)
    if (search && search.trim()) {
        query.$or = [
            { name: { $regex: search.trim(), $options: 'i' } },
            { email: { $regex: search.trim(), $options: 'i' } },
        ];
    }

    // Lọc theo role
    if (role && ['user', 'admin'].includes(role)) {
        query.role = role;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [users, total] = await Promise.all([
        User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
        User.countDocuments(query),
    ]);

    return {
        users,
        pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum) || 1,
        },
    };
};

/**
 * Thay đổi role của một user — chỉ Admin được gọi.
 *
 * Business rules:
 *  1. Admin KHÔNG thể thay đổi role của chính mình.
 *  2. Admin KHÔNG thể thay đổi role của Admin khác (cùng cấp bậc).
 *  3. Admin chỉ được thay đổi role của User thông thường.
 *  4. Role mới phải là 'user' hoặc 'admin'.
 *  5. Không đổi sang role đã có sẵn.
 *
 * @param {string} adminId      - ID của admin đang thực hiện (req.user._id)
 * @param {string} targetUserId - ID của user cần thay đổi role
 * @param {string} newRole      - Role mới: 'user' | 'admin'
 */
const updateUserRole = async (adminId, targetUserId, newRole) => {
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
        throw createError(400, 'ID người dùng không hợp lệ');
    }

    // Validate role value
    const validRoles = ['user', 'admin'];
    if (!newRole || !validRoles.includes(newRole)) {
        throw createError(400, `Role không hợp lệ. Chỉ chấp nhận: ${validRoles.join(', ')}`);
    }

    // Rule 1: Admin không được thay đổi role của chính mình
    if (adminId.toString() === targetUserId.toString()) {
        throw createError(403, 'Bạn không thể thay đổi role của chính mình');
    }

    // Tìm user target
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
        throw createError(404, 'Không tìm thấy người dùng');
    }

    // Rule 2: Admin không thể thay đổi role của Admin khác (cùng cấp bậc)
    if (targetUser.role === 'admin') {
        throw createError(
            403,
            'Không thể thay đổi role của Admin khác. Chỉ được phép thay đổi role của User thông thường'
        );
    }

    // Rule 5: Không đổi sang role đã có
    if (targetUser.role === newRole) {
        throw createError(400, `Người dùng này đã có role "${newRole}" rồi`);
    }

    // Cập nhật role
    targetUser.role = newRole;
    await targetUser.save();

    return targetUser;
};

module.exports = { getProfile, updateProfile, getAllUsers, updateUserRole };
