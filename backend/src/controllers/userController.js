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

module.exports = { getProfile, updateProfile };
