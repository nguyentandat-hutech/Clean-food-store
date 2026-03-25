const Category = require('../models/Category');
const { createError } = require('../utils/responseHelper');

// Danh sách field được phép cập nhật (whitelist)
const UPDATABLE_FIELDS = ['name', 'description', 'image', 'isActive'];

/**
 * Lấy danh sách tất cả danh mục (có phân trang & filter).
 * Query params: page, limit, isActive, search
 */
const getAllCategories = async (query) => {
    const {
        page = 1,
        limit = 10,
        isActive,
        search,
    } = query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    // Xây filter động
    const filter = {};

    // Filter theo trạng thái hoạt động
    if (isActive !== undefined) {
        filter.isActive = isActive === 'true' || isActive === true;
    }

    // Tìm kiếm theo tên hoặc mô tả (không phân biệt hoa thường)
    if (search && search.trim()) {
        filter.$or = [
            { name: { $regex: search.trim(), $options: 'i' } },
            { description: { $regex: search.trim(), $options: 'i' } },
        ];
    }

    // Truy vấn song song: lấy danh sách + đếm tổng
    const [categories, total] = await Promise.all([
        Category.find(filter)
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum),
        Category.countDocuments(filter),
    ]);

    return {
        categories,
        pagination: {
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum),
        },
    };
};

/**
 * Lấy thông tin chi tiết 1 danh mục theo ID.
 */
const getCategoryById = async (categoryId) => {
    const category = await Category.findById(categoryId).populate('createdBy', 'name email');
    if (!category) {
        throw createError(404, 'Không tìm thấy danh mục');
    }
    return category;
};

/**
 * Tạo danh mục mới.
 * @param {object} data    - Dữ liệu danh mục từ request body
 * @param {string} adminId - ID của admin đang tạo
 */
const createCategory = async (data, adminId) => {
    const { name, description, image } = data;

    // Validation nghiệp vụ: tên không được trống và phải >= 2 ký tự
    if (!name || name.trim().length < 2) {
        throw createError(400, 'Tên danh mục phải có ít nhất 2 ký tự');
    }

    // Kiểm tra trùng tên danh mục (case-insensitive)
    const existingCategory = await Category.findOne({
        name: { $regex: `^${name.trim()}$`, $options: 'i' },
    });
    if (existingCategory) {
        throw createError(400, 'Tên danh mục đã tồn tại. Vui lòng chọn tên khác');
    }

    // Tạo danh mục mới trong Database
    const category = await Category.create({
        name: name.trim(),
        description: description ? description.trim() : '',
        image: image ? image.trim() : '',
        createdBy: adminId,
    });

    return category;
};

/**
 * Cập nhật thông tin danh mục.
 * @param {string} categoryId - ID danh mục cần update
 * @param {object} data       - Dữ liệu cần cập nhật
 */
const updateCategory = async (categoryId, data) => {
    // Kiểm tra danh mục tồn tại
    const category = await Category.findById(categoryId);
    if (!category) {
        throw createError(404, 'Không tìm thấy danh mục');
    }

    // Validation từng field nếu được gửi lên
    if (data.name !== undefined) {
        if (!data.name || data.name.trim().length < 2) {
            throw createError(400, 'Tên danh mục phải có ít nhất 2 ký tự');
        }
        if (data.name.trim().length > 100) {
            throw createError(400, 'Tên danh mục không được vượt quá 100 ký tự');
        }

        // Kiểm tra trùng tên với danh mục khác (không phải chính nó)
        const existingCategory = await Category.findOne({
            name: { $regex: `^${data.name.trim()}$`, $options: 'i' },
            _id: { $ne: categoryId }, // Loại trừ chính danh mục đang sửa
        });
        if (existingCategory) {
            throw createError(400, 'Tên danh mục đã tồn tại. Vui lòng chọn tên khác');
        }
    }

    if (data.description !== undefined && data.description.trim().length > 500) {
        throw createError(400, 'Mô tả không được vượt quá 500 ký tự');
    }

    // Chỉ lấy các field nằm trong whitelist để cập nhật
    const updateData = {};
    UPDATABLE_FIELDS.forEach((field) => {
        if (data[field] !== undefined) {
            updateData[field] = typeof data[field] === 'string' ? data[field].trim() : data[field];
        }
    });

    if (Object.keys(updateData).length === 0) {
        throw createError(400, 'Không có dữ liệu hợp lệ để cập nhật');
    }

    // Cập nhật và trả về document mới
    const updatedCategory = await Category.findByIdAndUpdate(
        categoryId,
        { $set: updateData },
        { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    return updatedCategory;
};

/**
 * Xóa danh mục theo ID.
 * @param {string} categoryId - ID danh mục cần xóa
 */
const deleteCategory = async (categoryId) => {
    const category = await Category.findById(categoryId);
    if (!category) {
        throw createError(404, 'Không tìm thấy danh mục');
    }

    await Category.findByIdAndDelete(categoryId);

    // Trả về thông tin danh mục vừa xóa để client cập nhật UI
    return { id: categoryId, name: category.name };
};

module.exports = { getAllCategories, getCategoryById, createCategory, updateCategory, deleteCategory };
