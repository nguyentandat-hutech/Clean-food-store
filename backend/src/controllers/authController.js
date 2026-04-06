// ============================================================
// FILE: backend/src/controllers/authController.js
// Muc dich: Nhan HTTP request, goi Service xu ly, tra HTTP response
// Controller rat mong — khong co business logic, chi dieu phoi
// ============================================================

// Nhap authService — noi chua toan bo logic xac thuc
const authService = require('../services/authService');

// Nhap ham tra response chuan: successResponse(res, statusCode, message, data)
const { successResponse } = require('../utils/responseHelper');

// ── DANG KY TAI KHOAN MOI ────────────────────────────────────────────────────
// Route: POST /api/auth/register
// Quyen truy cap: Cong khai (ai cung dang ky duoc)
// req.body can co: { name, email, password }
const register = async (req, res) => {
    // Lay cac truong tu body cua HTTP request
    const { name, email, password } = req.body;

    // Goi service xu ly: validate, kiem tra trung email, hash password, tao user
    // Destructuring: lay ca user va token tu ket qua tra ve
    const { user, token } = await authService.register({ name, email, password });

    // Tra ve HTTP 201 Created — thanh cong tao tai nguyen moi
    // successResponse se format JSON: { success: true, message, data: { user, token } }
    return successResponse(res, 201, 'Dang ky tai khoan thanh cong', { user, token });
};

// ── DANG NHAP ────────────────────────────────────────────────────────────────
// Route: POST /api/auth/login
// Quyen truy cap: Cong khai
// req.body can co: { email, password }
const login = async (req, res) => {
    // Lay email va password tu body request
    const { email, password } = req.body;

    // Goi service: tim user, kiem tra isActive, so sanh password, tao token
    const { user, token } = await authService.login({ email, password });

    // Tra ve 200 OK cung voi user info va JWT token
    return successResponse(res, 200, 'Dang nhap thanh cong', { user, token });
};

// ── LAY THONG TIN NGUOI DUNG DANG NHAP ───────────────────────────────────────
// Route: GET /api/auth/me
// Quyen truy cap: Can dang nhap (co middleware protect phia truoc)
// req.user duoc ghi boi authMiddleware sau khi verify token thanh cong
const getMe = async (req, res) => {
    // req.user.id: lay ID tu token da duoc decode boi middleware protect
    const user = await authService.getMe(req.user.id);

    // Tra ve 200 OK voi thong tin user
    return successResponse(res, 200, 'Lay thong tin thanh cong', { user });
};

// Xuat 3 ham de authRoutes su dung
module.exports = { register, login, getMe };
