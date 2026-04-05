const mongoose = require('mongoose');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Payment = require('../models/Payment');
const Cart = require('../models/Cart');
const Batch = require('../models/Batch');
const { getEffectiveStock } = require('./batchService');
const { syncInventory } = require('./inventoryService');
const { createPaymentUrl, verifyReturnUrl } = require('./vnpayService');
const { validateDiscount, incrementDiscountUsage } = require('./discountService');
const { sendOrderConfirmation } = require('./emailService');
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
 * Validate địa chỉ giao hàng — dùng chung.
 */
const validateShipping = (shippingAddress) => {
    if (!shippingAddress?.fullName || !shippingAddress?.phone || !shippingAddress?.address) {
        throw createError(400, 'Vui lòng cung cấp đầy đủ thông tin giao hàng (fullName, phone, address)');
    }
    if (!/^[0-9]{10,11}$/.test(shippingAddress.phone)) {
        throw createError(400, 'Số điện thoại không hợp lệ (10-11 chữ số)');
    }
};

/**
 * Validate giỏ hàng + build danh sách sản phẩm đặt hàng.
 */
const buildOrderProducts = async (userId) => {
    const cart = await Cart.findOne({ userId }).populate(
        'products.productId',
        'name price unit isActive'
    );

    if (!cart || cart.products.length === 0) {
        throw createError(400, 'Giỏ hàng trống. Vui lòng thêm sản phẩm trước khi đặt hàng');
    }

    const orderProducts = [];
    let totalPrice = 0;

    for (const item of cart.products) {
        const product = item.productId;
        if (!product) throw createError(400, 'Một sản phẩm trong giỏ đã bị xóa khỏi hệ thống');
        if (!product.isActive) {
            throw createError(400, `Sản phẩm "${product.name}" đã ngừng kinh doanh. Vui lòng xóa khỏi giỏ hàng`);
        }

        const stockInfo = await getEffectiveStock(product._id);
        if (item.quantity > stockInfo.effectiveStock) {
            throw createError(
                400,
                `Sản phẩm "${product.name}" chỉ còn ${stockInfo.effectiveStock} ${product.unit} (bạn đặt ${item.quantity})`
            );
        }

        const subtotal = product.price * item.quantity;
        totalPrice += subtotal;

        orderProducts.push({
            productId: product._id,
            name: product.name,
            price: product.price,
            unit: product.unit,
            quantity: item.quantity,
            subtotal,
        });
    }

    return { orderProducts, totalPrice, cart };
};

/**
 * Tạo đơn hàng COD.
 * Flow: Validate → Check tồn kho → [Discount] → Tạo Order →
 *       Tạo OrderItems + Payment → Trừ kho FIFO → Xóa giỏ → Email
 *
 * @param {string} userId
 * @param {object} shippingAddress - { fullName, phone, address }
 * @param {string} note
 * @param {string} discountCode - Mã giảm giá (tùy chọn)
 */
const createOrderCOD = async (userId, shippingAddress, note = '', discountCode = '') => {
    validateShipping(shippingAddress);

    const { orderProducts, totalPrice, cart } = await buildOrderProducts(userId);

    // Áp dụng mã giảm giá (nếu có)
    let discountAmount = 0;
    let finalPrice = totalPrice;
    let appliedDiscountCode = '';

    if (discountCode && discountCode.trim()) {
        const discResult = await validateDiscount(discountCode.trim(), totalPrice);
        discountAmount = discResult.discountAmount;
        finalPrice = discResult.finalPrice;
        appliedDiscountCode = discResult.discount.code;
    }

    // Tạo đơn hàng (chưa có OrderItems, chưa trừ kho)
    const order = await Order.create({
        userId,
        totalPrice,
        discountCode: appliedDiscountCode,
        discountAmount,
        finalPrice,
        shippingAddress,
        paymentMethod: 'COD',
        status: 'Pending',
        stockDeducted: false,
        note: note || '',
    });

    // Tạo OrderItems (bulk insert) + Payment (COD → cod_pending)
    await OrderItem.insertMany(orderProducts.map((p) => ({ orderId: order._id, ...p })));
    await Payment.create({ orderId: order._id, method: 'COD', amount: finalPrice, status: 'cod_pending' });

    // Trừ kho theo FIFO — Rollback toàn bộ nếu lỗi
    const allDeductions = [];
    try {
        for (const item of orderProducts) {
            const deductions = await deductStockFIFO(item.productId, item.quantity);
            allDeductions.push({ productId: item.productId, deductions });
        }
    } catch (err) {
        for (const record of allDeductions) {
            const td = record.deductions.reduce((s, d) => s + d.deducted, 0);
            if (td > 0) await restoreStock(record.productId, td);
        }
        await OrderItem.deleteMany({ orderId: order._id });
        await Payment.findOneAndDelete({ orderId: order._id });
        await Order.findByIdAndDelete(order._id);
        throw err;
    }

    // Đánh dấu kho đã trừ + đồng bộ Inventory
    order.stockDeducted = true;
    await order.save();
    for (const item of orderProducts) await syncInventory(item.productId);

    // Tăng usedCount nếu có mã giảm giá
    if (appliedDiscountCode) await incrementDiscountUsage(appliedDiscountCode);

    // Xóa giỏ hàng
    cart.products = [];
    await cart.save();

    // Gửi email xác nhận (không block flow nếu lỗi)
    try {
        const user = await mongoose.model('User').findById(userId).select('email name');
        if (user?.email) {
            await sendOrderConfirmation(user.email, {
                orderId: order._id.toString().slice(-8).toUpperCase(),
                customerName: user.name || shippingAddress.fullName,
                items: orderProducts.map((p) => ({ name: p.name, quantity: p.quantity, price: p.price, unit: p.unit })),
                totalAmount: finalPrice,
                orderDate: new Date().toLocaleDateString('vi-VN'),
            });
        }
    } catch (emailErr) {
        console.warn('[ORDER] Gửi email xác nhận thất bại:', emailErr.message);
    }

    return await Order.findById(order._id)
        .populate('userId', 'name email')
        .populate({ path: 'items' })
        .populate({ path: 'payment' });
};

