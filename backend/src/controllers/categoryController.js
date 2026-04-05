const categoryService = require('../services/categoryService');
const { successResponse } = require('../utils/responseHelper');

/**
 * GET /api/categories
 * Lấy danh sách tất cả danh mục (public — ai cũng xem được).
 * Query: ?page=1&limit=10&isActive=true&search=...
 */
const getAllCategories = async (req, res) => {
    const result = await categoryService.getAllCategories(req.query);
    return successResponse(res, 200, 'Lấy danh sách danh mục thành công', result);
};

/**
 * GET /api/categories/:id
 * Lấy chi tiết 1 danh mục theo ID (public).
 */
const getCategoryById = async (req, res) => {
    const category = await categoryService.getCategoryById(req.params.id);
    return successResponse(res, 200, 'Lấy thông tin danh mục thành công', { category });
};

/**
 * POST /api/categories
 * Tạo danh mục mới (Admin only).
 * Body: { name, description?, image? }
 */
const createCategory = async (req, res) => {
    const category = await categoryService.createCategory(req.body, req.user._id);
    return successResponse(res, 201, 'Tạo danh mục thành công', { category });
};

/**
 * PUT /api/categories/:id
 * Cập nhật thông tin danh mục (Admin only).
 * Body: bất kỳ field nào muốn update (name, description, image, isActive)
 */
const updateCategory = async (req, res) => {
    const category = await categoryService.updateCategory(req.params.id, req.body);
    return successResponse(res, 200, 'Cập nhật danh mục thành công', { category });
};

/**
 * DELETE /api/categories/:id
 * Xóa danh mục (Admin only).
 */
const deleteCategory = async (req, res) => {
    const deleted = await categoryService.deleteCategory(req.params.id);
    return successResponse(res, 200, 'Xóa danh mục thành công', deleted);
};

module.exports = { getAllCategories, getCategoryById, createCategory, updateCategory, deleteCategory };
