const mongoose = require('mongoose');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Batch = require('../models/Batch');
const { getEffectiveStock } = require('./batchService');
const { createError } = require('../utils/responseHelper');

/**
 * ── Order Service ────────────────────────────────────────────────
 * Logic nghiệp vụ cho Đặt hàng.
 * Đảm bảo atomicity: nếu trừ kho lỗi thì rollback toàn bộ.
 */

/**
 * Trừ kho theo FIFO — lô gần hết hạn trừ trước.
 * Hàm nội bộ, chỉ được gọi bởi createOrderCOD().
 *
 * @param {string} productId
 * @param {number} quantityToDeduct - Số lượng cần trừ
 * @returns {Array} Danh sách các lô đã trừ (để rollback nếu cần)
 */
const deductStockFIFO = async (productId, quantityToDeduct) => {
    const now = new Date();

    // Lấy các lô còn hạn + còn hàng, sắp xếp theo expiryDate ASC (gần hết hạn trước)
    const batches = await Batch.find({
        product: new mongoose.Types.ObjectId(productId),
        expiryDate: { $gt: now },
        quantity: { $gt: 0 },
    }).sort({ expiryDate: 1 });

    let remaining = quantityToDeduct;
    const deductedBatches = []; // Lưu lại để rollback nếu cần

    for (const batch of batches) {
        if (remaining <= 0) break;

        const deductFromThis = Math.min(batch.quantity, remaining);
        batch.quantity -= deductFromThis;
        await batch.save();

        deductedBatches.push({
            batchId: batch._id,
            deducted: deductFromThis,
        });

        remaining -= deductFromThis;
    }

    // Nếu vẫn còn thiếu → lỗi nghiêm trọng (không đủ kho)
    if (remaining > 0) {
        // Rollback các lô đã trừ
        for (const item of deductedBatches) {
            await Batch.findByIdAndUpdate(item.batchId, {
                $inc: { quantity: item.deducted },
            });
        }
        throw createError(400, `Không đủ tồn kho cho sản phẩm (thiếu ${remaining})`);
    }

    return deductedBatches;
};

/**
 * Hoàn kho — trả lại số lượng đã trừ khi hủy đơn.
 * Cộng lại quantity cho các batch gần hết hạn nhất.
 *
 * @param {string} productId
 * @param {number} quantityToRestore
 */
const restoreStock = async (productId, quantityToRestore) => {
    const now = new Date();

    // Lấy các batch còn hạn (bao gồm cả batch quantity = 0), expiryDate ASC
    const batches = await Batch.find({
        product: new mongoose.Types.ObjectId(productId),
        expiryDate: { $gt: now },
    }).sort({ expiryDate: 1 });

    let remaining = quantityToRestore;

    for (const batch of batches) {
        if (remaining <= 0) break;

        // Hoàn tối đa bằng originalQuantity - quantity hiện tại
        const canRestore = batch.originalQuantity - batch.quantity;
        const restoreAmount = Math.min(canRestore, remaining);

        if (restoreAmount > 0) {
            batch.quantity += restoreAmount;
            await batch.save();
            remaining -= restoreAmount;
        }
    }

    // Nếu không hoàn hết được (batch đã bị xóa khỏi DB) → log warning
    if (remaining > 0) {
        console.warn(
            `[ORDER] Không thể hoàn hết kho cho product ${productId}. Còn thiếu ${remaining}`
        );
    }
};

/**
 * Tạo đơn hàng COD.
 * Flow: Validate giỏ → Check tồn kho → Tạo Order → Trừ kho FIFO → Xóa giỏ
 *
 * @param {string} userId
 * @param {object} shippingAddress - { fullName, phone, address }
 * @param {string} note - Ghi chú (tùy chọn)
 */
