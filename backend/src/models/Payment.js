const mongoose = require('mongoose');

/**
 * ── Schema Nhật ký thanh toán (Payment) ────────────────────────
 * Lưu toàn bộ thông tin giao dịch thanh toán, tách biệt hoàn toàn
 * với thông tin đơn hàng (Order).
 *
 * Mỗi Order có đúng MỘT Payment record.
 * Dùng cho: audit log, kiểm tra đối soát, báo cáo tài chính.
 */
const paymentSchema = new mongoose.Schema(
    {
        // Liên kết đến đơn hàng (unique: 1 order → 1 payment)
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order',
            required: [true, 'OrderId không được để trống'],
            unique: true,
        },
        // Phương thức thanh toán
        method: {
            type: String,
            enum: ['COD', 'VNPay'],
            required: [true, 'Phương thức thanh toán không được để trống'],
        },
        // Số tiền thanh toán (VNĐ)
        amount: {
            type: Number,
            required: [true, 'Số tiền không được để trống'],
            min: [0, 'Số tiền không được âm'],
        },
        // Trạng thái thanh toán
        // - pending: VNPay chờ thanh toán
        // - success: VNPay đã thanh toán thành công
        // - failed: VNPay thanh toán thất bại
        // - cod_pending: COD đang chờ thu tiền khi giao
        // - cod_collected: COD đã thu tiền thành công
        status: {
            type: String,
            enum: ['pending', 'success', 'failed', 'cod_pending', 'cod_collected'],
            required: true,
        },
        // ── Thông tin phản hồi từ VNPay (chỉ có khi method = 'VNPay') ──
        // Mã giao dịch VNPay (vnp_TransactionNo)
        transactionNo: {
            type: String,
            default: '',
            trim: true,
        },
        // Mã ngân hàng (vnp_BankCode)
        bankCode: {
            type: String,
            default: '',
            trim: true,
        },
        // Response code từ VNPay (vnp_ResponseCode: '00' = success)
        responseCode: {
            type: String,
            default: '',
            trim: true,
        },
        // Raw response từ VNPay để audit (lưu toàn bộ query params)
        rawResponse: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        // Thời điểm thanh toán thành công
        paidAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// ── Indexes ─────────────────────────────────────────────────────
paymentSchema.index({ orderId: 1 }, { unique: true });
paymentSchema.index({ status: 1 });
paymentSchema.index({ transactionNo: 1 });    // Tìm theo mã giao dịch VNPay
paymentSchema.index({ createdAt: -1 });

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
