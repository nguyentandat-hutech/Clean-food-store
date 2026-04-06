// ============================================================
// FILE: backend/src/routes/farmRoutes.js
// Muc dich: Dinh nghia cac endpoint quan ly trang trai
// Tat ca routes bat dau bang /api/farms/...
// Cau truc phan quyen: xem = cong khai; tao/sua/xoa = admin
// ============================================================

// Nhap express va tao Router
const express = require('express');
const router = express.Router();

// Nhap farmController — xu ly tat ca cac request lien quan den trang trai
const farmController = require('../controllers/farmController');

// Nhap protect: bat buoc dang nhap (co token JWT)
const { protect } = require('../middlewares/authMiddleware');

// Nhap authorize: bat buoc phai co role cu the (admin)
const { authorize } = require('../middlewares/roleMiddleware');

// ── ROUTES CONG KHAI — Ai cung co the xem ────────────────────────────────────
// Khong can dang nhap, khong can token

// GET /api/farms — Lay danh sach tat ca trang trai (co phan trang & filter)
// Query: ?page=1&limit=10&certificate=VietGAP&isActive=true&search=ten
router.get('/', farmController.getAllFarms);

// GET /api/farms/:id — Lay chi tiet 1 trang trai theo ID
// :id — tham so dong, la MongoDB ObjectId cua trang trai
router.get('/:id', farmController.getFarmById);

// ── ROUTES CHI DANH CHO ADMIN ─────────────────────────────────────────────────
// Tuong tu quy trinh nhu sau:
// Request → protect (kiem tra token) → authorize (kiem tra la admin) → controller

// POST /api/farms — Tao trang trai moi
// Body: { name, location, description?, contact, certificate }
router.post('/', protect, authorize('admin'), farmController.createFarm);

// PUT /api/farms/:id — Cap nhat thong tin trang trai
// Body: bat ky truong nao muon thay doi
router.put('/:id', protect, authorize('admin'), farmController.updateFarm);

// DELETE /api/farms/:id — Xoa trang trai vinh vien
// Chu y: khong co undo, du lieu mat vinh vien
router.delete('/:id', protect, authorize('admin'), farmController.deleteFarm);

// Xuat router de duoc tich hop vao he thong routes
module.exports = router;
