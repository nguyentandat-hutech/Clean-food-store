const mongoose = require('mongoose');
const Batch = require('../models/Batch');
const Product = require('../models/Product');
const { createError } = require('../utils/responseHelper');

// ── VALIDATION NGHIỆP VỤ ───────────────────────────────────────

/**
 * Validate dữ liệu lô hàng trước khi tạo/sửa.
 * Kiểm tra: product tồn tại, ngày hết hạn > ngày sản xuất, quantity hợp lệ.
 */
const validateBatchData = async (data, isUpdate = false) => {
    // Kiểm tra sản phẩm tồn tại
    if (data.product !== undefined) {
        const productExists = await Product.findById(data.product);
        if (!productExists) {
            throw createError(404, 'Sản phẩm không tồn tại. Vui lòng kiểm tra lại ID sản phẩm');
        }
    }

    // Kiểm tra mã lô hàng không trùng (khi tạo mới hoặc đổi mã)
    if (data.batchNumber !== undefined) {
        const existingBatch = await Batch.findOne({ batchNumber: data.batchNumber });
        if (existingBatch && (!isUpdate || existingBatch._id.toString() !== data._currentBatchId)) {
            throw createError(400, `Mã lô hàng "${data.batchNumber}" đã tồn tại trong hệ thống`);
        }
    }

    // Validate ngày sản xuất không được sau ngày hiện tại
    if (data.manufacturingDate !== undefined) {
        const mfgDate = new Date(data.manufacturingDate);
        if (isNaN(mfgDate.getTime())) {
            throw createError(400, 'Ngày sản xuất không hợp lệ');
        }
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (mfgDate > today) {
            throw createError(400, 'Ngày sản xuất không được sau ngày hiện tại');
        }
    }

    // Validate ngày hết hạn phải sau ngày sản xuất
    if (data.expiryDate !== undefined && data.manufacturingDate !== undefined) {
        const mfgDate = new Date(data.manufacturingDate);
        const expDate = new Date(data.expiryDate);
        if (isNaN(expDate.getTime())) {
            throw createError(400, 'Ngày hết hạn không hợp lệ');
        }
        if (expDate <= mfgDate) {
            throw createError(400, 'Ngày hết hạn phải sau ngày sản xuất');
        }
    }

    // Validate số lượng
    if (data.quantity !== undefined) {
        if (typeof data.quantity !== 'number' || data.quantity < 0) {
            throw createError(400, 'Số lượng phải là số không âm');
        }
    }

    if (data.originalQuantity !== undefined) {
        if (typeof data.originalQuantity !== 'number' || data.originalQuantity < 1) {
            throw createError(400, 'Số lượng ban đầu phải là số lớn hơn 0');
        }
    }
};

// ── CRUD LÔ HÀNG ────────────────────────────────────────────────

/**
 * Tạo lô hàng mới.
 * Khi tạo mới: quantity = originalQuantity (chưa bán/xuất gì).
 * Validate sản phẩm tồn tại, mã lô duy nhất, ngày hợp lệ.
 */
const createBatch = async (data) => {
    const { product, batchNumber, quantity, manufacturingDate, expiryDate } = data;

    // Kiểm tra các trường bắt buộc
    if (!product) throw createError(400, 'Sản phẩm không được để trống');
    if (!batchNumber || !batchNumber.trim()) throw createError(400, 'Mã lô hàng không được để trống');
    if (quantity === undefined || quantity === null) throw createError(400, 'Số lượng không được để trống');
    if (!manufacturingDate) throw createError(400, 'Ngày sản xuất không được để trống');
    if (!expiryDate) throw createError(400, 'Ngày hết hạn không được để trống');

    // Ép kiểu quantity sang number
    const qty = Number(quantity);
    if (isNaN(qty) || qty < 1) {
        throw createError(400, 'Số lượng phải là số lớn hơn 0');
    }

    // Khi tạo mới, originalQuantity = quantity (chưa xuất kho)
    const batchData = {
        product,
        batchNumber: batchNumber.trim(),
        quantity: qty,
        originalQuantity: qty,
        manufacturingDate: new Date(manufacturingDate),
        expiryDate: new Date(expiryDate),
    };

    // Validate nghiệp vụ
    await validateBatchData(batchData);

    // Tạo lô hàng trong Database
    const batch = await Batch.create(batchData);

    // Populate thông tin sản phẩm để trả về
    const populatedBatch = await Batch.findById(batch._id)
        .populate('product', 'name price unit');

    return populatedBatch;
};

