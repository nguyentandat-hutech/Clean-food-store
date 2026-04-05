import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCartAPI } from '../api/cartService';
import { checkoutCODAPI, checkoutVNPayAPI } from '../api/orderService';
import { validateDiscountAPI } from '../api/discountService';

const fmt = (p) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p);

const CheckoutPage = () => {
    const navigate = useNavigate();
    const [cart, setCart] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [discountCode, setDiscountCode] = useState('');
    const [discountInfo, setDiscountInfo] = useState(null);
    const [discountError, setDiscountError] = useState('');
    const [validatingDiscount, setValidatingDiscount] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '', phone: '', address: '', note: '',
        paymentMethod: 'COD', bankCode: '',
    });

    useEffect(() => {
        const fetchCart = async () => {
            try {
                const data = await getCartAPI();
                if (!data || data.products.length === 0) { navigate('/cart'); return; }
                setCart(data);
            } catch (err) {
                setError(err.response?.data?.message || 'Không thể tải giỏ hàng');
            } finally { setLoading(false); }
        };
        fetchCart();
    }, [navigate]);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleValidateDiscount = async () => {
        setDiscountError(''); setDiscountInfo(null);
        if (!discountCode.trim()) return setDiscountError('Vui lòng nhập mã giảm giá');
        const cartTotal = cart?.products?.reduce((s, i) => s + i.productId.price * i.quantity, 0) || 0;
        try {
            setValidatingDiscount(true);
            const data = await validateDiscountAPI(discountCode.trim(), cartTotal);
            setDiscountInfo(data);
        } catch (err) {
            setDiscountError(err.response?.data?.message || 'Mã giảm giá không hợp lệ');
        } finally { setValidatingDiscount(false); }
    };

    const handleRemoveDiscount = () => { setDiscountCode(''); setDiscountInfo(null); setDiscountError(''); };

    const handleSubmit = async (e) => {
        e.preventDefault(); setError('');
        if (!formData.fullName.trim()) return setError('Vui lòng nhập họ tên người nhận');
        if (!formData.phone.trim()) return setError('Vui lòng nhập số điện thoại');
        if (!/^[0-9]{10,11}$/.test(formData.phone)) return setError('Số điện thoại phải có 10-11 chữ số');
        if (!formData.address.trim()) return setError('Vui lòng nhập địa chỉ giao hàng');
        const shippingAddress = { fullName: formData.fullName.trim(), phone: formData.phone.trim(), address: formData.address.trim() };
        try {
            setSubmitting(true);
            if (formData.paymentMethod === 'COD') {
                const order = await checkoutCODAPI(shippingAddress, formData.note.trim(), discountInfo ? discountCode.trim() : '');
                navigate('/order-success', { state: { success: true, paymentMethod: 'COD', order } });
            } else {
                const result = await checkoutVNPayAPI(shippingAddress, formData.bankCode, formData.note.trim(), discountInfo ? discountCode.trim() : '');
                window.location.href = result.paymentUrl;
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Đặt hàng thất bại. Vui lòng thử lại');
        } finally { setSubmitting(false); }
    };

    if (loading) return (
        <div className="loading-wrap"><div className="spinner" /><p className="loading-text">Đang tải...</p></div>
    );

    return (
        <div style={{ background: 'var(--c-bg)', minHeight: '100vh' }}>
            <div className="page-header">
                <div className="page-header-inner">
                    <div className="page-header-icon">📦</div>
                    <div>
                        <h1>Thanh toán</h1>
                        <p>Điền thông tin giao hàng và chọn phương thức thanh toán</p>
                    </div>
                </div>
            </div>

            <div className="container" style={{ paddingBottom: 48 }}>
                {error && <div className="alert alert-danger">⚠️ {error}</div>}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, alignItems: 'start' }}>
                    {/* ── Left: Form ──────────────────────────── */}
                    <form onSubmit={handleSubmit}>
                        {/* Delivery info card */}
                        <div className="card" style={{ marginBottom: 20 }}>
                            <div className="card-header"><h3>📍 Thông tin giao hàng</h3></div>
                            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div className="form-row" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Họ tên người nhận *</label>
                                    <input className="form-control" type="text" name="fullName"
                                        value={formData.fullName} onChange={handleChange}
                                        placeholder="Nguyễn Văn A" />
                                </div>
                                <div className="form-row" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Số điện thoại *</label>
                                    <input className="form-control" type="text" name="phone"
                                        value={formData.phone} onChange={handleChange}
                                        placeholder="0901234567" />
                                </div>
                                <div className="form-row" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Địa chỉ giao hàng *</label>
                                    <textarea className="form-control" name="address"
                                        value={formData.address} onChange={handleChange}
                                        placeholder="123 Đường ABC, Quận 1, TP.HCM" rows={3}
                                        style={{ resize: 'vertical' }} />
                                </div>
                                <div className="form-row" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Ghi chú (tùy chọn)</label>
                                    <textarea className="form-control" name="note"
                                        value={formData.note} onChange={handleChange}
                                        placeholder="Giao giờ hành chính..." rows={2}
                                        style={{ resize: 'vertical' }} />
                                </div>
                            </div>
                        </div>

                        {/* Discount card */}
                        <div className="card" style={{ marginBottom: 20 }}>
                            <div className="card-header"><h3>🏷️ Mã giảm giá</h3></div>
                            <div className="card-body">
                                {!discountInfo ? (
                                    <div style={{ display: 'flex', gap: 10 }}>
                                        <input className="form-control" type="text"
                                            value={discountCode}
                                            onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                                            placeholder="Nhập mã giảm giá..."
                                            style={{ flex: 1 }} />
                                        <button type="button" className="btn btn-primary btn-sm"
                                            onClick={handleValidateDiscount} disabled={validatingDiscount}>
                                            {validatingDiscount ? '...' : 'Áp dụng'}
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--c-50)', padding: '12px 14px', borderRadius: 8, border: '1.5px solid var(--c-200)' }}>
                                        <span style={{ color: 'var(--c-primary)', fontWeight: 600, fontSize: 14 }}>
                                            ✅ <strong>{discountInfo.discount.code}</strong> — Giảm {fmt(discountInfo.discountAmount)}
                                        </span>
                                        <button type="button" onClick={handleRemoveDiscount}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-danger)', fontSize: 20, lineHeight: 1 }}>×</button>
                                    </div>
                                )}
                                {discountError && <p style={{ color: 'var(--c-danger)', fontSize: 13, marginTop: 8 }}>{discountError}</p>}
                            </div>
                        </div>

                        {/* Payment method card */}
                        <div className="card" style={{ marginBottom: 20 }}>
                            <div className="card-header"><h3>💳 Phương thức thanh toán</h3></div>
                            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {[{ val: 'COD', label: '💵 Thanh toán khi nhận hàng (COD)', desc: 'Thanh toán tiền mặt khi nhận hàng. An toàn, không cần thẻ.' },
                                { val: 'VNPay', label: '💳 Thanh toán qua VNPay', desc: 'Thẻ ATM, Visa/Mastercard, hoặc QR Code.' }
                                ].map(opt => (
                                    <label key={opt.val} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: 14, borderRadius: 10, border: `2px solid ${formData.paymentMethod === opt.val ? 'var(--c-primary)' : 'var(--s-border)'}`, background: formData.paymentMethod === opt.val ? 'var(--c-50)' : '#fff', cursor: 'pointer', transition: 'all .2s' }}>
                                        <input type="radio" name="paymentMethod" value={opt.val}
                                            checked={formData.paymentMethod === opt.val} onChange={handleChange}
                                            style={{ marginTop: 2, accentColor: 'var(--c-primary)' }} />
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--t-heading)' }}>{opt.label}</div>
                                            <div style={{ fontSize: 12, color: 'var(--t-muted)', marginTop: 2 }}>{opt.desc}</div>
                                        </div>
                                    </label>
                                ))}

                                {formData.paymentMethod === 'VNPay' && (
                                    <div style={{ marginTop: 4 }}>
                                        <label className="form-label">Ngân hàng (để trống = chọn trên VNPay)</label>
                                        <select className="form-control" name="bankCode" value={formData.bankCode} onChange={handleChange}>
                                            <option value="">-- Chọn trên trang VNPay --</option>
                                            <option value="VNPAYQR">VNPay QR</option>
                                            <option value="VNBANK">Thẻ ATM nội địa</option>
                                            <option value="INTCARD">Visa / Mastercard</option>
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button type="submit" disabled={submitting}
                            className={`btn btn-full btn-lg ${formData.paymentMethod === 'VNPay' ? '' : 'btn-primary'}`}
                            style={formData.paymentMethod === 'VNPay' ? { background: '#0066cc', color: '#fff', border: 'none' } : {}}
                        >
                            {submitting ? 'Đang xử lý...'
                                : formData.paymentMethod === 'VNPay'
                                    ? '💳 Chuyển sang VNPay →'
                                    : '✅ Xác nhận đặt hàng'}
                        </button>
                    </form>

                    {/* ── Right: Order summary ────────────────── */}
                    {cart && (
                        <div style={{ position: 'sticky', top: 84 }}>
                            <div className="card">
                                <div className="card-header"><h3>🧾 Đơn hàng của bạn</h3></div>
                                <div className="card-body" style={{ padding: '0 0 16px' }}>
                                    {cart.products.map((item, idx) => (
                                        <div key={item.productId._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px 20px', borderBottom: idx < cart.products.length - 1 ? '1px solid var(--s-divider)' : 'none', gap: 12 }}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--t-heading)', marginBottom: 2 }}>
                                                    {item.productId.name}
                                                </div>
                                                <div style={{ fontSize: 12, color: 'var(--t-muted)' }}>
                                                    x{item.quantity} {item.productId.unit}
                                                </div>
                                            </div>
                                            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--c-primary)', whiteSpace: 'nowrap' }}>
                                                {fmt(item.subtotal)}
                                            </div>
                                        </div>
                                    ))}
                                    <div style={{ padding: '16px 20px 0' }}>
                                        {discountInfo ? (
                                            <>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--t-secondary)', marginBottom: 8 }}>
                                                    <span>Tạm tính</span><span>{fmt(cart.totalPrice)}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--c-primary)', marginBottom: 8 }}>
                                                    <span>Giảm ({discountInfo.discount.code})</span>
                                                    <span>-{fmt(discountInfo.discountAmount)}</span>
                                                </div>
                                                <hr className="divider" style={{ margin: '12px 0' }} />
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontWeight: 700, fontSize: 15 }}>Thành tiền</span>
                                                    <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--c-primary)' }}>{fmt(discountInfo.finalPrice)}</span>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <hr className="divider" style={{ margin: '0 0 12px' }} />
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontWeight: 700, fontSize: 15 }}>Tổng cộng</span>
                                                    <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--c-primary)' }}>{fmt(cart.totalPrice)}</span>
                                                </div>
                                            </>
                                        )}
                                        <button className="btn btn-ghost btn-full" style={{ marginTop: 14 }}
                                            onClick={() => navigate('/cart')}>
                                            ← Quay lại giỏ hàng
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CheckoutPage;
