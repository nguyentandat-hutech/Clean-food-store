// ============================================================
// FILE: backend/src/routes/userRoutes.js
// Muc dich: Dinh nghia cac endpoint quan ly nguoi dung
// Tat ca routes bat dau bang /api/users/...
// ============================================================

// Nhap express va tao Router
const express = require('express');
const router = express.Router();

// Nhap userController — chua cac ham xu ly request
const userController = require('../controllers/userController');

// Nhap protect: middleware kiem tra JWT token (bat buoc dang nhap)
const { protect } = require('../middlewares/authMiddleware');

// Nhap authorize: middleware kiem tra role (chi cho phep role nhat dinh)
const { authorize } = require('../middlewares/roleMiddleware');

// ── AP DUNG PROTECT CHO TAT CA ROUTES TRONG FILE NAY ─────────────────────────
// router.use(protect): moi request den bat ky route nao trong file nay
// deu phai di qua middleware protect truoc
// Tiet kiem viec viet protect rieng cho tung route
router.use(protect);

// ── ROUTES QUAN LY PROFILE CA NHAN ───────────────────────────────────────────
// .route('/profile'): tao 1 nhom route cho cung 1 URL /profile
// .get(): xu ly GET /api/users/profile → lay thong tin ca nhan
// .put(): xu ly PUT /api/users/profile → cap nhat ho ten, so dien thoai
// Ca 2 deu can dang nhap (da co router.use(protect) ben tren)
router
    .route('/profile')
    .get(userController.getProfile)
    .put(userController.updateProfile);

// ── ROUTE LAY DANH SACH TAT CA USERS (Admin only) ────────────────────────────
// GET /api/users
// authorize('admin'): chi admin moi truy cap duoc
// Query string: ?page=1&limit=10&search=ten&role=user
router.get('/', authorize('admin'), userController.getAllUsers);

// ── ROUTE CAP NHAT ROLE NGUOI DUNG (Admin only) ───────────────────────────────
// PATCH /api/users/:id/role
// :id — tham so dong, la MongoDB ObjectId cua user can doi role
// Body: { "role": "admin" } hoac { "role": "user" }
// Quy tac an toan: admin khong the doi role cua admin khac
router.patch('/:id/role', authorize('admin'), userController.updateUserRole);

// Xuat router de duoc tich hop vao he thong routes
module.exports = router;