/**
 * Lấy danh sách tất cả lô hàng (có phân trang, filter).
 * Query params: page, limit, product, expired (true/false)
 */
const getAllBatches = async (query = {}) => {
    const {
        page = 1,
        limit = 20,
        product,
        expired,
    } = query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    // Xây filter động
    const filter = {};

    // Filter theo sản phẩm
    if (product) {
        filter.product = product;
    }

    // Filter theo trạng thái hết hạn
    const now = new Date();
    if (expired === 'true') {
        filter.expiryDate = { $lte: now }; // Chỉ lấy lô đã hết hạn
    } else if (expired === 'false') {
        filter.expiryDate = { $gt: now };  // Chỉ lấy lô còn hạn
    }

    // Truy vấn song song: lấy danh sách + đếm tổng
    const [batches, total] = await Promise.all([
        Batch.find(filter)
            .populate('product', 'name price unit category')
            .sort({ expiryDate: 1 }) // Lô sắp hết hạn lên trước
            .skip(skip)
            .limit(limitNum),
        Batch.countDocuments(filter),
    ]);

    return {
        batches,
        pagination: {
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum),
        },
    };
};

/**
 * Lấy chi tiết 1 lô hàng theo ID.
 */
const getBatchById = async (batchId) => {
    const batch = await Batch.findById(batchId)
        .populate('product', 'name price unit category farm standards');

    if (!batch) {
        throw createError(404, 'Không tìm thấy lô hàng');
    }

    return batch;
};

/**
 * Cập nhật thông tin lô hàng.
 * Cho phép sửa: quantity, manufacturingDate, expiryDate, batchNumber.
 * KHÔNG cho phép thay đổi originalQuantity và product.
 */
const updateBatch = async (batchId, data) => {
    // Kiểm tra lô hàng tồn tại
    const batch = await Batch.findById(batchId);
    if (!batch) {
        throw createError(404, 'Không tìm thấy lô hàng');
    }

    // Whitelist các field được phép cập nhật
    const allowedFields = ['batchNumber', 'quantity', 'manufacturingDate', 'expiryDate'];
    const updateData = {};

    allowedFields.forEach((field) => {
        if (data[field] !== undefined) {
            updateData[field] = data[field];
        }
    });

    if (Object.keys(updateData).length === 0) {
        throw createError(400, 'Không có dữ liệu hợp lệ để cập nhật');
    }

    // Ép kiểu quantity nếu có
    if (updateData.quantity !== undefined) {
        updateData.quantity = Number(updateData.quantity);
    }

    // Nếu chỉ sửa expiryDate mà không gửi manufacturingDate → dùng ngày cũ
    if (updateData.expiryDate !== undefined && updateData.manufacturingDate === undefined) {
        updateData.manufacturingDate = batch.manufacturingDate;
    }
    // Nếu chỉ sửa manufacturingDate mà không gửi expiryDate → dùng ngày cũ
    if (updateData.manufacturingDate !== undefined && updateData.expiryDate === undefined) {
        updateData.expiryDate = batch.expiryDate;
    }

    // Gắn batchId hiện tại để validate trùng mã lô bỏ qua chính nó
    updateData._currentBatchId = batchId;

    // Validate nghiệp vụ
    await validateBatchData(updateData, true);

    // Xóa field tạm trước khi update
    delete updateData._currentBatchId;

    // Chuyển ngày sang Date object nếu cần
    if (updateData.manufacturingDate) {
        updateData.manufacturingDate = new Date(updateData.manufacturingDate);
    }
    if (updateData.expiryDate) {
        updateData.expiryDate = new Date(updateData.expiryDate);
    }

    // Cập nhật và trả về document mới
    const updatedBatch = await Batch.findByIdAndUpdate(
        batchId,
        { $set: updateData },
        { new: true, runValidators: true }
    ).populate('product', 'name price unit');

    return updatedBatch;
};

/**
 * Xóa lô hàng theo ID.
 */
const deleteBatch = async (batchId) => {
    const batch = await Batch.findById(batchId);
    if (!batch) {
        throw createError(404, 'Không tìm thấy lô hàng');
    }

    await Batch.findByIdAndDelete(batchId);

    return { id: batchId, batchNumber: batch.batchNumber };
};

