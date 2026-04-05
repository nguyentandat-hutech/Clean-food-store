const cron = require('node-cron');
const mongoose = require('mongoose');
const Batch = require('../models/Batch');
const Product = require('../models/Product');
const { syncInventory } = require('../services/inventoryService');

/**
 * ── CRON JOB: Kiểm tra hạn sử dụng lô hàng ────────────────────
 * Chạy tự động lúc 00:00 mỗi ngày.
 *
 * Logic:
 * 1. Duyệt tất cả lô hàng có expiryDate <= hiện tại → đánh dấu status = 'expired'
 * 2. Với mỗi sản phẩm:
 *    - Nếu tổng tồn kho còn hạn = 0 → status = 'Ngừng kinh doanh'
 *    - Nếu có lô sắp hết hạn (≤ 3 ngày) → status = 'Khuyến mãi'
 *    - Còn lại → status = 'Đang bán'
 */

/**
 * Hàm xử lý chính — được gọi bởi cron scheduler.
 * Tách riêng để có thể gọi thủ công khi cần test.
 */
const runExpiryCheck = async () => {
    const startTime = Date.now();
    console.log('🔄 [CRON] Bắt đầu quét hạn sử dụng lô hàng...');

    try {
        const now = new Date();

        // ── Bước 1: Đánh dấu tất cả lô hết hạn ────────────────
        const expiredResult = await Batch.updateMany(
            {
                expiryDate: { $lte: now },
                status: 'active', // Chỉ cập nhật lô chưa bị đánh dấu
            },
            {
                $set: { status: 'expired' },
            }
        );
        console.log(`   ⛔ Đã đánh dấu ${expiredResult.modifiedCount} lô hàng hết hạn`);

        // ── Bước 2: Lấy tất cả sản phẩm đang active ────────────
        const products = await Product.find({ isActive: true });

        // ── Bước 3: Tính ngày giới hạn "sắp hết hạn" (3 ngày tới)
        const warningDate = new Date();
        warningDate.setDate(warningDate.getDate() + 3);

        let countNgungKinhDoanh = 0;
        let countKhuyenMai = 0;
        let countDangBan = 0;

        // ── Bước 4: Duyệt từng sản phẩm, cập nhật status ──────
        for (const product of products) {
            const productId = product._id;

            // Tính tổng tồn kho thực tế (chỉ lô còn hạn + còn hàng)
            const stockResult = await Batch.aggregate([
                {
                    $match: {
                        product: new mongoose.Types.ObjectId(productId),
                        expiryDate: { $gt: now },
                        status: 'active',
                        quantity: { $gt: 0 },
                    },
                },
                {
                    $group: {
                        _id: null,
                        totalStock: { $sum: '$quantity' },
                    },
                },
            ]);

            const effectiveStock = stockResult.length > 0 ? stockResult[0].totalStock : 0;

            // Kiểm tra có lô sắp hết hạn (còn hạn nhưng ≤ 3 ngày nữa)
            const expiringCount = await Batch.countDocuments({
                product: productId,
                expiryDate: { $gt: now, $lte: warningDate },
                status: 'active',
                quantity: { $gt: 0 },
            });

            // Quyết định status mới cho sản phẩm
            let newStatus;

            if (effectiveStock === 0) {
                // Không còn tồn kho → Ngừng kinh doanh
                newStatus = 'Ngừng kinh doanh';
                countNgungKinhDoanh++;
            } else if (expiringCount > 0) {
                // Có lô sắp hết hạn → Khuyến mãi (để đẩy hàng)
                newStatus = 'Khuyến mãi';
                countKhuyenMai++;
            } else {
                // Bình thường → Đang bán
                newStatus = 'Đang bán';
                countDangBan++;
            }

            // Chỉ cập nhật nếu status thay đổi (tránh ghi DB không cần thiết)
            if (product.status !== newStatus) {
                await Product.findByIdAndUpdate(productId, { status: newStatus });
            }

            // Đồng bộ Inventory cho sản phẩm này (batch có thể vừa hết hạn)
            await syncInventory(productId);
        }

        const duration = Date.now() - startTime;
        console.log(`✅ [CRON] Hoàn tất quét hạn sử dụng (${duration}ms)`);
        console.log(`   📊 Kết quả: ${countDangBan} Đang bán | ${countKhuyenMai} Khuyến mãi | ${countNgungKinhDoanh} Ngừng kinh doanh`);

    } catch (error) {
        console.error('❌ [CRON] Lỗi khi quét hạn sử dụng:', error.message);
        console.error(error.stack);
    }
};

/**
 * Khởi động Cron Job.
 * Schedule: '0 0 * * *' = 00:00 mỗi ngày (giờ server).
 * Gọi hàm này trong server.js sau khi kết nối DB thành công.
 */
const startExpiryChecker = () => {
    // Chạy mỗi ngày lúc 00:00
    cron.schedule('0 0 * * *', () => {
        console.log(`\n⏰ [CRON] Trigger lúc ${new Date().toLocaleString('vi-VN')}`);
        runExpiryCheck();
    }, {
        timezone: 'Asia/Ho_Chi_Minh', // Múi giờ Việt Nam
    });

    console.log('📅 [CRON] Đã đăng ký job kiểm tra hạn sử dụng (chạy 00:00 mỗi ngày)');

    // Chạy ngay khi khởi động server để cập nhật trạng thái lần đầu
    console.log('🚀 [CRON] Chạy quét lần đầu khi khởi động...');
    runExpiryCheck();
};

module.exports = { startExpiryChecker, runExpiryCheck };
