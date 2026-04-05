const crypto = require('crypto');
const querystring = require('qs');
const vnpayConfig = require('../config/vnpay');
const { createError } = require('../utils/responseHelper');

/**
 * ── VNPay Service ────────────────────────────────────────────────
 * Xử lý logic tạo URL thanh toán và xác minh chữ ký bảo mật.
 * Tham khảo: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html
 */

/**
 * Sắp xếp object theo key (yêu cầu bắt buộc của VNPay).
 * @param {object} obj
 * @returns {object}
 */
const sortObject = (obj) => {
    const sorted = {};
    const keys = Object.keys(obj).sort();
    for (const key of keys) {
        sorted[key] = obj[key];
    }
    return sorted;
};

/**
 * Tạo URL thanh toán VNPay.
 * User sẽ được redirect tới URL này để thanh toán trên cổng VNPay.
 *
 * @param {object} order - Đơn hàng đã tạo (cần _id, finalPrice)
 * @param {string} ipAddr - Địa chỉ IP của client
 * @param {string} bankCode - Mã ngân hàng (tùy chọn, '' = chọn trên VNPay)
 * @returns {string} URL thanh toán VNPay
 */
const createPaymentUrl = (order, ipAddr, bankCode = '') => {
    const date = new Date();

    // Format ngày giờ: yyyyMMddHHmmss
    const createDate = formatDate(date);

    // Mã giao dịch duy nhất (dùng OrderId)
    const txnRef = order._id.toString();

    // Dùng finalPrice (sau giảm giá) — số tiền × 100 (VNPay yêu cầu đơn vị nhỏ nhất)
    const amount = Math.round(order.finalPrice * 100);

    // Xây dựng các tham số yêu cầu
    let vnpParams = {
        vnp_Version: vnpayConfig.vnp_Version,
        vnp_Command: vnpayConfig.vnp_Command,
        vnp_TmnCode: vnpayConfig.vnp_TmnCode,
        vnp_Locale: vnpayConfig.vnp_Locale,
        vnp_CurrCode: vnpayConfig.vnp_CurrCode,
        vnp_TxnRef: txnRef,
        vnp_OrderInfo: `Thanh toan don hang ${txnRef}`,
        vnp_OrderType: 'other',
        vnp_Amount: amount,
        vnp_ReturnUrl: vnpayConfig.vnp_ReturnUrl,
        vnp_IpAddr: ipAddr,
        vnp_CreateDate: createDate,
    };

    // Nếu có chọn ngân hàng cụ thể
    if (bankCode) {
        vnpParams.vnp_BankCode = bankCode;
    }

    // Sắp xếp tham số theo thứ tự ABC (bắt buộc)
    vnpParams = sortObject(vnpParams);

    // Tạo chuỗi ký (signData) từ các tham số
    const signData = querystring.stringify(vnpParams, { encode: false });

    // Tạo chữ ký HMAC-SHA512
    const hmac = crypto.createHmac('sha512', vnpayConfig.vnp_HashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    // Gắn chữ ký vào tham số
    vnpParams.vnp_SecureHash = signed;

    // Tạo URL hoàn chỉnh
    const paymentUrl = `${vnpayConfig.vnp_Url}?${querystring.stringify(vnpParams, { encode: false })}`;

    return paymentUrl;
};

/**
 * Xác minh chữ ký SecureHash từ VNPay trả về.
 * Dùng cho cả Return URL và IPN URL.
 *
 * @param {object} vnpParams - Query params từ VNPay (req.query)
 * @returns {{ isValid: boolean, responseCode: string, txnRef: string, amount: number }}
 */
const verifyReturnUrl = (vnpParams) => {
    // Lấy SecureHash gửi về
    const secureHash = vnpParams.vnp_SecureHash;

    // Xóa các field hash ra khỏi object trước khi tính toán
    const params = { ...vnpParams };
    delete params.vnp_SecureHash;
    delete params.vnp_SecureHashType;

    // Sắp xếp lại tham số
    const sortedParams = sortObject(params);
    const signData = querystring.stringify(sortedParams, { encode: false });

    // Tạo chữ ký từ dữ liệu nhận được
    const hmac = crypto.createHmac('sha512', vnpayConfig.vnp_HashSecret);
    const checkSum = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    // So sánh chữ ký
    const isValid = secureHash === checkSum;

    return {
        isValid,
        responseCode: vnpParams.vnp_ResponseCode,    // '00' = thành công
        txnRef: vnpParams.vnp_TxnRef,                // Mã đơn hàng (OrderId)
        amount: parseInt(vnpParams.vnp_Amount, 10) / 100, // Chuyển về VNĐ
        transactionNo: vnpParams.vnp_TransactionNo,  // Mã giao dịch VNPay
        bankCode: vnpParams.vnp_BankCode,             // Ngân hàng thanh toán
        payDate: vnpParams.vnp_PayDate,               // Ngày thanh toán
    };
};

/**
 * Format Date → chuỗi yyyyMMddHHmmss (theo yêu cầu VNPay).
 */
const formatDate = (date) => {
    const pad = (n) => String(n).padStart(2, '0');
    return (
        date.getFullYear().toString() +
        pad(date.getMonth() + 1) +
        pad(date.getDate()) +
        pad(date.getHours()) +
        pad(date.getMinutes()) +
        pad(date.getSeconds())
    );
};

module.exports = {
    createPaymentUrl,
    verifyReturnUrl,
};