/**
 * Tạo đơn hàng VNPay.
 * Flow: Validate → Check tồn kho → [Discount] → Tạo Order (Pending) →
 *       Tạo OrderItems + Payment → Tạo URL VNPay
 * LƯU Ý: CHƯA trừ kho — chỉ trừ khi IPN xác nhận thanh toán thành công.
 *
 * @param {string} userId
 * @param {object} shippingAddress
 * @param {string} ipAddr - IP client (bắt buộc bởi VNPay)
 * @param {string} bankCode - Mã ngân hàng (tùy chọn)
 * @param {string} note
 * @param {string} discountCode - Mã giảm giá (tùy chọn)
 */
const createOrderVNPay = async (userId, shippingAddress, ipAddr, bankCode = '', note = '', discountCode = '') => {
    validateShipping(shippingAddress);

    const { orderProducts, totalPrice } = await buildOrderProducts(userId);

    // Áp dụng mã giảm giá (nếu có)
    let discountAmount = 0;
    let finalPrice = totalPrice;
    let appliedDiscountCode = '';

    if (discountCode && discountCode.trim()) {
        const discResult = await validateDiscount(discountCode.trim(), totalPrice);
        discountAmount = discResult.discountAmount;
        finalPrice = discResult.finalPrice;
        appliedDiscountCode = discResult.discount.code;
    }

    // Tạo đơn hàng (Pending — chưa thanh toán, chưa trừ kho)
    const order = await Order.create({
        userId,
        totalPrice,
        discountCode: appliedDiscountCode,
        discountAmount,
        finalPrice,
        shippingAddress,
        paymentMethod: 'VNPay',
        status: 'Pending',
        stockDeducted: false,
        note: note || '',
    });

    // Tạo OrderItems + Payment (VNPay → pending)
    await OrderItem.insertMany(orderProducts.map((p) => ({ orderId: order._id, ...p })));
    await Payment.create({ orderId: order._id, method: 'VNPay', amount: finalPrice, status: 'pending' });

    // Tạo URL thanh toán VNPay (dùng finalPrice trực tiếp từ order)
    const paymentUrl = createPaymentUrl(order, ipAddr, bankCode);

    return { order, paymentUrl };
};

/**
 * Xử lý IPN (Instant Payment Notification) từ VNPay.
 * Server-to-server — phải trả {RspCode, Message}.
 * Chỉ trừ kho sau khi VNPay xác nhận thành công, không trừ kho khi chỉ redirect.
 */