const createOrderCOD = async (userId, shippingAddress, note = '') => {
    // ── 1. Validate địa chỉ giao hàng ────────────────────────────
    if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.phone || !shippingAddress.address) {
        throw createError(400, 'Vui lòng cung cấp đầy đủ thông tin giao hàng (fullName, phone, address)');
    }

    // Validate số điện thoại (10-11 số)
    const phoneRegex = /^[0-9]{10,11}$/;
    if (!phoneRegex.test(shippingAddress.phone)) {
        throw createError(400, 'Số điện thoại không hợp lệ (10-11 chữ số)');
    }

    // ── 2. Lấy giỏ hàng + validate không rỗng ───────────────────
    const cart = await Cart.findOne({ userId }).populate(
        'products.productId',
        'name price unit isActive'
    );

    if (!cart || cart.products.length === 0) {
        throw createError(400, 'Giỏ hàng trống. Vui lòng thêm sản phẩm trước khi đặt hàng');
    }

    // ── 3. Kiểm tra tồn kho lần cuối cho từng sản phẩm ─────────
    const orderProducts = [];
    let totalPrice = 0;

    for (const item of cart.products) {
        const product = item.productId;

        // Kiểm tra sản phẩm vẫn tồn tại và đang active
        if (!product) {
            throw createError(400, 'Một sản phẩm trong giỏ đã bị xóa khỏi hệ thống');
        }
        if (!product.isActive) {
            throw createError(
                400,
                `Sản phẩm "${product.name}" đã ngừng kinh doanh. Vui lòng xóa khỏi giỏ hàng`
            );
        }

        // Kiểm tra tồn kho thực tế
        const stockInfo = await getEffectiveStock(product._id);
        if (item.quantity > stockInfo.effectiveStock) {
            throw createError(
                400,
                `Sản phẩm "${product.name}" chỉ còn ${stockInfo.effectiveStock} ${product.unit} trong kho (bạn đặt ${item.quantity})`
            );
        }

        const subtotal = product.price * item.quantity;
        totalPrice += subtotal;

        // Snapshot sản phẩm vào đơn hàng (giữ giá tại thời điểm mua)
        orderProducts.push({
            productId: product._id,
            name: product.name,
            price: product.price,
            unit: product.unit,
            quantity: item.quantity,
            subtotal,
        });
    }

    // ── 4. Tạo đơn hàng ──────────────────────────────────────────
    const order = await Order.create({
        userId,
        products: orderProducts,
        totalPrice,
        shippingAddress,
        paymentMethod: 'COD',
        status: 'Pending',
        note: note || '',
    });

    // ── 5. Trừ kho theo FIFO — Rollback nếu lỗi ─────────────────
    const allDeductions = [];
    try {
        for (const item of orderProducts) {
            const deductions = await deductStockFIFO(item.productId, item.quantity);
            allDeductions.push({ productId: item.productId, deductions });
        }
    } catch (err) {
        // Rollback: hoàn kho cho các sản phẩm đã trừ thành công
        for (const record of allDeductions) {
            const totalDeducted = record.deductions.reduce((sum, d) => sum + d.deducted, 0);
            if (totalDeducted > 0) {
                await restoreStock(record.productId, totalDeducted);
            }
        }
        // Xóa đơn hàng vừa tạo
        await Order.findByIdAndDelete(order._id);
        throw err; // Re-throw lỗi gốc
    }

    // ── 6. Xóa giỏ hàng sau khi đặt hàng thành công ─────────────
    cart.products = [];
    await cart.save();

    // Populate và trả về đơn hàng
    const populatedOrder = await Order.findById(order._id).populate('userId', 'name email');
    return populatedOrder;
};

/**
 * Lấy danh sách đơn hàng của user.
 * @param {string} userId
 * @param {object} query - { page, limit, status }
 */
const getMyOrders = async (userId, query = {}) => {
    const { page = 1, limit = 10, status } = query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    // Xây filter
    const filter = { userId };
    if (status && ['Pending', 'Processing', 'Shipping', 'Delivered', 'Cancelled'].includes(status)) {
        filter.status = status;
    }

    const [orders, total] = await Promise.all([
        Order.find(filter)
            .sort({ createdAt: -1 }) // Đơn mới nhất lên trước
            .skip(skip)
            .limit(limitNum),
        Order.countDocuments(filter),
    ]);

    return {
        orders,
        pagination: {
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum),
        },
    };
};

