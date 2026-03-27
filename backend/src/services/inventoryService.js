const mongoose = require('mongoose');
const Batch = require('../models/Batch');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');

/**
 * ── Inventory Service ───────────────────────────────────────────
 * Logic nghiệp vụ cho cảnh báo tồn kho (Inventory Alerts).
 */

/**
 * Lấy danh sách cảnh báo kho hàng.
 * Trả về 2 loại cảnh báo:
 *   1. Lô hàng ĐÃ HẾT HẠN (expiryDate <= now) nhưng vẫn còn hàng
 *   2. Lô hàng SẮP HẾT HẠN (expiryDate trong vòng N ngày tới)
 *
 * @param {number} warningDays - Số ngày cảnh báo trước (mặc định 3)
 * @returns {{ expiredBatches: Array, expiringBatches: Array, summary: object }}
 */
const getInventoryAlerts = async (warningDays = 3) => {
    const now = new Date();
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + Number(warningDays));

    // ── 1. Lô hàng ĐÃ HẾT HẠN (còn hàng nhưng hết hạn) ────────
    const expiredBatches = await Batch.find({
        expiryDate: { $lte: now },
        quantity: { $gt: 0 }, // Chỉ lấy lô còn hàng (chưa xuất hết)
    })
        .populate('product', 'name price unit category')
        .sort({ expiryDate: 1 });

    // ── 2. Lô hàng SẮP HẾT HẠN (còn hạn nhưng ≤ N ngày) ──────
    const expiringBatches = await Batch.find({
        expiryDate: {
            $gt: now,        // Chưa hết hạn
            $lte: warningDate, // Nhưng sẽ hết trong N ngày
        },
        quantity: { $gt: 0 },
    })
        .populate('product', 'name price unit category')
        .sort({ expiryDate: 1 });

    // ── 3. Sản phẩm HẾT HÀNG (tồn kho thực tế = 0) ────────────
    // Aggregate: tìm sản phẩm KHÔNG CÓ lô nào còn hạn và còn hàng
    const productsWithStock = await Batch.aggregate([
        {
            $match: {
                expiryDate: { $gt: now },
                quantity: { $gt: 0 },
            },
        },
        {
            $group: {
                _id: '$product',
            },
        },
    ]);

    // Lấy danh sách ID sản phẩm có tồn kho
    const productIdsWithStock = productsWithStock.map((p) => p._id);

    // Tìm sản phẩm active nhưng KHÔNG có tồn kho
    const outOfStockProducts = await Product.find({
        isActive: true,
        _id: { $nin: productIdsWithStock },
    })
        .populate('category', 'name')
        .sort({ name: 1 });

    // ── 4. Tổng kết ─────────────────────────────────────────────
    const summary = {
        totalExpiredBatches: expiredBatches.length,
        totalExpiringBatches: expiringBatches.length,
        totalOutOfStockProducts: outOfStockProducts.length,
        totalAlerts: expiredBatches.length + expiringBatches.length + outOfStockProducts.length,
    };

    return {
        expiredBatches,
        expiringBatches,
        outOfStockProducts,
        summary,
    };
};

/**
 * Đồng bộ số lượng tồn kho thực tế cho 1 sản phẩm vào collection Inventory.
 * Được gọi sau khi tạo / cập nhật / xóa Batch.
 *
 * Logic: Tính tổng quantity của các lô còn hạn + còn hàng,
 * sau đó upsert vào Inventory (tạo mới nếu chưa có, cập nhật nếu đã có).
 *
 * @param {string|ObjectId} productId
 * @returns {object} Inventory document đã cập nhật
 */
const syncInventory = async (productId) => {
    const now = new Date();

    // Tính tổng tồn kho thực tế từ Batch
    const result = await Batch.aggregate([
        {
            $match: {
                product: new mongoose.Types.ObjectId(productId),
                expiryDate: { $gt: now },
                quantity: { $gt: 0 },
            },
        },
        {
            $group: {
                _id: '$product',
                totalQuantity: { $sum: '$quantity' },
            },
        },
    ]);

    const quantity = result.length > 0 ? result[0].totalQuantity : 0;

    // Upsert: tạo mới hoặc cập nhật document Inventory cho sản phẩm này
    const inventory = await Inventory.findOneAndUpdate(
        { product: productId },
        {
            $set: {
                quantity,
                lastSynced: new Date(),
            },
        },
        { upsert: true, new: true }
    );

    return inventory;
};

module.exports = { getInventoryAlerts, syncInventory };
