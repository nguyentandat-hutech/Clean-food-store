/**
 * ── Cấu hình VNPay ──────────────────────────────────────────────
 * Đọc thông tin từ biến môi trường (.env).
 * Tài liệu: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html
 */
const vnpayConfig = {
    // Mã website đăng ký với VNPay (Sandbox hoặc Production)
    vnp_TmnCode: process.env.VNP_TMN_CODE || 'YOUR_TMN_CODE',

    // Chuỗi bí mật dùng để tạo/kiểm tra chữ ký (SecureHash)
    vnp_HashSecret: process.env.VNP_HASH_SECRET || 'YOUR_HASH_SECRET',

    // URL API tạo thanh toán VNPay
    vnp_Url: process.env.VNP_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',

    // URL nhận kết quả trả về sau khi thanh toán (frontend)
    vnp_ReturnUrl: process.env.VNP_RETURN_URL || 'http://localhost:3000/order-success',

    // URL nhận thông báo IPN từ VNPay (backend)
    vnp_IpnUrl: process.env.VNP_IPN_URL || 'http://localhost:5000/api/orders/vnpay-ipn',

    // API Version
    vnp_Version: '2.1.0',

    // Command: thanh toán
    vnp_Command: 'pay',

    // Loại tiền: VND
    vnp_CurrCode: 'VND',

    // Locale: vn hoặc en
    vnp_Locale: 'vn',
};

module.exports = vnpayConfig;
