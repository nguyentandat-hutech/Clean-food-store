// ============================================================
// AI Controller — Xử lý request quét độ tươi thực phẩm
// ============================================================

const aiService = require('../services/aiService');
const { successResponse, createError } = require('../utils/responseHelper');

/**
 * POST /api/ai/scan-freshness
 * Nhận ảnh upload từ client, gửi sang AI để đánh giá độ tươi.
 *
 * @param {Request} req - Request chứa file ảnh (req.file từ Multer)
 * @param {Response} res - Response JSON chuẩn
 */
const scanFreshness = async (req, res) => {
    // Kiểm tra có file được upload không
    if (!req.file) {
        throw createError(400, 'Vui lòng upload một file ảnh (JPG hoặc PNG).');
    }

    const { path: filePath, mimetype } = req.file;

    // Gọi AI Service để phân tích ảnh
    const result = await aiService.analyzeImageFreshness(filePath, mimetype);

    return successResponse(res, 200, 'Phân tích AI hoàn tất.', {
        status: result.status,
        confidence: result.confidence,
        message: result.message,
    });
};

module.exports = { scanFreshness };
