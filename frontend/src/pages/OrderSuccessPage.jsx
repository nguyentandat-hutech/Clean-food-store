import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { vnpayReturnAPI } from '../api/orderService';

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

    // Format tiền VNĐ
    const formatPrice = (price) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
    };

    if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Đang xử lý kết quả thanh toán...</div>;

    return (
        <div style={{ maxWidth: 600, margin: '0 auto', padding: 20, textAlign: 'center' }}>
            {/* Lỗi */}
            {error && (
                <div style={{ background: '#fee', border: '1px solid #f00', padding: 15, borderRadius: 8, color: '#c00', marginBottom: 20 }}>
                    <h2>❌ Lỗi xử lý</h2>
                    <p>{error}</p>
                    <button onClick={() => navigate('/orders')} style={{ padding: '10px 20px', cursor: 'pointer', marginTop: 10 }}>
                        📋 Xem đơn hàng
                    </button>
                </div>
            )}

            {/* Kết quả */}
            {result && (
                <div style={{
                    border: `2px solid ${result.success ? '#4caf50' : '#f44336'}`,
                    borderRadius: 12, padding: 30,
                    background: result.success ? '#f0fff0' : '#fff0f0',
                }}>
                    {/* Icon + Tiêu đề */}
                    <div style={{ fontSize: 60, marginBottom: 10 }}>
                        {result.success ? '✅' : '❌'}
                    </div>
                    <h1 style={{ color: result.success ? '#2e7d32' : '#c62828', marginBottom: 5 }}>
                        {result.success
                            ? (result.paymentMethod === 'VNPay' ? 'Thanh toán VNPay thành công!' : 'Đặt hàng COD thành công!')
                            : 'Thanh toán thất bại'
                        }
                    </h1>

                    {/* Thông tin đơn hàng */}
                    {result.order && (
                        <div style={{ textAlign: 'left', marginTop: 20, padding: 15, background: '#fff', borderRadius: 8, border: '1px solid #ddd' }}>
                            <p><strong>Mã đơn hàng:</strong> {result.order._id}</p>
                            <p><strong>Tổng tiền:</strong> <span style={{ color: '#c00', fontWeight: 'bold' }}>{formatPrice(result.order.totalPrice)}</span></p>
                            <p><strong>Phương thức:</strong> {result.paymentMethod === 'VNPay' ? '💳 VNPay' : '💵 COD'}</p>
                            <p><strong>Trạng thái:</strong> {result.order.status === 'Paid' ? '✅ Đã thanh toán' : result.order.status === 'Pending' ? '⏳ Chờ xử lý' : result.order.status}</p>

                            {/* Thông tin VNPay */}
                            {result.paymentMethod === 'VNPay' && result.success && (
                                <>
                                    <p><strong>Mã GD VNPay:</strong> {result.transactionNo}</p>
                                    <p><strong>Ngân hàng:</strong> {result.bankCode}</p>
                                </>
                            )}

                            {/* Sản phẩm */}
                            <h4 style={{ margin: '15px 0 8px' }}>Sản phẩm đã đặt:</h4>
                            {result.order.products?.map((p, idx) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 14 }}>
                                    <span>{p.name} x{p.quantity}</span>
                                    <span>{formatPrice(p.subtotal)}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Nút điều hướng */}
                    <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button onClick={() => navigate('/orders')}
                            style={{ padding: '10px 24px', cursor: 'pointer', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 'bold' }}
                        >
                            📋 Xem đơn hàng
                        </button>
                        <button onClick={() => navigate('/products')}
                            style={{ padding: '10px 24px', cursor: 'pointer', background: '#fff', color: '#333', border: '1px solid #ccc', borderRadius: 6 }}
                        >
                            🛒 Tiếp tục mua sắm
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrderSuccessPage;