// ── LOGIC TỒN KHO ──────────────────────────────────────────────

/**
 * Tính tồn kho thực tế của 1 sản phẩm.
 * Logic: Tổng quantity của tất cả các lô có expiryDate > ngày hiện tại.
 * Các lô đã hết hạn KHÔNG được tính vào kho bán.
 */
const getEffectiveStock = async (productId) => {
    // Kiểm tra sản phẩm tồn tại
    const product = await Product.findById(productId);
    if (!product) {
        throw createError(404, 'Sản phẩm không tồn tại');
    }

    const now = new Date();

    // Aggregate: tổng quantity các lô còn hạn
    const result = await Batch.aggregate([
        {
            $match: {
                product: new mongoose.Types.ObjectId(productId),
                expiryDate: { $gt: now }, // Chỉ lô còn hạn
                quantity: { $gt: 0 },     // Chỉ lô còn hàng
            },
        },
        {
            $group: {
                _id: '$product',
                effectiveStock: { $sum: '$quantity' },
                totalBatches: { $sum: 1 },       // Số lô còn hạn
            },
        },
    ]);

    const effectiveStock = result.length > 0 ? result[0].effectiveStock : 0;
    const totalBatches = result.length > 0 ? result[0].totalBatches : 0;

    return {
        product: {
            _id: product._id,
            name: product.name,
            unit: product.unit,
            price: product.price,
        },
        effectiveStock,
        totalBatches,
    };
};

/**
 * Báo cáo tồn kho tổng hợp: Danh sách TẤT CẢ sản phẩm + tồn kho thực tế.
 * Sử dụng aggregate pipeline để tính nhanh trên DB.
 */
const getInventoryReport = async () => {
    const now = new Date();

    // Aggregate: nhóm theo product, tính tổng quantity các lô còn hạn
    const stockData = await Batch.aggregate([
        {
            $match: {
                expiryDate: { $gt: now }, // Chỉ lô còn hạn
                quantity: { $gt: 0 },
            },
        },
        {
            $group: {
                _id: '$product',
                effectiveStock: { $sum: '$quantity' },
                totalBatches: { $sum: 1 },
                nearestExpiry: { $min: '$expiryDate' }, // Lô hết hạn gần nhất
            },
        },
    ]);

    // Chuyển aggregate result thành Map để tra nhanh
    const stockMap = new Map();
    stockData.forEach((item) => {
        stockMap.set(item._id.toString(), {
            effectiveStock: item.effectiveStock,
            totalBatches: item.totalBatches,
            nearestExpiry: item.nearestExpiry,
        });
    });

    // Lấy tất cả sản phẩm đang active
    const products = await Product.find({ isActive: true })
        .populate('category', 'name')
        .populate('farm', 'name')
        .sort({ name: 1 });

    // Ghép thông tin tồn kho vào từng sản phẩm
    const report = products.map((product) => {
        const stock = stockMap.get(product._id.toString()) || {
            effectiveStock: 0,
            totalBatches: 0,
            nearestExpiry: null,
        };

        return {
            product: {
                _id: product._id,
                name: product.name,
                price: product.price,
                unit: product.unit,
                category: product.category,
                farm: product.farm,
            },
            effectiveStock: stock.effectiveStock,
            totalBatches: stock.totalBatches,
            nearestExpiry: stock.nearestExpiry,
        };
    });

    return report;
};

/**
 * Lấy danh sách các lô hàng sắp hết hạn trong N ngày tới.
 * Mặc định: 7 ngày.
 * Chỉ lấy lô CHƯA hết hạn nhưng sẽ hết hạn sớm.
 */
const getExpiringBatches = async (days = 7) => {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + Number(days));

    // Lô chưa hết hạn (expiryDate > now) nhưng sẽ hết trong N ngày (expiryDate <= futureDate)
    const batches = await Batch.find({
        expiryDate: {
            $gt: now,
            $lte: futureDate,
        },
        quantity: { $gt: 0 }, // Chỉ lô còn hàng
    })
        .populate('product', 'name price unit')
        .sort({ expiryDate: 1 }); // Lô sắp hết hạn nhất lên trước

    return batches;
};

module.exports = {
    createBatch,
    getAllBatches,
    getBatchById,
    updateBatch,
    deleteBatch,
    getEffectiveStock,
    getInventoryReport,
    getExpiringBatches,
};
