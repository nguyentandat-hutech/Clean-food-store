const { getTransporter } = require('../config/email');

/**
 * ── Email Service ────────────────────────────────────────────────
 * Cung cấp các hàm gửi email dùng chung toàn project.
 * Sử dụng HTML Template để email trông chuyên nghiệp.
 */

// Địa chỉ gửi mặc định (đọc từ .env hoặc fallback)
const MAIL_FROM = process.env.MAIL_FROM || '"Clean Food Store" <noreply@cleanfood.vn>';

/**
 * Hàm gửi email chung — base function cho tất cả loại email.
 * @param {string} to      - Email người nhận
 * @param {string} subject - Tiêu đề email
 * @param {string} html    - Nội dung HTML
 */
const sendMail = async (to, subject, html) => {
    try {
        const transporter = getTransporter();

        const mailOptions = {
            from: MAIL_FROM,
            to,
            subject,
            html,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`📧 [EMAIL] Gửi thành công đến ${to} | MessageID: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`❌ [EMAIL] Gửi thất bại đến ${to}:`, error.message);
        // Không throw lỗi — email thất bại không nên làm crash flow chính
        return { success: false, error: error.message };
    }
};

/**
 * Gửi email xác nhận đơn hàng.
 * @param {string} userEmail   - Email khách hàng
 * @param {object} orderDetails - Thông tin đơn hàng
 *   { orderId, customerName, items: [{name, quantity, price, unit}], totalAmount, orderDate }
 */
const sendOrderConfirmation = async (userEmail, orderDetails) => {
    const {
        orderId = 'N/A',
        customerName = 'Quý khách',
        items = [],
        totalAmount = 0,
        orderDate = new Date().toLocaleDateString('vi-VN'),
    } = orderDetails;

    // Tạo bảng danh sách sản phẩm trong đơn hàng
    const itemsRows = items.map((item, index) => `
        <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${index + 1}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${item.name}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity} ${item.unit || ''}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #eee; text-align: right;">${item.price?.toLocaleString('vi-VN')}đ</td>
        </tr>
    `).join('');

    const subject = `🛒 Xác nhận đơn hàng #${orderId} - Clean Food Store`;

    const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f5f5f5; padding: 20px;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #2e7d32, #4caf50); padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="color: #fff; margin: 0; font-size: 22px;">🥬 Clean Food Store</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0;">Thực phẩm sạch - Sức khỏe xanh</p>
        </div>

        <!-- Body -->
        <div style="background: #fff; padding: 24px; border-radius: 0 0 8px 8px;">
            <h2 style="color: #333; margin-top: 0;">✅ Đặt hàng thành công!</h2>
            <p>Xin chào <strong>${customerName}</strong>,</p>
            <p>Đơn hàng của bạn đã được tiếp nhận và đang xử lý.</p>

            <!-- Thông tin đơn hàng -->
            <div style="background: #f9f9f9; padding: 16px; border-radius: 6px; margin: 16px 0;">
                <p style="margin: 4px 0;"><strong>Mã đơn hàng:</strong> #${orderId}</p>
                <p style="margin: 4px 0;"><strong>Ngày đặt:</strong> ${orderDate}</p>
            </div>

            <!-- Bảng sản phẩm -->
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                <thead>
                    <tr style="background: #2e7d32; color: #fff;">
                        <th style="padding: 10px 12px; text-align: left;">STT</th>
                        <th style="padding: 10px 12px; text-align: left;">Sản phẩm</th>
                        <th style="padding: 10px 12px; text-align: center;">SL</th>
                        <th style="padding: 10px 12px; text-align: right;">Giá</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsRows}
                </tbody>
                <tfoot>
                    <tr style="background: #e8f5e9;">
                        <td colspan="3" style="padding: 12px; font-weight: bold; text-align: right;">Tổng cộng:</td>
                        <td style="padding: 12px; font-weight: bold; text-align: right; color: #2e7d32; font-size: 18px;">
                            ${totalAmount.toLocaleString('vi-VN')}đ
                        </td>
                    </tr>
                </tfoot>
            </table>

            <p style="color: #666; font-size: 13px;">
                Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ chúng tôi qua email hoặc hotline.
            </p>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding: 16px; color: #999; font-size: 12px;">
            <p>© 2026 Clean Food Store. All rights reserved.</p>
        </div>
    </body>
    </html>
    `;

    return await sendMail(userEmail, subject, html);
};

/**
 * Gửi email thông báo khuyến mãi / mã giảm giá.
 * @param {string} userEmail    - Email khách hàng
 * @param {string} discountCode - Mã giảm giá
 * @param {object} options      - Tùy chọn bổ sung { discountPercent, expiryDate, minOrder }
 */
const sendPromotionEmail = async (userEmail, discountCode, options = {}) => {
    const {
        discountPercent = 10,
        expiryDate = '',
        minOrder = 0,
    } = options;

    const subject = `🎉 Ưu đãi đặc biệt: Giảm ${discountPercent}% tại Clean Food Store!`;

    const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f5f5f5; padding: 20px;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #ff6f00, #ffa726); padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="color: #fff; margin: 0; font-size: 22px;">🥬 Clean Food Store</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0;">Ưu đãi đặc biệt dành cho bạn!</p>
        </div>

        <!-- Body -->
        <div style="background: #fff; padding: 24px; border-radius: 0 0 8px 8px;">
            <h2 style="color: #333; margin-top: 0; text-align: center;">
                🎁 Giảm ngay <span style="color: #ff6f00;">${discountPercent}%</span>
            </h2>

            <p style="text-align: center; color: #666;">
                Sử dụng mã khuyến mãi dưới đây khi đặt hàng:
            </p>

            <!-- Mã giảm giá -->
            <div style="background: #fff3e0; border: 2px dashed #ff6f00; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                <p style="font-size: 28px; font-weight: bold; color: #e65100; letter-spacing: 4px; margin: 0;">
                    ${discountCode}
                </p>
            </div>

            <!-- Điều kiện -->
            <div style="background: #f9f9f9; padding: 16px; border-radius: 6px; margin: 16px 0;">
                <p style="margin: 4px 0; font-size: 14px;">
                    📌 <strong>Giảm:</strong> ${discountPercent}% tổng đơn hàng
                </p>
                ${minOrder > 0 ? `
                <p style="margin: 4px 0; font-size: 14px;">
                    💰 <strong>Đơn tối thiểu:</strong> ${minOrder.toLocaleString('vi-VN')}đ
                </p>` : ''}
                ${expiryDate ? `
                <p style="margin: 4px 0; font-size: 14px;">
                    ⏰ <strong>Hạn sử dụng:</strong> ${expiryDate}
                </p>` : ''}
            </div>

            <div style="text-align: center; margin-top: 24px;">
                <p style="color: #666; font-size: 13px;">
                    Đừng bỏ lỡ cơ hội mua thực phẩm sạch với giá ưu đãi!
                </p>
            </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding: 16px; color: #999; font-size: 12px;">
            <p>© 2026 Clean Food Store. All rights reserved.</p>
            <p>Bạn nhận được email này vì đã đăng ký nhận khuyến mãi.</p>
        </div>
    </body>
    </html>
    `;

    return await sendMail(userEmail, subject, html);
};

module.exports = {
    sendMail,
    sendOrderConfirmation,
    sendPromotionEmail,
};
