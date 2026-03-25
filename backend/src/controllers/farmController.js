const farmService = require('../services/farmService');
const { successResponse } = require('../utils/responseHelper');

/**
 * GET /api/farms
 * Lấy danh sách tất cả trang trại (public — ai cũng xem được).
 * Query: ?page=1&limit=10&certificate=VietGAP&isActive=true&search=...
 */
const getAllFarms = async (req, res) => {
    const result = await farmService.getAllFarms(req.query);
    return successResponse(res, 200, 'Lấy danh sách trang trại thành công', result);
};

/**
 * GET /api/farms/:id
 * Lấy chi tiết 1 trang trại theo ID (public).
 */
const getFarmById = async (req, res) => {
    const farm = await farmService.getFarmById(req.params.id);
    return successResponse(res, 200, 'Lấy thông tin trang trại thành công', { farm });
};

/**
 * POST /api/farms
 * Tạo trang trại mới (Admin only).
 * Body: { name, location, description?, contact, certificate }
 */
const createFarm = async (req, res) => {
    const farm = await farmService.createFarm(req.body, req.user._id);
    return successResponse(res, 201, 'Tạo trang trại thành công', { farm });
};

/**
 * PUT /api/farms/:id
 * Cập nhật thông tin trang trại (Admin only).
 * Body: bất kỳ field nào muốn update
 */
const updateFarm = async (req, res) => {
    const farm = await farmService.updateFarm(req.params.id, req.body);
    return successResponse(res, 200, 'Cập nhật trang trại thành công', { farm });
};

/**
 * DELETE /api/farms/:id
 * Xóa trang trại (Admin only).
 */
const deleteFarm = async (req, res) => {
    const deleted = await farmService.deleteFarm(req.params.id);
    return successResponse(res, 200, 'Xóa trang trại thành công', deleted);
};

module.exports = { getAllFarms, getFarmById, createFarm, updateFarm, deleteFarm };
