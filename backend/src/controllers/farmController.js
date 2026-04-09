// ============================================================
// FILE: backend/src/controllers/farmController.js
// Muc dich: Xu ly HTTP request/response cho quan ly trang trai
// Tat ca business logic nam trong farmService
// ============================================================

// Nhap farmService — xu ly CRUD trang trai
const farmService = require('../services/farmService');

// Nhap ham tra ve JSON response theo dinh dang chuan
const { successResponse } = require('../utils/responseHelper');

// ── LAY DANH SACH TRANG TRAI ─────────────────────────────────────────────────
// Route: GET /api/farms
// Quyen: Cong khai — ai cung xem duoc (khong can dang nhap)
// req.query: { page, limit, certificate, isActive, search }
const getAllFarms = async (req, res) => {
    // Truyen toan bo query string vao service de loc va phan trang
    const result = await farmService.getAllFarms(req.query);

    // result = { farms: [...], pagination: { total, page, limit, totalPages } }
    return successResponse(res, 200, 'Lay danh sach trang trai thanh cong', result);
};

// ── LAY CHI TIET 1 TRANG TRAI ────────────────────────────────────────────────
// Route: GET /api/farms/:id
// Quyen: Cong khai
// req.params.id: MongoDB ObjectId cua trang trai (lay tu URL, vi du: /farms/abc123)
const getFarmById = async (req, res) => {
    // Truyen ID trang trai vao service de tim trong DB
    const farm = await farmService.getFarmById(req.params.id);

    return successResponse(res, 200, 'Lay thong tin trang trai thanh cong', { farm });
};

// ── TAO TRANG TRAI MOI ────────────────────────────────────────────────────────
// Route: POST /api/farms
// Quyen: Phai la admin (protect + authorize('admin') middlewares)
// req.body: { name, location, description?, contact, certificate }
// req.user._id: ID cua admin dang tao (de ghi vao truong createdBy)
const createFarm = async (req, res) => {
    // req.body: du lieu trang trai tu client gui len
    // req.user._id: ID admin, se luu vao createdBy cua Farm document
    const farm = await farmService.createFarm(req.body, req.user._id);

    // 201 Created — da tao thanh cong tai nguyen moi
    return successResponse(res, 201, 'Tao trang trai thanh cong', { farm });
};

// ── CAP NHAT TRANG TRAI ───────────────────────────────────────────────────────
// Route: PUT /api/farms/:id
// Quyen: Admin only
// req.params.id: ID trang trai can chinh sua
// req.body: cac truong muon thay doi (co the la 1 hoac nhieu truong)
const updateFarm = async (req, res) => {
    // Truyen ID tu params va du lieu moi tu body vao service
    const farm = await farmService.updateFarm(req.params.id, req.body);

    return successResponse(res, 200, 'Cap nhat trang trai thanh cong', { farm });
};

// ── XOA TRANG TRAI ────────────────────────────────────────────────────────────
// Route: DELETE /api/farms/:id
// Quyen: Admin only
// req.params.id: ID trang trai can xoa
const deleteFarm = async (req, res) => {
    // Service tra ve { id, name } cua farm vua xoa
    const deleted = await farmService.deleteFarm(req.params.id);

    // Tra ve thong tin trang trai da xoa (client dung de xoa khoi danh sach)
    return successResponse(res, 200, 'Xoa trang trai thanh cong', deleted);
};

// Xuat 5 ham de farmRoutes su dung
module.exports = { getAllFarms, getFarmById, createFarm, updateFarm, deleteFarm };
