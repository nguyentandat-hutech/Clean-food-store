const mongoose = require('mongoose');

/**
 * ── Schema Nhật ký quét AI (AIScanLog) ─────────────────────────
 * Lưu lịch sử mỗi lần người dùng dùng tính năng quét AI kiểm tra
 * độ tươi thực phẩm. Dùng cho:
 *   - Thống kê số lượt quét
 *   - Phân tích tỷ lệ tươi/không tươi
 *   - Debug khi model AI trả kết quả sai
 */
const aiScanLogSchema = new mongoose.Schema(
    {
        // Người dùng thực hiện quét (null nếu chưa đăng nhập - tính năng public)
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        // Tên file ảnh đã upload (không lưu path đầy đủ vì file bị xóa sau khi scan)
        imageName: {
            type: String,
            trim: true,
            default: '',
        },
        // MIME type của ảnh
        mimeType: {
            type: String,
            trim: true,
            default: '',
        },
        // ── Kết quả phân tích từ Gemini AI ──────────────────────
        result: {
            // Verdict: 'Tươi' | 'Không tươi' | 'Không xác định'
            status: {
                type: String,
                enum: ['Tươi', 'Không tươi', 'Không xác định'],
                required: true,
            },
            // Độ tự tin của AI (0-100)
            confidence: {
                type: Number,
                min: 0,
                max: 100,
                required: true,
            },
            // Mô tả chi tiết lý do đánh giá
            message: {
                type: String,
                trim: true,
                default: '',
            },
        },
        // IP của người dùng (để phân tích lưu lượng và phát hiện lạm dụng)
        ipAddress: {
            type: String,
            trim: true,
            default: '',
        },
    },
    {
        timestamps: true, // createdAt sẽ là thời điểm quét
    }
);

// ── Indexes ─────────────────────────────────────────────────────
aiScanLogSchema.index({ createdAt: -1 });              // Lấy log mới nhất
aiScanLogSchema.index({ userId: 1, createdAt: -1 });   // Log theo user
aiScanLogSchema.index({ 'result.status': 1 });         // Thống kê theo kết quả

const AIScanLog = mongoose.model('AIScanLog', aiScanLogSchema);

module.exports = AIScanLog;
