// ============================================================
// AI Service — Phân tích độ tươi thực phẩm
// Chiến lược: YOLO local (Roboflow) → fallback Gemini Vision
//   - YOLO: gọi Python FastAPI server tại YOLO_SERVER_URL
//   - Fallback: Google Gemini 2.0 Flash khi YOLO không khả dụng
// ============================================================

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const FormData = require('form-data');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const AIScanLog = require('../models/AIScanLog');
const { createError } = require('../utils/responseHelper');

// Khởi tạo Gemini client (dùng cho fallback)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// URL của Python YOLO server
const YOLO_SERVER_URL = process.env.YOLO_SERVER_URL || 'http://localhost:8001';

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
/**
 * Gọi Python YOLO server để phân tích độ tươi.
 * Trả về null nếu server không khả dụng (để fallback sang Gemini).
 *
 * @param {string} filePath - Đường dẫn tuyệt đối tới file ảnh
 * @param {string} mimeType - MIME type của ảnh
 * @returns {Promise<{status, confidence, message}|null>}
 */
const analyzeWithYOLO = async (filePath, mimeType) => {
    return new Promise((resolve) => {
        try {
            const form = new FormData();
            form.append('file', fs.createReadStream(filePath), {
                filename: path.basename(filePath),
                contentType: mimeType,
            });

            const url = new URL(`${YOLO_SERVER_URL}/predict`);
            const transport = url.protocol === 'https:' ? https : http;

            const options = {
                hostname: url.hostname,
                port: url.port || (url.protocol === 'https:' ? 443 : 80),
                path: url.pathname,
                method: 'POST',
                headers: form.getHeaders(),
                timeout: 15000, // 15s — YOLO inference phải nhanh hơn Gemini
            };

            const req = transport.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    if (res.statusCode !== 200) {
                        console.warn(`[AI Service] YOLO server trả về HTTP ${res.statusCode}, fallback Gemini.`);
                        return resolve(null);
                    }
                    try {
                        const parsed = JSON.parse(data);
                        const validStatuses = ['Tươi', 'Không tươi', 'Không xác định'];
                        if (validStatuses.includes(parsed.status) && typeof parsed.confidence === 'number') {
                            console.log(`[AI Service] YOLO kết quả: ${parsed.status} (${parsed.confidence}%)`);
                            return resolve(parsed);
                        }
                        resolve(null);
                    } catch {
                        resolve(null);
                    }
                });
            });

            req.on('error', (err) => {
                console.warn(`[AI Service] YOLO server không phản hồi: ${err.message}, fallback Gemini.`);
                resolve(null);
            });

            req.on('timeout', () => {
                req.destroy();
                console.warn('[AI Service] YOLO server timeout, fallback Gemini.');
                resolve(null);
            });

            form.pipe(req);
        } catch (err) {
            console.warn(`[AI Service] Lỗi gọi YOLO: ${err.message}, fallback Gemini.`);
            resolve(null);
        }
    });
};

/**
 * @param {string} filePath   - Đường dẫn tuyệt đối tới file ảnh
 * @param {string} mimeType   - MIME type (image/jpeg | image/png)
 * @param {string} userId     - ID user (null nếu chưa đăng nhập)
 * @param {string} ipAddress  - IP của request
 */
const analyzeImageFreshness = async (filePath, mimeType, userId = null, ipAddress = '') => {
    try {
        // Kiểm tra file tồn tại
        if (!fs.existsSync(filePath)) {
            throw createError(400, 'File ảnh không tồn tại hoặc đã bị xóa.');
        }

        // ── Bước 1: Thử YOLO local trước ───────────────────────────────
        const yoloResult = await analyzeWithYOLO(filePath, mimeType);
        if (yoloResult) {
            // YOLO thành công — ghi log và trả về ngay
            AIScanLog.create({
                userId: userId || null,
                imageName: path.basename(filePath),
                mimeType,
                result: yoloResult,
                ipAddress: ipAddress || '',
                source: 'yolo',
            }).catch((logErr) => console.warn('[AI] Ghi log scan thất bại:', logErr.message));
            return yoloResult;
        }

        // ── Bước 2: Fallback Gemini Vision ──────────────────────────────
        console.log('[AI Service] Dùng Gemini Vision làm fallback …');

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

        const scanResult = {
            status: parsed.status,
            confidence: Math.round(parsed.confidence),
            message: parsed.message,
        };

        // Ghi log scan vào DB (không block kết quả nếu lỗi)
        AIScanLog.create({
            userId: userId || null,
            imageName: path.basename(filePath),
            mimeType,
            result: scanResult,
            ipAddress: ipAddress || '',
            source: 'gemini',
        }).catch((logErr) => console.warn('[AI] Ghi log scan thất bại:', logErr.message));

        return scanResult;
    } catch (error) {
        // Re-throw nếu đã là custom error (có statusCode)
        if (error.statusCode) {
            throw error;
        }
        console.error('[AI Service] Lỗi khi gọi AI:', error.message);
        throw createError(500, 'Lỗi khi phân tích ảnh với AI. Vui lòng thử lại sau.');
    } finally {
        // LUÔN xóa file tạm dù thành công hay thất bại
        await deleteTempFile(filePath);
    }
};

module.exports = { analyzeImageFreshness };
