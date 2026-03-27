const Discount = require('../models/Discount');
const { createError } = require('../utils/responseHelper');

/**
 * ── Discount Service ─────────────────────────────────────────────
 * Logic nghiệp vụ quản lý mã giảm giá.
 */

/**
 * Kiểm tra mã giảm giá hợp lệ và có thể áp dụng cho đơn hàng.
 *
 * @param {string} code        - Mã giảm giá (case-insensitive)
 * @param {number} orderTotal  - Tổng giá trị đơn hàng (trước khi giảm)
 * @returns {{ discount: object, discountAmount: number, finalPrice: number }}
 */
const validateDiscount = async (code, orderTotal) => {
    if (!code || !code.trim()) {
        throw createError(400, 'Vui lòng nhập mã giảm giá');
    }

    const discount = await Discount.findOne({ code: code.trim().toUpperCase() });

    if (!discount) {
        throw createError(404, `Mã giảm giá "${code.toUpperCase()}" không tồn tại`);
    }

    if (!discount.isActive) {
        throw createError(400, `Mã giảm giá "${discount.code}" đã bị vô hiệu hóa`);
    }

    // Kiểm tra ngày hết hạn
    if (discount.expiryDate && new Date() > discount.expiryDate) {
        throw createError(400, `Mã giảm giá "${discount.code}" đã hết hạn sử dụng`);
    }

    // Kiểm tra số lần sử dụng
    if (discount.maxUses !== null && discount.usedCount >= discount.maxUses) {
        throw createError(400, `Mã giảm giá "${discount.code}" đã hết lượt sử dụng`);
    }

    // Kiểm tra giá trị đơn hàng tối thiểu
    if (orderTotal < discount.minOrderAmount) {
        throw createError(
            400,
            `Đơn hàng phải có giá trị tối thiểu ${discount.minOrderAmount.toLocaleString('vi-VN')}đ để áp dụng mã này`
        );
    }

    // Tính số tiền giảm
    let discountAmount = 0;
    if (discount.type === 'percentage') {
        discountAmount = Math.round((orderTotal * discount.value) / 100);
    } else {
        // fixed — không giảm nhiều hơn tổng đơn
        discountAmount = Math.min(discount.value, orderTotal);
    }

    const finalPrice = Math.max(0, orderTotal - discountAmount);

    return {
        discount,
        discountAmount,
        finalPrice,
    };
};

/**
 * Tăng usedCount của mã giảm giá sau khi đơn hàng được tạo thành công.
 * Gọi ngay sau khi Order được persist.
 *
 * @param {string} code - Mã giảm giá (đã uppercase)
 */
const incrementDiscountUsage = async (code) => {
    if (!code) return;
    await Discount.findOneAndUpdate(
        { code: code.toUpperCase() },
        { $inc: { usedCount: 1 } }
    );
};

// ── CRUD ──────────────────────────────────────────────────────────

/**
 * Lấy danh sách mã giảm giá (admin).
 */
const getAllDiscounts = async (query = {}) => {
    const { page = 1, limit = 20, isActive } = query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    if (isActive !== undefined) {
        filter.isActive = isActive === 'true';
    }

    const [discounts, total] = await Promise.all([
        Discount.find(filter)
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum),
        Discount.countDocuments(filter),
    ]);

    return {
        discounts,
        pagination: {
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum),
        },
    };
};

/**
 * Tạo mã giảm giá mới.
 */
const createDiscount = async (data, adminId) => {
    const { code, type, value, minOrderAmount, maxUses, expiryDate } = data;

    // Validate bắt buộc
    if (!code || !code.trim()) throw createError(400, 'Mã giảm giá không được để trống');
    if (!type) throw createError(400, 'Loại giảm giá không được để trống');
    if (value === undefined || value === null) throw createError(400, 'Giá trị giảm không được để trống');

    const numericValue = Number(value);
    if (isNaN(numericValue) || numericValue <= 0) {
        throw createError(400, 'Giá trị giảm phải là số lớn hơn 0');
    }

    // Validate percentage không vượt quá 100%
    if (type === 'percentage' && numericValue > 100) {
        throw createError(400, 'Giảm theo phần trăm không được vượt quá 100%');
    }

    // Validate ngày hết hạn phải sau ngày hiện tại
    if (expiryDate) {
        const expDate = new Date(expiryDate);
        if (isNaN(expDate.getTime()) || expDate <= new Date()) {
            throw createError(400, 'Ngày hết hạn phải sau ngày hiện tại');
        }
    }

    // Kiểm tra mã trùng
    const existing = await Discount.findOne({ code: code.trim().toUpperCase() });
    if (existing) {
        throw createError(409, `Mã giảm giá "${code.toUpperCase()}" đã tồn tại`);
    }

    const discount = await Discount.create({
        code: code.trim().toUpperCase(),
        type,
        value: numericValue,
        minOrderAmount: Number(minOrderAmount) || 0,
        maxUses: maxUses !== undefined && maxUses !== null ? Number(maxUses) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        isActive: true,
        createdBy: adminId,
    });

    return discount;
};

/**
 * Cập nhật mã giảm giá.
 */
const updateDiscount = async (id, data) => {
    const discount = await Discount.findById(id);
    if (!discount) throw createError(404, 'Không tìm thấy mã giảm giá');

    // Whitelist fields được phép cập nhật
    const allowedFields = ['type', 'value', 'minOrderAmount', 'maxUses', 'expiryDate', 'isActive'];
    const updateData = {};

    allowedFields.forEach((field) => {
        if (data[field] !== undefined) {
            updateData[field] = data[field];
        }
    });

    // Validate value nếu có thay đổi
    if (updateData.value !== undefined) {
        const numericValue = Number(updateData.value);
        if (isNaN(numericValue) || numericValue <= 0) {
            throw createError(400, 'Giá trị giảm phải là số lớn hơn 0');
        }
        const effectiveType = updateData.type || discount.type;
        if (effectiveType === 'percentage' && numericValue > 100) {
            throw createError(400, 'Giảm theo phần trăm không được vượt quá 100%');
        }
        updateData.value = numericValue;
    }

    // Validate expiryDate nếu có
    if (updateData.expiryDate) {
        const expDate = new Date(updateData.expiryDate);
        if (isNaN(expDate.getTime())) {
            throw createError(400, 'Ngày hết hạn không hợp lệ');
        }
        updateData.expiryDate = expDate;
    }

    const updated = await Discount.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
    );

    return updated;
};

/**
 * Xóa mã giảm giá.
 */
const deleteDiscount = async (id) => {
    const discount = await Discount.findById(id);
    if (!discount) throw createError(404, 'Không tìm thấy mã giảm giá');

    await Discount.findByIdAndDelete(id);
    return { id, code: discount.code };
};

/**
 * Lấy chi tiết 1 mã giảm giá theo ID.
 */
const getDiscountById = async (id) => {
    const discount = await Discount.findById(id).populate('createdBy', 'name email');
    if (!discount) throw createError(404, 'Không tìm thấy mã giảm giá');
    return discount;
};

module.exports = {
    validateDiscount,
    incrementDiscountUsage,
    getAllDiscounts,
    createDiscount,
    updateDiscount,
    deleteDiscount,
    getDiscountById,
};
