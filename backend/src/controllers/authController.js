const authService = require('../services/authService');
const { successResponse } = require('../utils/responseHelper');

// ── POST /api/auth/register ────────────────────────────────────
// Controller chỉ nhận request, uỷ thác logic cho Service, trả JSON
const register = async (req, res) => {
  const { name, email, password } = req.body;

  const { user, token } = await authService.register({ name, email, password });

  return successResponse(res, 201, 'Đăng ký tài khoản thành công', { user, token });
};

// ── POST /api/auth/login ───────────────────────────────────────
const login = async (req, res) => {
  const { email, password } = req.body;

  const { user, token } = await authService.login({ email, password });

  return successResponse(res, 200, 'Đăng nhập thành công', { user, token });
};

// ── GET /api/auth/me ──────────────────────────────────────────
// Yêu cầu authMiddleware trước - req.user đã được gán từ middleware
const getMe = async (req, res) => {
  const user = await authService.getMe(req.user.id);

  return successResponse(res, 200, 'Lấy thông tin thành công', { user });
};

module.exports = { register, login, getMe };
