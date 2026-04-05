const mongoose = require('mongoose');

/**
 * ── Schema Tồn kho (Inventory) ──────────────────────────────────
 * Mỗi sản phẩm có đúng MỘT document trong Inventory.
 * Số lượng tồn kho được tự động đồng bộ từ các Batch khi:
 *   - Lô hàng mới được tạo
 *   - Lô hàng được cập nhật số lượng
 *   - Lô hàng bị xóa hoặc hết hạn
 *
 * Cron job cũng sync lại khi đánh dấu lô hết hạn.
 */
const inventorySchema = new mongoose.Schema(
    {
        // Khóa ngoại đến Sản phẩm — mỗi sản phẩm có đúng 1 inventory record
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: [true, 'Sản phẩm không được để trống'],
            unique: true, // 1 product → 1 inventory document
        },
        // Tổng số lượng tồn kho thực tế (chỉ lô còn hạn + còn hàng)
        quantity: {
            type: Number,
            default: 0,
            min: [0, 'Số lượng tồn kho không được âm'],
        },
        // Thời điểm lần cuối đồng bộ từ Batch data
        lastSynced: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// Index cho truy vấn nhanh theo sản phẩm
inventorySchema.index({ product: 1 }, { unique: true });

const Inventory = mongoose.model('Inventory', inventorySchema);

module.exports = Inventory;
