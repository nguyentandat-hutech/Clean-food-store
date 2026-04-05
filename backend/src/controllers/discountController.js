const discountService = require('../services/discountService');
const { successResponse } = require('../utils/responseHelper');

/**
 * ── Discount Controller ──────────────────────────────────────────
 * Thin controller — chỉ nhận request, gọi service, trả JSON.
 */

// POST /api/discounts/validate — Kiểm tra mã giảm giá (user)
const validateDiscount = async (req, res) => {
    const { code, orderTotal } = req.body;
    const result = await discountService.validateDiscount(code, Number(orderTotal));
    return successResponse(res, 200, 'Mã giảm giá hợp lệ', {
        code: result.discount.code,
        type: result.discount.type,
        value: result.discount.value,
        discountAmount: result.discountAmount,
        finalPrice: result.finalPrice,
    });
};

// GET /api/discounts — Danh sách mã giảm giá (admin)
const getAllDiscounts = async (req, res) => {
    const result = await discountService.getAllDiscounts(req.query);
    return successResponse(res, 200, 'Lấy danh sách mã giảm giá thành công', result);
};

// GET /api/discounts/:id — Chi tiết mã giảm giá (admin)
const getDiscountById = async (req, res) => {
    const discount = await discountService.getDiscountById(req.params.id);
    return successResponse(res, 200, 'Lấy chi tiết mã giảm giá thành công', discount);
};

// POST /api/discounts — Tạo mã giảm giá (admin)
const createDiscount = async (req, res) => {
    const discount = await discountService.createDiscount(req.body, req.user._id);
    return successResponse(res, 201, 'Tạo mã giảm giá thành công', discount);
};

// PUT /api/discounts/:id — Cập nhật mã giảm giá (admin)
const updateDiscount = async (req, res) => {
    const discount = await discountService.updateDiscount(req.params.id, req.body);
    return successResponse(res, 200, 'Cập nhật mã giảm giá thành công', discount);
};

// DELETE /api/discounts/:id — Xóa mã giảm giá (admin)
const deleteDiscount = async (req, res) => {
    const result = await discountService.deleteDiscount(req.params.id);
    return successResponse(res, 200, 'Xóa mã giảm giá thành công', result);
};

module.exports = {
    validateDiscount,
    getAllDiscounts,
    getDiscountById,
    createDiscount,
    updateDiscount,
    deleteDiscount,
};
