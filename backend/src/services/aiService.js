// ============================================================
// AI Service — Gửi ảnh sang Google Gemini Vision để đánh giá
// độ tươi thực phẩm, trả về kết quả JSON chuẩn
// ============================================================

const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createError } = require('../utils/responseHelper');

// Khởi tạo Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Đọc file ảnh và chuyển sang base64 để gửi cho Gemini Vision.
 * @param {string} filePath - Đường dẫn tuyệt đối tới file ảnh
 * @returns {{ inlineData: { data: string, mimeType: string } }}
 */
const fileToGenerativePart = (filePath, mimeType) => {
    const fileData = fs.readFileSync(filePath);
    return {
        inlineData: {
            data: fileData.toString('base64'),
            mimeType,
        },
    };
};

/**
 * Xóa file ảnh tạm sau khi AI đã xử lý xong.
 * Không throw lỗi nếu xóa thất bại — chỉ log warning.
 * @param {string} filePath - Đường dẫn file cần xóa
 */
const deleteTempFile = async (filePath) => {
    try {
        await fs.promises.unlink(filePath);
        console.log(`[AI Service] Đã xóa file tạm: ${path.basename(filePath)}`);
    } catch (unlinkError) {
        console.warn(`[AI Service] Không thể xóa file tạm: ${filePath}`, unlinkError.message);
    }
};

/**
 * Phân tích độ tươi của thực phẩm trong ảnh bằng Google Gemini Vision.
 *
 * @param {string} filePath - Đường dẫn tuyệt đối tới file ảnh đã upload
 * @param {string} mimeType - MIME type của ảnh (image/jpeg hoặc image/png)
 * @returns {Promise<{ status: string, confidence: number, message: string }>}
 */
const analyzeImageFreshness = async (filePath, mimeType) => {
    try {
        // Kiểm tra file tồn tại
        if (!fs.existsSync(filePath)) {
            throw createError(400, 'File ảnh không tồn tại hoặc đã bị xóa.');
        }

        // Chuyển ảnh sang format Gemini có thể đọc
        const imagePart = fileToGenerativePart(filePath, mimeType);

        // Khởi tạo model Gemini Vision
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        // Prompt yêu cầu AI đánh giá độ tươi
        const prompt = `Bạn là chuyên gia đánh giá chất lượng thực phẩm. Hãy phân tích hình ảnh thực phẩm này và đánh giá độ tươi.

Quy tắc phân tích:
1. Quan sát màu sắc, kết cấu bề mặt, dấu hiệu héo/thối/đốm, và trạng thái tổng thể.
2. Nếu ảnh KHÔNG phải thực phẩm, trả về status "Không xác định" với confidence 0.
3. Đánh giá chính xác và chi tiết.

Bắt buộc trả về ĐÚNG định dạng JSON sau (KHÔNG có markdown, KHÔNG có backticks):
{
  "status": "Tươi" hoặc "Không tươi" hoặc "Không xác định",
  "confidence": <số từ 0 đến 100>,
  "message": "<mô tả chi tiết lý do đánh giá bằng tiếng Việt>"
}`;

        // Gửi request tới Gemini Vision
        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();

        // Parse JSON từ response text
        // Gemini có thể trả về text có chứa markdown code block
        let cleanedText = text.trim();

        // Loại bỏ markdown code block nếu có (```json ... ```)
        const jsonBlockMatch = cleanedText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonBlockMatch) {
            cleanedText = jsonBlockMatch[1].trim();
        }

        let parsed;
        try {
            parsed = JSON.parse(cleanedText);
        } catch (parseErr) {
            console.error('[AI Service] Không thể parse JSON từ Gemini:', cleanedText);
            throw createError(500, 'AI trả về kết quả không hợp lệ. Vui lòng thử lại.');
        }

        // Validate các trường bắt buộc
        const validStatuses = ['Tươi', 'Không tươi', 'Không xác định'];
        if (!parsed.status || !validStatuses.includes(parsed.status)) {
            parsed.status = 'Không xác định';
        }

        if (typeof parsed.confidence !== 'number' || parsed.confidence < 0 || parsed.confidence > 100) {
            parsed.confidence = 0;
        }

        if (!parsed.message || typeof parsed.message !== 'string') {
            parsed.message = 'Không có thông tin chi tiết từ AI.';
        }

        return {
            status: parsed.status,
            confidence: Math.round(parsed.confidence),
            message: parsed.message,
        };
    } catch (error) {
        // Re-throw nếu đã là custom error (có statusCode)
        if (error.statusCode) {
            throw error;
        }
        console.error('[AI Service] Lỗi khi gọi Gemini Vision:', error.message);
        throw createError(500, 'Lỗi khi phân tích ảnh với AI. Vui lòng thử lại sau.');
    } finally {
        // LUÔN xóa file tạm dù thành công hay thất bại
        await deleteTempFile(filePath);
    }
};

module.exports = { analyzeImageFreshness };