/**
 * Lấy chi tiết 1 đơn hàng.
 * User chỉ xem được đơn của mình, Admin xem được tất cả.
 *
 * @param {string} orderId
 * @param {string} userId
 * @param {string} role - 'admin' hoặc 'user'
 */
const getOrderById = async (orderId, userId, role = 'user') => {
    const order = await Order.findById(orderId).populate('userId', 'name email');
    if (!order) throw createError(404, 'Không tìm thấy đơn hàng');

    // User thường chỉ xem được đơn của mình
    if (role !== 'admin' && order.userId._id.toString() !== userId.toString()) {
        throw createError(403, 'Bạn không có quyền xem đơn hàng này');
    }

    return order;
};

/**
 * Hủy đơn hàng — chỉ cho phép khi status = 'Pending'.
 * Tự động hoàn kho cho các sản phẩm trong đơn.
 *
 * @param {string} orderId
 * @param {string} userId
 */
const cancelOrder = async (orderId, userId) => {
    const order = await Order.findById(orderId);
    if (!order) throw createError(404, 'Không tìm thấy đơn hàng');

    // Chỉ chủ đơn mới được hủy
    if (order.userId.toString() !== userId.toString()) {
        throw createError(403, 'Bạn không có quyền hủy đơn hàng này');
    }

    // Chỉ hủy được đơn Pending
    if (order.status !== 'Pending') {
        throw createError(
            400,
            `Không thể hủy đơn hàng ở trạng thái "${order.status}". Chỉ đơn "Pending" mới được hủy`
        );
    }

    // Hoàn kho cho từng sản phẩm
    for (const item of order.products) {
        await restoreStock(item.productId, item.quantity);
    }

    // Cập nhật trạng thái
    order.status = 'Cancelled';
    await order.save();

    return order;
};

/**
 * Admin cập nhật trạng thái đơn hàng.
 * Workflow: Pending → Processing → Shipping → Delivered
 * Cancelled: chỉ từ Pending (bởi user) hoặc Processing (bởi admin).
 *
 * @param {string} orderId
 * @param {string} newStatus
 */
const updateOrderStatus = async (orderId, newStatus) => {
    const order = await Order.findById(orderId);
    if (!order) throw createError(404, 'Không tìm thấy đơn hàng');

    // Validate luồng trạng thái hợp lệ
    const validTransitions = {
        Pending: ['Processing', 'Cancelled'],
        Processing: ['Shipping', 'Cancelled'],
        Shipping: ['Delivered'],
        Delivered: [],    // Không thể chuyển tiếp
        Cancelled: [],    // Không thể chuyển tiếp
    };

    const allowed = validTransitions[order.status] || [];
    if (!allowed.includes(newStatus)) {
        throw createError(
            400,
            `Không thể chuyển trạng thái từ "${order.status}" sang "${newStatus}". Cho phép: [${allowed.join(', ')}]`
        );
    }

    // Nếu admin hủy đơn (từ Processing) → hoàn kho
    if (newStatus === 'Cancelled') {
        for (const item of order.products) {
            await restoreStock(item.productId, item.quantity);
        }
    }

    order.status = newStatus;
    await order.save();

    return order;
};

/**
 * Admin lấy tất cả đơn hàng (có filter, phân trang).
 * @param {object} query - { page, limit, status, sort }
 */
const getAllOrders = async (query = {}) => {
    const { page = 1, limit = 20, status } = query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    if (status && ['Pending', 'Processing', 'Shipping', 'Delivered', 'Cancelled'].includes(status)) {
        filter.status = status;
    }

    const [orders, total] = await Promise.all([
        Order.find(filter)
            .populate('userId', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum),
        Order.countDocuments(filter),
    ]);

    return {
        orders,
        pagination: {
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum),
        },
    };
};

module.exports = {
    createOrderCOD,
    getMyOrders,
    getOrderById,
    cancelOrder,
    updateOrderStatus,
    getAllOrders,
};
