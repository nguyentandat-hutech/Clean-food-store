// ============================================================
// Stats Service — Thống kê doanh thu, sản phẩm bán chạy, sắp hết hạn
// Sử dụng MongoDB Aggregation Pipeline — không dùng dữ liệu ảo
// ============================================================

const mongoose = require('mongoose');
const Order = require('../models/Order');
const Batch = require('../models/Batch');
const { createError } = require('../utils/responseHelper');

/**
 * Thống kê doanh thu từ các đơn hàng đã giao thành công (Delivered).
 * Nhóm theo tháng hoặc ngày tùy theo period.
 *
 * @param {string} period - 'monthly' hoặc 'daily'
 * @returns {Promise<Array<{ _id: string, totalRevenue: number, orderCount: number }>>}
 */
const getRevenue = async (period = 'monthly') => {
    // Xác định format nhóm theo period
    let dateGroupExpression;
    if (period === 'daily') {
        dateGroupExpression = {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
        };
    } else {
        // Mặc định: monthly
        dateGroupExpression = {
            $dateToString: { format: '%Y-%m', date: '$createdAt' },
        };
    }

    const pipeline = [
        // Chỉ lấy đơn hàng đã giao thành công
        { $match: { status: 'Delivered' } },
        // Nhóm theo period
        {
            $group: {
                _id: dateGroupExpression,
                totalRevenue: { $sum: '$totalPrice' },
                orderCount: { $sum: 1 },
            },
        },
        // Sắp xếp theo thời gian tăng dần
        { $sort: { _id: 1 } },
    ];

    const result = await Order.aggregate(pipeline);

    return result;
};

/**
 * Lấy top N sản phẩm bán chạy nhất (theo số lượng bán ra).
 * Tính từ các đơn hàng Delivered.
 *
 * @param {number} limit - Số lượng sản phẩm muốn lấy (mặc định 5)
 * @returns {Promise<Array<{ productId, productName, totalQuantity, totalRevenue }>>}
 */
const getTopSellers = async (limit = 5) => {
    const limitNum = Math.min(20, Math.max(1, parseInt(limit, 10) || 5));

    const pipeline = [
        // Chỉ lấy đơn hàng đã giao thành công
        { $match: { status: 'Delivered' } },
        // Tách mảng products thành từng document riêng
        { $unwind: '$products' },
        // Nhóm theo productId, tính tổng quantity và revenue
        {
            $group: {
                _id: '$products.productId',
                productName: { $first: '$products.name' },
                totalQuantity: { $sum: '$products.quantity' },
                totalRevenue: { $sum: '$products.subtotal' },
            },
        },
        // Sắp xếp theo số lượng bán ra giảm dần
        { $sort: { totalQuantity: -1 } },
        // Giới hạn số lượng kết quả
        { $limit: limitNum },
        // Lookup thông tin sản phẩm hiện tại (ảnh, đơn vị)
        {
            $lookup: {
                from: 'products',
                localField: '_id',
                foreignField: '_id',
                as: 'productInfo',
            },
        },
        {
            $project: {
                _id: 1,
                productName: 1,
                totalQuantity: 1,
                totalRevenue: 1,
                unit: { $arrayElemAt: ['$productInfo.unit', 0] },
                images: { $arrayElemAt: ['$productInfo.images', 0] },
            },
        },
    ];

    const result = await Order.aggregate(pipeline);

    return result;
};

/**
 * Thống kê số lượng lô hàng sắp hết hạn trong N ngày tới.
 * Chỉ tính lô hàng đang active (chưa hết hạn, còn tồn kho).
 *
 * @param {number} days - Số ngày cảnh báo (mặc định 7)
 * @returns {Promise<{ totalBatches: number, batches: Array }>}
 */
const getExpiringSoon = async (days = 7) => {
    const daysNum = Math.max(1, parseInt(days, 10) || 7);

    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysNum);

    const batches = await Batch.find({
        status: 'active',
        quantity: { $gt: 0 },
        expiryDate: {
            $gte: now,          // Chưa hết hạn
            $lte: futureDate,   // Nhưng sẽ hết hạn trong N ngày
        },
    })
        .populate('product', 'name unit images')
        .sort({ expiryDate: 1 })
        .lean();

    return {
        totalBatches: batches.length,
        days: daysNum,
        batches,
    };
};

module.exports = {
    getRevenue,
    getTopSellers,
    getExpiringSoon,
};
