const Product = require('../models/Product');
const Category = require('../models/Category');
const Farm = require('../models/Farm');
const { createError } = require('../utils/responseHelper');

// Danh sách field được phép cập nhật (whitelist)
const UPDATABLE_FIELDS = [
    'name', 'description', 'price', 'unit', 'category', 'farm',
    'standards', 'harvestDate', 'expiryDate', 'images', 'isActive',
];

/**
 * Validate nghiệp vụ chung cho tạo mới và cập nhật sản phẩm.
 * Kiểm tra: giá không âm, harvestDate <= ngày hiện tại, category/farm tồn tại.
 */
const validateProductData = async (data, isUpdate = false) => {
    // Validate giá không được âm
    if (data.price !== undefined) {
        if (typeof data.price !== 'number' || data.price < 0) {
            throw createError(400, 'Giá sản phẩm phải là số và không được âm');
        }
    }

    // Validate đơn vị tính
    if (data.unit !== undefined) {
        const validUnits = ['kg', 'bó', 'gói', 'hộp', 'túi', 'trái', 'lít'];
        if (!validUnits.includes(data.unit)) {
            throw createError(400, `Đơn vị tính phải là một trong: ${validUnits.join(', ')}`);
        }
    }

    // Validate tiêu chuẩn chất lượng
    if (data.standards !== undefined) {
        const validStandards = ['VietGAP', 'Organic', 'GlobalGAP', 'Khác'];
        if (!validStandards.includes(data.standards)) {
            throw createError(400, `Tiêu chuẩn phải là một trong: ${validStandards.join(', ')}`);
        }
    }

    // Validate ngày thu hoạch không được sau ngày hiện tại
    if (data.harvestDate !== undefined) {
        const harvestDate = new Date(data.harvestDate);
        if (isNaN(harvestDate.getTime())) {
            throw createError(400, 'Ngày thu hoạch không hợp lệ');
        }
        const today = new Date();
        today.setHours(23, 59, 59, 999); // Lấy cuối ngày hôm nay để so sánh
        if (harvestDate > today) {
            throw createError(400, 'Ngày thu hoạch không được sau ngày hiện tại');
        }
    }

    // Validate ngày hết hạn phải sau ngày thu hoạch
    if (data.expiryDate !== undefined && data.harvestDate !== undefined) {
        const harvestDate = new Date(data.harvestDate);
        const expiryDate = new Date(data.expiryDate);
        if (isNaN(expiryDate.getTime())) {
            throw createError(400, 'Ngày hết hạn không hợp lệ');
        }
        if (expiryDate <= harvestDate) {
            throw createError(400, 'Ngày hết hạn phải sau ngày thu hoạch');
        }
    }

    // Validate images là mảng
    if (data.images !== undefined) {
        if (!Array.isArray(data.images)) {
            throw createError(400, 'Hình ảnh phải là một mảng (array)');
        }
        if (data.images.length > 10) {
            throw createError(400, 'Tối đa 10 hình ảnh cho mỗi sản phẩm');
        }
    }

    // Kiểm tra Category tồn tại
    if (data.category !== undefined) {
        const categoryExists = await Category.findById(data.category);
        if (!categoryExists) {
            throw createError(404, 'Danh mục không tồn tại. Vui lòng kiểm tra lại ID danh mục');
        }
    }

    // Kiểm tra Farm tồn tại
    if (data.farm !== undefined) {
        const farmExists = await Farm.findById(data.farm);
        if (!farmExists) {
            throw createError(404, 'Trang trại không tồn tại. Vui lòng kiểm tra lại ID trang trại');
        }
    }
};

/**
 * Lấy danh sách tất cả sản phẩm (có phân trang, filter, tìm kiếm).
 * Query params: page, limit, category, farm, standards, minPrice, maxPrice, isActive, search
 */
const getAllProducts = async (query) => {
    const {
        page = 1,
        limit = 10,
        category,
        farm,
        standards,
        minPrice,
        maxPrice,
        isActive,
        search,
    } = query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    // Xây filter động
    const filter = {};

    // Filter theo danh mục
    if (category) {
        filter.category = category;
    }

    // Filter theo trang trại
    if (farm) {
        filter.farm = farm;
    }

    // Filter theo tiêu chuẩn
    if (standards) {
        const validStandards = ['VietGAP', 'Organic', 'GlobalGAP', 'Khác'];
        if (!validStandards.includes(standards)) {
            throw createError(400, `Tiêu chuẩn không hợp lệ. Chọn một trong: ${validStandards.join(', ')}`);
        }
        filter.standards = standards;
    }

    // Filter theo khoảng giá
    if (minPrice !== undefined || maxPrice !== undefined) {
        filter.price = {};
        if (minPrice !== undefined) {
            const min = parseFloat(minPrice);
            if (isNaN(min) || min < 0) {
                throw createError(400, 'Giá tối thiểu phải là số không âm');
            }
            filter.price.$gte = min;
        }
        if (maxPrice !== undefined) {
            const max = parseFloat(maxPrice);
            if (isNaN(max) || max < 0) {
                throw createError(400, 'Giá tối đa phải là số không âm');
            }
            filter.price.$lte = max;
        }
    }

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

    // Truy vấn song song: lấy danh sách (có populate) + đếm tổng
    const [products, total] = await Promise.all([
        Product.find(filter)
            .populate('category', 'name slug')       // Lấy tên & slug danh mục
            .populate('farm', 'name location')        // Lấy tên & địa chỉ trang trại
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum),
        Product.countDocuments(filter),
    ]);

    return {
        products,
        pagination: {
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum),
        },
    };
};

