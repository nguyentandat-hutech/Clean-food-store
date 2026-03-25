import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCartAPI } from '../api/cartService';
import { checkoutCODAPI } from '../api/orderService';

/**
 * ── CheckoutPage ─────────────────────────────────────────────────
 * Trang thanh toán: hiển thị tóm tắt giỏ hàng, form nhập địa chỉ,
 * chọn phương thức COD, gửi đặt hàng.
 */
const CheckoutPage = () => {
    const navigate = useNavigate();
    const [cart, setCart] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Form địa chỉ giao hàng
    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        address: '',
        note: '',
    });

    // Lấy giỏ hàng để hiển thị tóm tắt
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

    // Xử lý thay đổi input
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Gửi đặt hàng
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Validate phía client
        if (!formData.fullName.trim()) return setError('Vui lòng nhập họ tên người nhận');
        if (!formData.phone.trim()) return setError('Vui lòng nhập số điện thoại');
        if (!/^[0-9]{10,11}$/.test(formData.phone)) return setError('Số điện thoại phải có 10-11 chữ số');
        if (!formData.address.trim()) return setError('Vui lòng nhập địa chỉ giao hàng');

        try {
            setSubmitting(true);
            const shippingAddress = {
                fullName: formData.fullName.trim(),
                phone: formData.phone.trim(),
                address: formData.address.trim(),
            };
            const order = await checkoutCODAPI(shippingAddress, formData.note.trim());
            setSuccess(`Đặt hàng thành công! Mã đơn: ${order._id}`);

            // Chuyển sang trang đơn hàng sau 2 giây
            setTimeout(() => navigate('/orders'), 2000);
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

            {/* Thông báo */}
            {error && (
                <div style={{ background: '#fee', border: '1px solid #f00', padding: 10, marginBottom: 15, borderRadius: 4, color: '#c00' }}>
                    {error}
                </div>
            )}
            {success && (
                <div style={{ background: '#efe', border: '1px solid #0a0', padding: 10, marginBottom: 15, borderRadius: 4, color: '#070' }}>
                    {success}
                </div>
            )}

            <div style={{ display: 'flex', gap: 30, flexWrap: 'wrap' }}>
                {/* Form địa chỉ giao hàng */}
                <div style={{ flex: 1, minWidth: 300 }}>
                    <h2>Thông tin giao hàng</h2>
                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: 15 }}>
                            <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>
                                Họ tên người nhận *
                            </label>
                            <input
                                type="text"
                                name="fullName"
                                value={formData.fullName}
                                onChange={handleChange}
                                placeholder="Nguyễn Văn A"
                                style={{ width: '100%', padding: 10, border: '1px solid #ccc', borderRadius: 4, boxSizing: 'border-box' }}
                            />
                        </div>

                        <div style={{ marginBottom: 15 }}>
                            <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>
                                Số điện thoại *
                            </label>
                            <input
                                type="text"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="0901234567"
                                style={{ width: '100%', padding: 10, border: '1px solid #ccc', borderRadius: 4, boxSizing: 'border-box' }}
                            />
                        </div>

                        <div style={{ marginBottom: 15 }}>
                            <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>
                                Địa chỉ giao hàng *
                            </label>
                            <textarea
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                placeholder="123 Đường ABC, Quận 1, TP.HCM"
                                rows={3}
                                style={{ width: '100%', padding: 10, border: '1px solid #ccc', borderRadius: 4, boxSizing: 'border-box', resize: 'vertical' }}
                            />
                        </div>

                        <div style={{ marginBottom: 15 }}>
                            <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>
                                Ghi chú (tùy chọn)
                            </label>
                            <textarea
                                name="note"
                                value={formData.note}
                                onChange={handleChange}
                                placeholder="Giao giờ hành chính, gọi trước khi giao..."
                                rows={2}
                                style={{ width: '100%', padding: 10, border: '1px solid #ccc', borderRadius: 4, boxSizing: 'border-box', resize: 'vertical' }}
                            />
                        </div>

                        {/* Phương thức thanh toán */}
                        <div style={{ marginBottom: 20, padding: 15, background: '#f5f5f5', borderRadius: 6 }}>
                            <strong>Phương thức thanh toán:</strong>
                            <div style={{ marginTop: 8 }}>
                                <label>
                                    <input type="radio" name="paymentMethod" value="COD" defaultChecked />
                                    {' '}💵 Thanh toán khi nhận hàng (COD)
                                </label>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            style={{
                                width: '100%', padding: '14px 0', fontSize: 16, fontWeight: 'bold',
                                cursor: submitting ? 'not-allowed' : 'pointer',
                                background: submitting ? '#999' : '#28a745', color: '#fff',
                                border: 'none', borderRadius: 6,
                            }}
                        >
                            {submitting ? 'Đang xử lý...' : '✅ Xác nhận đặt hàng'}
                        </button>
                    </form>
                </div>

                {/* Tóm tắt đơn hàng */}
                {cart && (
                    <div style={{ flex: 1, minWidth: 280 }}>
                        <h2>Tóm tắt đơn hàng</h2>
                        <div style={{ border: '1px solid #ddd', borderRadius: 6, padding: 15 }}>
                            {cart.products.map((item) => (
                                <div
                                    key={item.productId._id}
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
                            {/* Tổng tiền */}
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