const handleVnpayIPN = async (vnpParams) => {
    const result = verifyReturnUrl(vnpParams);
    if (!result.isValid) return { RspCode: '97', Message: 'Invalid checksum' };

    const order = await Order.findById(result.txnRef);
    if (!order) return { RspCode: '01', Message: 'Order not found' };

    // Kiểm tra số tiền khớp với finalPrice (sau discount)
    if (result.amount !== order.finalPrice) return { RspCode: '04', Message: 'Invalid amount' };

    // Không xử lý 2 lần
    if (order.status !== 'Pending') return { RspCode: '02', Message: 'Order already processed' };

    const payment = await Payment.findOne({ orderId: order._id });

    if (result.responseCode === '00') {
        // ── Thanh toán THÀNH CÔNG ──────────────────────────────
        const orderItems = await OrderItem.find({ orderId: order._id });

        const allDeductions = [];
        try {
            for (const item of orderItems) {
                const deductions = await deductStockFIFO(item.productId, item.quantity);
                allDeductions.push({ productId: item.productId, deductions });
            }
        } catch (err) {
            for (const record of allDeductions) {
                const td = record.deductions.reduce((s, d) => s + d.deducted, 0);
                if (td > 0) await restoreStock(record.productId, td);
            }
            console.error('[VNPAY IPN] Trừ kho lỗi:', err.message);
            return { RspCode: '99', Message: 'Stock deduction failed' };
        }

        // Đồng bộ Inventory
        for (const item of orderItems) await syncInventory(item.productId);

        // Cập nhật Order
        order.status = 'Paid';
        order.stockDeducted = true;
        await order.save();

        // Cập nhật Payment
        if (payment) {
            payment.status = 'success';
            payment.transactionNo = result.transactionNo || '';
            payment.bankCode = result.bankCode || '';
            payment.responseCode = result.responseCode || '';
            payment.rawResponse = vnpParams;
            payment.paidAt = new Date();
            await payment.save();
        }

        // Tăng discount usage
        if (order.discountCode) await incrementDiscountUsage(order.discountCode);

        // Xóa giỏ hàng
        await Cart.findOneAndUpdate({ userId: order.userId }, { products: [] });

        // Gửi email xác nhận
        try {
            const user = await mongoose.model('User').findById(order.userId).select('email name');
            if (user?.email) {
                await sendOrderConfirmation(user.email, {
                    orderId: order._id.toString().slice(-8).toUpperCase(),
                    customerName: user.name,
                    items: orderItems.map((p) => ({ name: p.name, quantity: p.quantity, price: p.price, unit: p.unit })),
                    totalAmount: order.finalPrice,
                    orderDate: new Date().toLocaleDateString('vi-VN'),
                });
            }
        } catch (emailErr) {
            console.warn('[VNPAY IPN] Gửi email xác nhận thất bại:', emailErr.message);
        }

        return { RspCode: '00', Message: 'success' };
    } else {
        // ── Thanh toán THẤT BẠI — hủy đơn (kho chưa bị trừ → không cần hoàn) ──
        order.status = 'Cancelled';
        await order.save();

        if (payment) {
            payment.status = 'failed';
            payment.responseCode = result.responseCode || '';
            payment.rawResponse = vnpParams;
            await payment.save();
        }

        return { RspCode: '00', Message: 'success' };
    }
};

/**
 * Xử lý Return URL — User redirect về sau khi thanh toán.
 */
const handleVnpayReturn = async (vnpParams) => {
    const result = verifyReturnUrl(vnpParams);

    if (!result.isValid) {
        throw createError(400, 'Chữ ký không hợp lệ. Kết quả thanh toán có thể bị giả mạo');
    }

    const order = await Order.findById(result.txnRef)
        .populate('userId', 'name email')
        .populate({ path: 'items' })
        .populate({ path: 'payment' });

    if (!order) throw createError(404, 'Không tìm thấy đơn hàng');

    return {
        success: result.responseCode === '00',
        order,
        transactionNo: result.transactionNo,
        bankCode: result.bankCode,
        payDate: result.payDate,
    };
};

/**
 * Lấy danh sách đơn hàng của user (kèm payment summary).
 */
