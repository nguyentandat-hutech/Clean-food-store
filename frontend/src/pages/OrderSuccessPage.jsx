import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { vnpayReturnAPI } from '../api/orderService';

const fmt = (p) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p);

/**
 * ── OrderSuccessPage ─────────────────────────────────────────────
 * Trang kết quả đặt hàng:
 * - COD: nhận state từ navigate (CheckoutPage)
 * - VNPay: nhận query params từ VNPay redirect, gọi API verify
 */
const OrderSuccessPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [loading, setLoading] = useState(true);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        const processResult = async () => {
            try {
                // ── Case 1: COD — nhận dữ liệu từ navigate state ─────
                if (location.state?.paymentMethod === 'COD') {
                    setResult({
                        success: true,
                        paymentMethod: 'COD',
                        order: location.state.order,
                    });
                    setLoading(false);
                    return;
                }

                // ── Case 2: VNPay — có query params từ VNPay ─────────
                const vnpResponseCode = searchParams.get('vnp_ResponseCode');
                if (vnpResponseCode !== null) {
                    // Gọi API backend để verify checksum
                    const queryString = searchParams.toString();
                    const data = await vnpayReturnAPI(queryString);
                    setResult({
                        success: data.success,
                        paymentMethod: 'VNPay',
                        order: data.order,
                        transactionNo: data.transactionNo,
                        bankCode: data.bankCode,
                        payDate: data.payDate,
                    });
                    setLoading(false);
                    return;
                }

                // Không có dữ liệu hợp lệ → về trang chủ
                navigate('/');
            } catch (err) {
                setError(err.response?.data?.message || 'Không thể xác minh kết quả thanh toán');
                setLoading(false);
            }
        };

        processResult();
    }, [location.state, searchParams, navigate]);

    if (loading) return (
        <div className="loading-wrap"><div className="spinner" /><p className="loading-text">Đang xử lý kết quả thanh toán...</p></div>
    );

    return (
        <div style={{ background: 'var(--c-bg)', minHeight: '100vh', paddingBottom: 48 }}>
            <div className="container" style={{ maxWidth: 640 }}>
                {error && (
                    <div className="card" style={{ marginTop: 32, textAlign: 'center', borderTop: '4px solid var(--c-danger)' }}>
                        <div className="card-body" style={{ padding: '40px 32px' }}>
                            <div style={{ fontSize: 56, marginBottom: 12 }}>❌</div>
                            <h2 style={{ color: 'var(--c-danger)', marginBottom: 8 }}>Lỗi xử lý thanh toán</h2>
                            <p style={{ color: 'var(--t-secondary)', marginBottom: 24 }}>{error}</p>
                            <button className="btn btn-primary" onClick={() => navigate('/orders')}>📋 Xem đơn hàng</button>
                        </div>
                    </div>
                )}

                {result && (
                    <div className="card" style={{ marginTop: 32, borderTop: `4px solid ${result.success ? 'var(--c-primary)' : 'var(--c-danger)'}` }}>
                        <div className="card-body" style={{ padding: '40px 32px', textAlign: 'center' }}>
                            <div style={{ fontSize: 64, marginBottom: 12 }}>{result.success ? '🎉' : '❌'}</div>
                            <h1 style={{ color: result.success ? 'var(--c-primary)' : 'var(--c-danger)', marginBottom: 8, fontSize: 24 }}>
                                {result.success
                                    ? (result.paymentMethod === 'VNPay' ? 'Thanh toán VNPay thành công!' : 'Đặt hàng thành công!')
                                    : 'Thanh toán thất bại'}
                            </h1>
                            <p style={{ color: 'var(--t-secondary)', marginBottom: 28 }}>
                                {result.success
                                    ? 'Cảm ơn bạn đã tin tưởng Clean Food Store. Đơn hàng đang được xử lý.'
                                    : 'Giao dịch không thành công. Vui lòng thử lại.'}
                            </p>

                            {result.order && (
                                <div style={{ background: 'var(--c-50)', borderRadius: 12, padding: 20, textAlign: 'left', marginBottom: 24 }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                                        <div><span style={{ fontSize: 12, color: 'var(--t-muted)' }}>Mã đơn hàng</span><br /><span style={{ fontWeight: 700, fontSize: 14 }}>#{result.order._id?.slice(-8).toUpperCase()}</span></div>
                                        <div><span style={{ fontSize: 12, color: 'var(--t-muted)' }}>Phương thức</span><br /><span style={{ fontWeight: 600, fontSize: 14 }}>{result.paymentMethod === 'VNPay' ? '💳 VNPay' : '💵 COD'}</span></div>
                                        {result.paymentMethod === 'VNPay' && result.success && <>
                                            <div><span style={{ fontSize: 12, color: 'var(--t-muted)' }}>Mã GD VNPay</span><br /><span style={{ fontWeight: 600, fontSize: 14 }}>{result.transactionNo}</span></div>
                                            <div><span style={{ fontSize: 12, color: 'var(--t-muted)' }}>Ngân hàng</span><br /><span style={{ fontWeight: 600, fontSize: 14 }}>{result.bankCode}</span></div>
                                        </>}
                                    </div>

                                    <hr className="divider" style={{ margin: '10px 0 14px' }} />
                                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t-muted)', marginBottom: 8 }}>Sản phẩm đã đặt</div>
                                    {result.order.items?.map((p, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 14, borderBottom: '1px solid var(--s-divider)' }}>
                                            <span>{p.name} <span style={{ color: 'var(--t-muted)' }}>×{p.quantity}</span></span>
                                            <span style={{ fontWeight: 600 }}>{fmt(p.subtotal)}</span>
                                        </div>
                                    ))}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontWeight: 800, fontSize: 17 }}>
                                        <span>Tổng thanh toán</span>
                                        <span style={{ color: 'var(--c-primary)' }}>{fmt(result.order.finalPrice)}</span>
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                                <button className="btn btn-primary" onClick={() => navigate('/orders')}>📋 Xem đơn hàng</button>
                                <button className="btn btn-outline" onClick={() => navigate('/products')}>🛒 Tiếp tục mua sắm</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrderSuccessPage;
