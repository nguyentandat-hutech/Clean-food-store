const Farm = require('../models/Farm');
const { createError } = require('../utils/responseHelper');

// Danh sách field được phép update (whitelist)
const UPDATABLE_FIELDS = ['name', 'location', 'description', 'contact', 'certificate', 'isActive'];

/**
 * Lấy danh sách tất cả trang trại (có phân trang & filter).
 * Query params: page, limit, certificate, isActive, search
 */
const getAllFarms = async (query) => {
    const {
        page = 1,
        limit = 10,
        certificate,
        isActive,
        search,
    } = query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    // Xây filter động
    const filter = {};

    if (certificate) {
        const validCerts = ['VietGAP', 'Organic', 'GlobalGAP', 'Khác'];
        if (!validCerts.includes(certificate)) {
            throw createError(400, `Chứng nhận không hợp lệ. Chọn một trong: ${validCerts.join(', ')}`);
        }
        filter.certificate = certificate;
    }

    if (isActive !== undefined) {
        filter.isActive = isActive === 'true' || isActive === true;
    }

    if (search && search.trim()) {
        // Tìm kiếm không phân biệt hoa thường trong tên và địa điểm
        filter.$or = [
            { name: { $regex: search.trim(), $options: 'i' } },
            { location: { $regex: search.trim(), $options: 'i' } },
        ];
    }

    const [farms, total] = await Promise.all([
        Farm.find(filter)
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum),
        Farm.countDocuments(filter),
    ]);

    return {
        farms,
        pagination: {
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum),
        },
    };
};

/**
 * Lấy thông tin chi tiết 1 trang trại theo ID.
 */
const getFarmById = async (farmId) => {
    const farm = await Farm.findById(farmId).populate('createdBy', 'name email');
    if (!farm) {
        throw createError(404, 'Không tìm thấy trang trại');
    }
    return farm;
};

/**
 * Tạo trang trại mới.
 * @param {object} data    - Dữ liệu farm từ request body
 * @param {string} adminId - ID của admin đang tạo
 */
const createFarm = async (data, adminId) => {
    const { name, location, description, contact, certificate } = data;

    // Validation nghiệp vụ
    if (!name || name.trim().length < 2) {
        throw createError(400, 'Tên trang trại phải có ít nhất 2 ký tự');
    }
    if (!location || !location.trim()) {
        throw createError(400, 'Địa chỉ trang trại không được để trống');
    }
    if (!contact || !contact.trim()) {
        throw createError(400, 'Thông tin liên hệ không được để trống');
    }
    const validCerts = ['VietGAP', 'Organic', 'GlobalGAP', 'Khác'];
    if (!certificate || !validCerts.includes(certificate)) {
        throw createError(400, `Chứng nhận phải là một trong: ${validCerts.join(', ')}`);
    }

    // Kiểm tra trùng tên trong cùng địa điểm
    const existingFarm = await Farm.findOne({
        name: { $regex: `^${name.trim()}$`, $options: 'i' },
        location: { $regex: `^${location.trim()}$`, $options: 'i' },
    });
    if (existingFarm) {
        throw createError(409, 'Trang trại với tên và địa điểm này đã tồn tại');
    }

    const farm = await Farm.create({
        name: name.trim(),
        location: location.trim(),
        description: description ? description.trim() : '',
        contact: contact.trim(),
        certificate,
        createdBy: adminId,
    });

    return farm;
};

/**
 * Cập nhật thông tin trang trại.
 * @param {string} farmId  - ID của trang trại cần update
 * @param {object} data    - Dữ liệu cần cập nhật
 */
const updateFarm = async (farmId, data) => {
    // Kiểm tra farm tồn tại
    const farm = await Farm.findById(farmId);
    if (!farm) {
        throw createError(404, 'Không tìm thấy trang trại');
    }

    // Validation từng field nếu được gửi lên
    if (data.name !== undefined) {
        if (!data.name || data.name.trim().length < 2) {
            throw createError(400, 'Tên trang trại phải có ít nhất 2 ký tự');
        }
        if (data.name.trim().length > 100) {
            throw createError(400, 'Tên trang trại không được vượt quá 100 ký tự');
        }
    }
    if (data.location !== undefined && !data.location.trim()) {
        throw createError(400, 'Địa chỉ trang trại không được để trống');
    }
    if (data.contact !== undefined && !data.contact.trim()) {
        throw createError(400, 'Thông tin liên hệ không được để trống');
    }
    if (data.certificate !== undefined) {
        const validCerts = ['VietGAP', 'Organic', 'GlobalGAP', 'Khác'];
        if (!validCerts.includes(data.certificate)) {
            throw createError(400, `Chứng nhận phải là một trong: ${validCerts.join(', ')}`);
        }
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

    const updatedFarm = await Farm.findByIdAndUpdate(
        farmId,
        { $set: updateData },
        { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    return updatedFarm;
};

/**
 * Xóa trang trại theo ID.
 * @param {string} farmId - ID của trang trại cần xóa
 */
const deleteFarm = async (farmId) => {
    const farm = await Farm.findById(farmId);
    if (!farm) {
        throw createError(404, 'Không tìm thấy trang trại');
    }

    await Farm.findByIdAndDelete(farmId);

    // Trả về thông tin farm vừa xóa để client xử lý UI
    return { id: farmId, name: farm.name };
};

module.exports = { getAllFarms, getFarmById, createFarm, updateFarm, deleteFarm };
