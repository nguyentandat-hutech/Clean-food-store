const userService = require('../services/userService');
const { successResponse } = require('../utils/responseHelper');

/**
 * GET /api/users/profile
 * Trả về thông tin profile của user đang đăng nhập.
 * Yêu cầu: protect middleware đã gán req.user.
 */
const getProfile = async (req, res) => {
    const user = await userService.getProfile(req.user._id);
    return successResponse(res, 200, 'Lấy thông tin profile thành công', { user });
};

/**
 * PUT /api/users/profile
 * Cập nhật họ tên và số điện thoại của user đang đăng nhập.
 * Body: { name: string, phone?: string }
 */
const updateProfile = async (req, res) => {
    const updatedUser = await userService.updateProfile(req.user._id, req.body);
    return successResponse(res, 200, 'Cập nhật thông tin thành công', { user: updatedUser });
};

/**
 * GET /api/users
 * [Admin only] Lấy danh sách tất cả người dùng với phân trang & tìm kiếm.
 * Query: page, limit, search, role
 */
const getAllUsers = async (req, res) => {
    const { page, limit, search, role } = req.query;
    const result = await userService.getAllUsers({ page, limit, search, role });
    return successResponse(res, 200, 'Lấy danh sách người dùng thành công', result);
};

/**
 * PATCH /api/users/:id/role
 * [Admin only] Thay đổi role của người dùng.
 * Body: { role: 'user' | 'admin' }
 * Business rule: Admin không thể thay đổi role của Admin khác.
 */
const updateUserRole = async (req, res) => {
    const updatedUser = await userService.updateUserRole(
        req.user._id,
        req.params.id,
        req.body.role
    );
    return successResponse(res, 200, `Đã cập nhật role thành "${req.body.role}" thành công`, {
        user: updatedUser,
    });
};

module.exports = { getProfile, updateProfile, getAllUsers, updateUserRole };