/**
 * Lấy chi tiết 1 sản phẩm theo ID (có populate).
 */
const getProductById = async (productId) => {
    const product = await Product.findById(productId)
        .populate('category', 'name slug description image')
        .populate('farm', 'name location contact certificate description isActive')
        .populate('createdBy', 'name email');

    if (!product) {
        throw createError(404, 'Không tìm thấy sản phẩm');
    }
    return product;
};

/**
 * Tạo sản phẩm mới.
 * @param {object} data    - Dữ liệu sản phẩm từ request body
 * @param {string} adminId - ID của admin đang tạo
 */
const createProduct = async (data, adminId) => {
    const {
        name, description, price, unit, category, farm,
        standards, harvestDate, expiryDate, images,
    } = data;

    // Validation nghiệp vụ: tên không được trống
    if (!name || name.trim().length < 2) {
        throw createError(400, 'Tên sản phẩm phải có ít nhất 2 ký tự');
    }

    // Validation bắt buộc cho tạo mới
    if (price === undefined || price === null) {
        throw createError(400, 'Giá sản phẩm không được để trống');
    }
    if (!unit) {
        throw createError(400, 'Đơn vị tính không được để trống');
    }
    if (!category) {
        throw createError(400, 'Danh mục sản phẩm không được để trống');
    }
    if (!farm) {
        throw createError(400, 'Trang trại cung cấp không được để trống');
    }
    if (!standards) {
        throw createError(400, 'Tiêu chuẩn chất lượng không được để trống');
    }
    if (!harvestDate) {
        throw createError(400, 'Ngày thu hoạch không được để trống');
    }
    if (!expiryDate) {
        throw createError(400, 'Ngày hết hạn không được để trống');
    }

    // Chạy validate nghiệp vụ chung (giá, ngày, FK...)
    await validateProductData(data);

    // Tạo sản phẩm mới trong Database
    const product = await Product.create({
        name: name.trim(),
        description: description ? description.trim() : '',
        price,
        unit,
        category,
        farm,
        standards,
        harvestDate: new Date(harvestDate),
        expiryDate: new Date(expiryDate),
        images: images || [],
        createdBy: adminId,
    });

    // Populate để trả về thông tin đầy đủ
    const populatedProduct = await Product.findById(product._id)
        .populate('category', 'name slug')
        .populate('farm', 'name location')
        .populate('createdBy', 'name email');

    return populatedProduct;
};

/**
 * Cập nhật thông tin sản phẩm.
 * @param {string} productId - ID sản phẩm cần update
 * @param {object} data      - Dữ liệu cần cập nhật
 */
const updateProduct = async (productId, data) => {
    // Kiểm tra sản phẩm tồn tại
    const product = await Product.findById(productId);
    if (!product) {
        throw createError(404, 'Không tìm thấy sản phẩm');
    }

    // Validate tên nếu được gửi lên
    if (data.name !== undefined) {
        if (!data.name || data.name.trim().length < 2) {
            throw createError(400, 'Tên sản phẩm phải có ít nhất 2 ký tự');
        }
        if (data.name.trim().length > 200) {
            throw createError(400, 'Tên sản phẩm không được vượt quá 200 ký tự');
        }
    }

    // Nếu chỉ cập nhật expiryDate mà không gửi harvestDate, dùng harvestDate cũ để so sánh
    if (data.expiryDate !== undefined && data.harvestDate === undefined) {
        data.harvestDate = product.harvestDate;
    }

    // Chạy validate nghiệp vụ chung (giá, ngày, FK...)
    await validateProductData(data, true);

    // Chỉ lấy các field nằm trong whitelist để cập nhật
    const updateData = {};
    UPDATABLE_FIELDS.forEach((field) => {
        if (data[field] !== undefined) {
            if (typeof data[field] === 'string') {
                updateData[field] = data[field].trim();
            } else {
                updateData[field] = data[field];
            }
        }
    });

    // Xử lý riêng cho trường ngày
    if (data.harvestDate !== undefined) {
        updateData.harvestDate = new Date(data.harvestDate);
    }
    if (data.expiryDate !== undefined) {
        updateData.expiryDate = new Date(data.expiryDate);
    }

    if (Object.keys(updateData).length === 0) {
        throw createError(400, 'Không có dữ liệu hợp lệ để cập nhật');
    }

    // Cập nhật và trả về document mới (có populate)
    const updatedProduct = await Product.findByIdAndUpdate(
        productId,
        { $set: updateData },
        { new: true, runValidators: true }
    )
        .populate('category', 'name slug')
        .populate('farm', 'name location')
        .populate('createdBy', 'name email');

    return updatedProduct;
};

/**
 * Xóa sản phẩm theo ID.
 * @param {string} productId - ID sản phẩm cần xóa
 */
const deleteProduct = async (productId) => {
    const product = await Product.findById(productId);
    if (!product) {
        throw createError(404, 'Không tìm thấy sản phẩm');
    }

    await Product.findByIdAndDelete(productId);

    // Trả về thông tin sản phẩm vừa xóa để client cập nhật UI
    return { id: productId, name: product.name };
};

module.exports = { getAllProducts, getProductById, createProduct, updateProduct, deleteProduct };
