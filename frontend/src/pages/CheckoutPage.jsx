import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCartAPI } from '../api/cartService';
import { checkoutCODAPI, checkoutVNPayAPI } from '../api/orderService';

/**
 * ── CheckoutPage ─────────────────────────────────────────────────
 * Trang thanh toán: form địa chỉ, chọn COD hoặc VNPay.
 * - COD: gọi API → chuyển đến OrderSuccess
 * - VNPay: gọi API → redirect sang trang VNPay
 */
const CheckoutPage = () => {
    const navigate = useNavigate();
    const [cart, setCart] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Form dữ liệu
    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        address: '',
        note: '',
        paymentMethod: 'COD', // 'COD' hoặc 'VNPay'
        bankCode: '',         // Mã ngân hàng (cho VNPay, rỗng = chọn trên VNPay)
    });

    // Lấy giỏ hàng
    useEffect(() => {
        const fetchCart = async () => {
            try {
                const data = await getCartAPI();
                if (!data || data.products.length === 0) {
                    navigate('/cart');
                    return;
                }
                setCart(data);
            } catch (err) {
                setError(err.response?.data?.message || 'Không thể tải giỏ hàng');
            } finally {
                setLoading(false);
            }
        };
        fetchCart();
    }, [navigate]);

    // Xử lý input
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Gửi đặt hàng
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validate client
        if (!formData.fullName.trim()) return setError('Vui lòng nhập họ tên người nhận');
        if (!formData.phone.trim()) return setError('Vui lòng nhập số điện thoại');
        if (!/^[0-9]{10,11}$/.test(formData.phone)) return setError('Số điện thoại phải có 10-11 chữ số');
        if (!formData.address.trim()) return setError('Vui lòng nhập địa chỉ giao hàng');

        const shippingAddress = {
            fullName: formData.fullName.trim(),
            phone: formData.phone.trim(),
            address: formData.address.trim(),
        };

        try {
            setSubmitting(true);

            if (formData.paymentMethod === 'COD') {
                // ── COD: Tạo đơn → chuyển trang thành công ───────────
                const order = await checkoutCODAPI(shippingAddress, formData.note.trim());
                navigate('/order-success', {
                    state: {
                        success: true,
                        paymentMethod: 'COD',
                        order,
                    },
                });
            } else {
                // ── VNPay: Tạo đơn → redirect sang VNPay ────────────
                const result = await checkoutVNPayAPI(
                    shippingAddress,
                    formData.bankCode,
                    formData.note.trim()
                );
                // Redirect trình duyệt sang trang VNPay
                window.location.href = result.paymentUrl;
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Đặt hàng thất bại. Vui lòng thử lại');
        } finally {
            setSubmitting(false);
        }
    };

    // Format tiền VNĐ
    const formatPrice = (price) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
    };

    if (loading) return <div style={{ padding: 20, textAlign: 'center' }}>Đang tải...</div>;

    return (
        <div style={{ maxWidth: 800, margin: '0 auto', padding: 20 }}>
            <h1>📦 Thanh toán</h1>

            {/* Thông báo lỗi */}
            {error && (
                <div style={{ background: '#fee', border: '1px solid #f00', padding: 10, marginBottom: 15, borderRadius: 4, color: '#c00' }}>
                    {error}
                </div>
            )}

            <div style={{ display: 'flex', gap: 30, flexWrap: 'wrap' }}>
                {/* Form thông tin giao hàng */}
                <div style={{ flex: 1, minWidth: 300 }}>
                    <h2>Thông tin giao hàng</h2>
                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: 15 }}>
                            <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Họ tên người nhận *</label>
                            <input type="text" name="fullName" value={formData.fullName} onChange={handleChange}
                                placeholder="Nguyễn Văn A"
                                style={{ width: '100%', padding: 10, border: '1px solid #ccc', borderRadius: 4, boxSizing: 'border-box' }}
                            />
                        </div>

                        <div style={{ marginBottom: 15 }}>
                            <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Số điện thoại *</label>
                            <input type="text" name="phone" value={formData.phone} onChange={handleChange}
                                placeholder="0901234567"
                                style={{ width: '100%', padding: 10, border: '1px solid #ccc', borderRadius: 4, boxSizing: 'border-box' }}
                            />
                        </div>

                        <div style={{ marginBottom: 15 }}>
                            <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Địa chỉ giao hàng *</label>
                            <textarea name="address" value={formData.address} onChange={handleChange}
                                placeholder="123 Đường ABC, Quận 1, TP.HCM" rows={3}
                                style={{ width: '100%', padding: 10, border: '1px solid #ccc', borderRadius: 4, boxSizing: 'border-box', resize: 'vertical' }}
                            />
                        </div>

                        <div style={{ marginBottom: 15 }}>
                            <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Ghi chú (tùy chọn)</label>
                            <textarea name="note" value={formData.note} onChange={handleChange}
                                placeholder="Giao giờ hành chính..." rows={2}
                                style={{ width: '100%', padding: 10, border: '1px solid #ccc', borderRadius: 4, boxSizing: 'border-box', resize: 'vertical' }}
                            />
                        </div>

                        {/* Chọn phương thức thanh toán */}
                        <div style={{ marginBottom: 20, padding: 15, background: '#f5f5f5', borderRadius: 6 }}>
                            <strong>Phương thức thanh toán:</strong>
                            <div style={{ marginTop: 10 }}>
                                <label style={{ display: 'block', marginBottom: 8, cursor: 'pointer' }}>
                                    <input type="radio" name="paymentMethod" value="COD"
                                        checked={formData.paymentMethod === 'COD'} onChange={handleChange}
                                    />
                                    {' '}💵 Thanh toán khi nhận hàng (COD)
                                </label>
                                <label style={{ display: 'block', cursor: 'pointer' }}>
                                    <input type="radio" name="paymentMethod" value="VNPay"
                                        checked={formData.paymentMethod === 'VNPay'} onChange={handleChange}
                                    />
                                    {' '}💳 Thanh toán qua VNPay (ATM / Visa / QR)
                                </label>
                            </div>

                            {/* Chọn ngân hàng cho VNPay (tùy chọn) */}
                            {formData.paymentMethod === 'VNPay' && (
                                <div style={{ marginTop: 10 }}>
                                    <label style={{ display: 'block', marginBottom: 5, fontSize: 14 }}>
                                        Ngân hàng (để trống = chọn trên VNPay):
                                    </label>
                                    <select name="bankCode" value={formData.bankCode} onChange={handleChange}
                                        style={{ padding: 8, border: '1px solid #ccc', borderRadius: 4, width: '100%', boxSizing: 'border-box' }}
                                    >
                                        <option value="">-- Chọn trên trang VNPay --</option>
                                        <option value="VNPAYQR">VNPay QR</option>
                                        <option value="VNBANK">Thẻ ATM nội địa</option>
                                        <option value="INTCARD">Visa / Mastercard</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        <button type="submit" disabled={submitting}
                            style={{
                                width: '100%', padding: '14px 0', fontSize: 16, fontWeight: 'bold',
                                cursor: submitting ? 'not-allowed' : 'pointer',
                                background: submitting ? '#999' : (formData.paymentMethod === 'VNPay' ? '#0066cc' : '#28a745'),
                                color: '#fff', border: 'none', borderRadius: 6,
                            }}
                        >
                            {submitting
                                ? 'Đang xử lý...'
                                : formData.paymentMethod === 'VNPay'
                                    ? '💳 Thanh toán qua VNPay'
                                    : '✅ Xác nhận đặt hàng COD'
                            }
                        </button>
                    </form>
                </div>

                {/* Tóm tắt đơn hàng */}
                {cart && (
                    <div style={{ flex: 1, minWidth: 280 }}>
                        <h2>Tóm tắt đơn hàng</h2>
                        <div style={{ border: '1px solid #ddd', borderRadius: 6, padding: 15 }}>
                            {cart.products.map((item) => (
                                <div key={item.productId._id}
                                    style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}
                                >
                                    <div>
                                        <strong>{item.productId.name}</strong>
                                        <br />
                                        <small style={{ color: '#888' }}>x{item.quantity} {item.productId.unit}</small>
                                    </div>
                                    <div style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                                        {formatPrice(item.subtotal)}
                                    </div>
                                </div>
                            ))}
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', marginTop: 8, borderTop: '2px solid #333' }}>
                                <strong>Tổng cộng:</strong>
                                <span style={{ fontSize: 20, fontWeight: 'bold', color: '#c00' }}>
                                    {formatPrice(cart.totalPrice)}
                                </span>
                            </div>
                        </div>
                        <button onClick={() => navigate('/cart')} style={{ marginTop: 10, padding: '8px 16px', cursor: 'pointer' }}>
                            ← Quay lại giỏ hàng
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CheckoutPage;
