/**
 * Tạo lỗi có HTTP Status Code tùy chỉnh.
 * Dùng trong Services/Controllers để throw lỗi có nghĩa.
 *
 * Ví dụ: throw createError(404, 'Không tìm thấy người dùng');
 */
const createError = (statusCode, message) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

/**
 * Chuẩn hóa response thành công.
 * Đảm bảo mọi API response đều có cùng cấu trúc JSON.
 */
const successResponse = (res, statusCode = 200, message = 'Success', data = null) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
    });
};

module.exports = { createError, successResponse };
