// ============================================================
// FILE: backend/src/controllers/userController.js
// Muc dich: Xu ly HTTP request/response cho quan ly nguoi dung
// Tat ca logic thuc su nam trong userService
// ============================================================

// Nhap userService — chua logic: lay profile, cap nhat, phan quyen...
const userService = require('../services/userService');

// Nhap ham dinh dang response tra ve JSON chuan
const { successResponse } = require('../utils/responseHelper');

// ── LAY THONG TIN CA NHAN ────────────────────────────────────────────────────
// Route: GET /api/users/profile
// Quyen: Phai dang nhap (protect middleware dam bao dieu nay)
// req.user._id: ID cua user dang dang nhap, duoc middleware ghi vao
const getProfile = async (req, res) => {
    // Truyen ID cua user hien tai vao service de tim trong DB
    const user = await userService.getProfile(req.user._id);

    // 200 OK — Lay thanh cong, tra ve thong tin user
    return successResponse(res, 200, 'Lay thong tin profile thanh cong', { user });
};

// ── CAP NHAT THONG TIN CA NHAN ───────────────────────────────────────────────
// Route: PUT /api/users/profile
// Quyen: Phai dang nhap
// req.body: { name?: string, phone?: string }
const updateProfile = async (req, res) => {
    // req.user._id: ID nguoi dang cap nhat (chinh ho)
    // req.body: du lieu muon thay doi (name va/hoac phone)
    const updatedUser = await userService.updateProfile(req.user._id, req.body);

    // 200 OK — Cap nhat thanh cong, tra ve ban ghi da duoc cap nhat
    return successResponse(res, 200, 'Cap nhat thong tin thanh cong', { user: updatedUser });
};

// ── LAY DANH SACH TAT CA NGUOI DUNG (Admin only) ─────────────────────────────
// Route: GET /api/users
// Quyen: Chi admin moi truy cap duoc (authorize middleware kiem tra)
// req.query: { page, limit, search, role } — tham so phan trang va loc
const getAllUsers = async (req, res) => {
    // Lay cac tham so tu query string cua URL
    // Vi du: GET /api/users?page=2&limit=5&role=admin&search=nguyen
    const { page, limit, search, role } = req.query;

    // Truyen cac tham so vao service xu ly phan trang va tim kiem
    const result = await userService.getAllUsers({ page, limit, search, role });

    // result chua: { users: [...], pagination: { page, limit, total, totalPages } }
    return successResponse(res, 200, 'Lay danh sach nguoi dung thanh cong', result);
};

// ── CAP NHAT ROLE NGUOI DUNG (Admin only) ────────────────────────────────────
// Route: PATCH /api/users/:id/role
// Quyen: Chi admin
// req.params.id: ID cua user BI doi role
// req.body.role: role moi muon cap (user hoac admin)
const updateUserRole = async (req, res) => {
    const updatedUser = await userService.updateUserRole(
        req.user._id,     // adminId: ID admin dang thuc hien hanh dong
        req.params.id,    // targetUserId: ID user can thay doi role (tu URL :id)
        req.body.role     // newRole: role moi (tu body: { "role": "admin" })
    );

    // 200 OK — Cap nhat role thanh cong
    return successResponse(res, 200, 'Da cap nhat role thanh cong', {
        user: updatedUser,
    });
};

// Xuat 4 ham de userRoutes su dung
module.exports = { getProfile, updateProfile, getAllUsers, updateUserRole };
