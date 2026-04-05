const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { getEffectiveStock } = require('./batchService');
const { createError } = require('../utils/responseHelper');

/**
 * ── Cart Service ─────────────────────────────────────────────────
 * Logic nghiệp vụ cho Giỏ hàng. Mọi thao tác đều validate tồn kho
 * thông qua getEffectiveStock() từ batchService (Thành viên 3).
 */

/**
 * Lấy giỏ hàng của user hiện tại.
 * Populate thông tin sản phẩm + tính tồn kho thực tế cho từng item.
 * @param {string} userId
 * @returns {{ cart: object, totalPrice: number }}
 */
const getCart = async (userId) => {
    // Tìm hoặc tạo giỏ rỗng nếu chưa có
    let cart = await Cart.findOne({ userId }).populate(
        'products.productId',
        'name price unit images'
    );

    if (!cart) {
        cart = await Cart.create({ userId, products: [] });
        cart = await Cart.findOne({ userId }).populate(
            'products.productId',
            'name price unit images'
        );
    }

    // Tính tổng tiền + gắn thông tin tồn kho cho từng item
    let totalPrice = 0;
    const productsWithStock = [];

    for (const item of cart.products) {
        // Bỏ qua sản phẩm đã bị xóa khỏi DB
        if (!item.productId) continue;

        // Lấy tồn kho thực tế từ batchService
        const stockInfo = await getEffectiveStock(item.productId._id);
        const subtotal = item.productId.price * item.quantity;
        totalPrice += subtotal;

        productsWithStock.push({
            productId: item.productId,
            quantity: item.quantity,
            subtotal,
            effectiveStock: stockInfo.effectiveStock,
        });
    }

    return {
        _id: cart._id,
        userId: cart.userId,
        products: productsWithStock,
        totalPrice,
        totalItems: productsWithStock.length,
    };
};

/**
 * Thêm sản phẩm vào giỏ hàng.
 * Nếu sản phẩm đã có → tăng số lượng. Validate tồn kho trước khi thêm.
 * @param {string} userId
 * @param {string} productId
 * @param {number} quantity - Số lượng muốn thêm (mặc định 1)
 */
const addToCart = async (userId, productId, quantity = 1) => {
    // Validate input
    if (!productId) throw createError(400, 'ProductId không được để trống');

    const qty = Number(quantity);
    if (isNaN(qty) || qty < 1) {
        throw createError(400, 'Số lượng phải là số nguyên lớn hơn 0');
    }

    // Kiểm tra sản phẩm tồn tại và đang hoạt động
    const product = await Product.findById(productId);
    if (!product) throw createError(404, 'Sản phẩm không tồn tại');
    if (!product.isActive) throw createError(400, 'Sản phẩm đã ngừng kinh doanh');

    // Kiểm tra tồn kho thực tế
    const stockInfo = await getEffectiveStock(productId);

    // Tìm hoặc tạo giỏ hàng
    let cart = await Cart.findOne({ userId });
    if (!cart) {
        cart = await Cart.create({ userId, products: [] });
    }

    // Kiểm tra sản phẩm đã có trong giỏ chưa
    const existingIndex = cart.products.findIndex(
        (item) => item.productId.toString() === productId
    );

    if (existingIndex > -1) {
        // Đã có → tăng số lượng, validate tổng không vượt tồn kho
        const newQty = cart.products[existingIndex].quantity + qty;
        if (newQty > stockInfo.effectiveStock) {
            throw createError(
                400,
                `Tồn kho không đủ. Hiện có ${stockInfo.effectiveStock} ${product.unit}, trong giỏ đã có ${cart.products[existingIndex].quantity}`
            );
        }
        cart.products[existingIndex].quantity = newQty;
    } else {
        // Chưa có → thêm mới, validate số lượng không vượt tồn kho
        if (qty > stockInfo.effectiveStock) {
            throw createError(
                400,
                `Tồn kho không đủ. Hiện chỉ còn ${stockInfo.effectiveStock} ${product.unit}`
            );
        }
        cart.products.push({ productId, quantity: qty });
    }

    await cart.save();

    // Trả về giỏ hàng đã populate
    return getCart(userId);
};

/**
 * Cập nhật số lượng sản phẩm trong giỏ hàng.
 * @param {string} userId
 * @param {string} productId
 * @param {number} quantity - Số lượng mới (tuyệt đối, không phải delta)
 */
const updateCartItem = async (userId, productId, quantity) => {
    const qty = Number(quantity);
    if (isNaN(qty) || qty < 1) {
        throw createError(400, 'Số lượng phải là số nguyên lớn hơn 0');
    }

    // Kiểm tra giỏ hàng tồn tại
    const cart = await Cart.findOne({ userId });
    if (!cart) throw createError(404, 'Giỏ hàng không tồn tại');

    // Tìm sản phẩm trong giỏ
    const itemIndex = cart.products.findIndex(
        (item) => item.productId.toString() === productId
    );
    if (itemIndex === -1) {
        throw createError(404, 'Sản phẩm không có trong giỏ hàng');
    }

    // Kiểm tra sản phẩm vẫn đang active
    const product = await Product.findById(productId);
    if (!product) throw createError(404, 'Sản phẩm không tồn tại trong hệ thống');

    // Validate tồn kho
    const stockInfo = await getEffectiveStock(productId);
    if (qty > stockInfo.effectiveStock) {
        throw createError(
            400,
            `Tồn kho không đủ. Hiện chỉ còn ${stockInfo.effectiveStock} ${product.unit}`
        );
    }

    // Cập nhật số lượng
    cart.products[itemIndex].quantity = qty;
    await cart.save();

    return getCart(userId);
};

/**
 * Xóa 1 sản phẩm khỏi giỏ hàng.
 * @param {string} userId
 * @param {string} productId
 */
const removeCartItem = async (userId, productId) => {
    const cart = await Cart.findOne({ userId });
    if (!cart) throw createError(404, 'Giỏ hàng không tồn tại');

    const itemIndex = cart.products.findIndex(
        (item) => item.productId.toString() === productId
    );
    if (itemIndex === -1) {
        throw createError(404, 'Sản phẩm không có trong giỏ hàng');
    }

    // Xóa sản phẩm khỏi mảng
    cart.products.splice(itemIndex, 1);
    await cart.save();

    return getCart(userId);
};

/**
 * Xóa toàn bộ giỏ hàng (dùng sau khi đặt hàng thành công).
 * @param {string} userId
 */
const clearCart = async (userId) => {
    const cart = await Cart.findOne({ userId });
    if (!cart) throw createError(404, 'Giỏ hàng không tồn tại');

    cart.products = [];
    await cart.save();

    return { message: 'Đã xóa toàn bộ giỏ hàng' };
};

module.exports = {
    getCart,
    addToCart,
    updateCartItem,
    removeCartItem,
    clearCart,
};