const getMyOrders = async (userId, query = {}) => {
    const { page = 1, limit = 10, status } = query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const filter = { userId };
    if (status && ['Pending', 'Paid', 'Processing', 'Shipping', 'Delivered', 'Cancelled'].includes(status)) {
        filter.status = status;
    }

    const [orders, total] = await Promise.all([
        Order.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .populate({ path: 'items' })
            .populate({ path: 'payment', select: 'status method paidAt transactionNo' }),
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
 * Lấy chi tiết 1 đơn hàng (kèm items và payment).
 * User chỉ xem được đơn của mình, Admin xem được tất cả.
 */
const getOrderById = async (orderId, userId, role = 'user') => {
    const order = await Order.findById(orderId)
        .populate('userId', 'name email')
        .populate({ path: 'items' })
        .populate({ path: 'payment' });

    if (!order) throw createError(404, 'Không tìm thấy đơn hàng');

    if (role !== 'admin' && order.userId._id.toString() !== userId.toString()) {
        throw createError(403, 'Bạn không có quyền xem đơn hàng này');
    }

    return order;
};

/**
 * User hủy đơn hàng — chỉ cho phép khi status = 'Pending'.
 * Chỉ hoàn kho nếu kho đã bị trừ (stockDeducted = true).
 * - COD Pending:    stockDeducted = true  → cần hoàn kho
 * - VNPay Pending:  stockDeducted = false → KHÔNG hoàn kho
 */
const cancelOrder = async (orderId, userId) => {
    const order = await Order.findById(orderId);
    if (!order) throw createError(404, 'Không tìm thấy đơn hàng');

    if (order.userId.toString() !== userId.toString()) {
        throw createError(403, 'Bạn không có quyền hủy đơn hàng này');
    }

    if (order.status !== 'Pending') {
        throw createError(
            400,
            `Không thể hủy đơn hàng ở trạng thái "${order.status}". Chỉ đơn "Pending" mới được hủy`
        );
    }

    // Chỉ hoàn kho nếu thực sự đã trừ (COD = true; VNPay chưa thanh toán = false)
    if (order.stockDeducted) {
        const orderItems = await OrderItem.find({ orderId: order._id });
        for (const item of orderItems) {
            await restoreStock(item.productId, item.quantity);
            await syncInventory(item.productId);
        }
    }

    // Cập nhật Payment thành failed
    await Payment.findOneAndUpdate({ orderId: order._id }, { $set: { status: 'failed' } });

    order.status = 'Cancelled';
    await order.save();

    return await Order.findById(order._id)
        .populate('userId', 'name email')
        .populate({ path: 'items' })
        .populate({ path: 'payment' });
};

/**
 * Admin cập nhật trạng thái đơn hàng.
 * Workflow: Pending → Processing → Shipping → Delivered
 * Cancelled: chỉ từ Pending (bởi user) hoặc Processing (bởi admin).
 *
 * @param {string} orderId
 * @param {string} newStatus
 */
/**
 * Admin cập nhật trạng thái đơn hàng.
 * Workflow: Pending → Processing → Shipping → Delivered
 * Chỉ hoàn kho nếu đơn đã tồn tại stockDeducted = true.
 */
const updateOrderStatus = async (orderId, newStatus) => {
    const order = await Order.findById(orderId);
    if (!order) throw createError(404, 'Không tìm thấy đơn hàng');

    const validTransitions = {
        Pending: ['Processing', 'Cancelled'],
        Paid: ['Processing', 'Cancelled'],
        Processing: ['Shipping', 'Cancelled'],
        Shipping: ['Delivered'],
        Delivered: [],
        Cancelled: [],
    };

    const allowed = validTransitions[order.status] || [];
    if (!allowed.includes(newStatus)) {
        throw createError(
            400,
            `Không thể chuyển trạng thái từ "${order.status}" sang "${newStatus}". Cho phép: [${allowed.join(', ')}]`
        );
    }

    // Nếu hủy đơn và kho đã trừ → hoàn kho
    if (newStatus === 'Cancelled' && order.stockDeducted) {
        const orderItems = await OrderItem.find({ orderId: order._id });
        for (const item of orderItems) {
            await restoreStock(item.productId, item.quantity);
            await syncInventory(item.productId);
        }
        await Payment.findOneAndUpdate({ orderId: order._id }, { $set: { status: 'failed' } });
    }

    // COD Delivered → đánh dấu Payment is cod_collected
    if (newStatus === 'Delivered' && order.paymentMethod === 'COD') {
        await Payment.findOneAndUpdate(
            { orderId: order._id },
            { $set: { status: 'cod_collected', paidAt: new Date() } }
        );
    }

    order.status = newStatus;
    await order.save();

    return await Order.findById(order._id)
        .populate('userId', 'name email')
        .populate({ path: 'items' })
        .populate({ path: 'payment' });
};

/**
 * Admin lấy tất cả đơn hàng (có filter, phân trang).
 */
const getAllOrders = async (query = {}) => {
    const { page = 1, limit = 20, status } = query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    if (status && ['Pending', 'Paid', 'Processing', 'Shipping', 'Delivered', 'Cancelled'].includes(status)) {
        filter.status = status;
    }

    const [orders, total] = await Promise.all([
        Order.find(filter)
            .populate('userId', 'name email')
            .populate({ path: 'items' })
            .populate({ path: 'payment', select: 'status method paidAt transactionNo amount' })
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
    createOrderVNPay,
    handleVnpayIPN,
    handleVnpayReturn,
    getMyOrders,
    getOrderById,
    cancelOrder,
    updateOrderStatus,
    getAllOrders,
};
