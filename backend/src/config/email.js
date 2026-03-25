const nodemailer = require('nodemailer');

/**
 * ── Cấu hình Nodemailer Transporter ────────────────────────────
 * Hỗ trợ 2 chế độ:
 * 1. Production: Gmail với App Password
 * 2. Development: Mailtrap để test
 *
 * Cấu hình qua biến môi trường (.env):
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM
 */
const createTransporter = () => {
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT, 10) || 587,
        secure: false, // true cho port 465, false cho port 587
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    return transporter;
};

// Singleton transporter — tạo một lần, dùng nhiều nơi
let transporter = null;

/**
 * Lấy transporter (Singleton Pattern).
 * Tự động tạo nếu chưa có, tái sử dụng nếu đã tạo.
 */
const getTransporter = () => {
    if (!transporter) {
        transporter = createTransporter();
    }
    return transporter;
};

/**
 * Kiểm tra kết nối SMTP có hoạt động không.
 * Gọi hàm này khi server khởi động để phát hiện lỗi sớm.
 */
const verifyConnection = async () => {
    try {
        const t = getTransporter();
        await t.verify();
        console.log('📧 [EMAIL] SMTP connection verified successfully');
        return true;
    } catch (error) {
        console.warn('⚠️ [EMAIL] SMTP connection failed:', error.message);
        console.warn('   Email service sẽ không hoạt động cho đến khi cấu hình đúng SMTP');
        return false;
    }
};

module.exports = { getTransporter, verifyConnection };
