import { useState, useEffect, useCallback } from 'react';
import { getMyOrdersAPI, cancelOrderAPI } from '../api/orderService';

/**
 * ── OrderListPage ────────────────────────────────────────────────
 * Trang danh sách đơn hàng của user: xem trạng thái, chi tiết, hủy đơn.
 */
const OrderListPage = () => {
    const [orders, setOrders] = useState([]);
    const [pagination, setPagination] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionLoading, setActionLoading] = useState('');
    const [expandedId, setExpandedId] = useState(null); // Đơn hàng đang mở chi tiết

    // Lấy danh sách đơn hàng
    const fetchOrders = useCallback(async (page = 1) => {
        try {
            setLoading(true);
            setError('');
            const data = await getMyOrdersAPI({ page, limit: 10 });
            setOrders(data.orders);
            setPagination(data.pagination);
        } catch (err) {
            setError(err.response?.data?.message || 'Không thể tải đơn hàng');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    // Hủy đơn hàng
    const handleCancel = async (orderId) => {
        if (!window.confirm('Bạn có chắc muốn hủy đơn hàng này?')) return;
        try {
            setActionLoading(orderId);
            setError('');
            await cancelOrderAPI(orderId);
            await fetchOrders(pagination.page || 1);
        } catch (err) {
            setError(err.response?.data?.message || 'Không thể hủy đơn hàng');
        } finally {
            setActionLoading('');
        }
    };

    // Format tiền VNĐ
    const formatPrice = (price) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
    };

    // Format ngày giờ
    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleString('vi-VN');
    };

    // Màu sắc trạng thái
    const statusColor = {
        Pending: '#ff9800',
        Processing: '#2196f3',
        Shipping: '#9c27b0',
        Delivered: '#4caf50',
        Cancelled: '#f44336',
    };

    // Label trạng thái tiếng Việt
    const statusLabel = {
        Pending: 'Chờ xử lý',
        Processing: 'Đang xử lý',
        Shipping: 'Đang giao',
        Delivered: 'Đã giao',
        Cancelled: 'Đã hủy',
    };

    if (loading) return <div style={{ padding: 20, textAlign: 'center' }}>Đang tải đơn hàng...</div>;

    return (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: 20 }}>
            <h1>📋 Đơn hàng của tôi</h1>

            {error && (
                <div style={{ background: '#fee', border: '1px solid #f00', padding: 10, marginBottom: 15, borderRadius: 4, color: '#c00' }}>
                    {error}
                </div>
            )}

            {orders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                    <p>Bạn chưa có đơn hàng nào.</p>
                </div>
            ) : (
                <>
                    {orders.map((order) => (
                        <div key={order._id} style={{ border: '1px solid #ddd', borderRadius: 8, marginBottom: 15, overflow: 'hidden' }}>
                            {/* Header đơn hàng */}
                            <div
                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 15, background: '#f9f9f9', cursor: 'pointer', flexWrap: 'wrap', gap: 10 }}
                                onClick={() => setExpandedId(expandedId === order._id ? null : order._id)}
                            >
                                <div>
                                    <strong>Đơn #{order._id.slice(-8).toUpperCase()}</strong>
                                    <span style={{ marginLeft: 10, color: '#888' }}>{formatDate(order.createdAt)}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                                    {/* Badge trạng thái */}
                                    <span style={{
                                        padding: '4px 12px', borderRadius: 12, fontSize: 13, fontWeight: 'bold',
                                        color: '#fff', background: statusColor[order.status] || '#999',
                                    }}>
                                        {statusLabel[order.status] || order.status}
                                    </span>
                                    <strong>{formatPrice(order.totalPrice)}</strong>
                                    <span>{expandedId === order._id ? '▲' : '▼'}</span>
                                </div>
                            </div>

                            {/* Chi tiết đơn hàng (mở rộng) */}
                            {expandedId === order._id && (
                                <div style={{ padding: 15 }}>
                                    {/* Danh sách sản phẩm */}
                                    <h4 style={{ margin: '0 0 10px' }}>Sản phẩm:</h4>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 15 }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>
                                                <th style={{ padding: 6 }}>Tên</th>
                                                <th style={{ padding: 6, textAlign: 'center' }}>SL</th>
                                                <th style={{ padding: 6, textAlign: 'right' }}>Đơn giá</th>
                                                <th style={{ padding: 6, textAlign: 'right' }}>Thành tiền</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {order.products.map((p, idx) => (
                                                <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                                                    <td style={{ padding: 6 }}>{p.name} ({p.unit})</td>
                                                    <td style={{ padding: 6, textAlign: 'center' }}>{p.quantity}</td>
                                                    <td style={{ padding: 6, textAlign: 'right' }}>{formatPrice(p.price)}</td>
                                                    <td style={{ padding: 6, textAlign: 'right' }}>{formatPrice(p.subtotal)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    {/* Thông tin giao hàng */}
                                    <div style={{ marginBottom: 10 }}>
                                        <strong>Giao đến:</strong>{' '}
                                        {order.shippingAddress.fullName} — {order.shippingAddress.phone}
                                        <br />
                                        {order.shippingAddress.address}
                                    </div>

                                    {/* Ghi chú */}
                                    {order.note && (
                                        <div style={{ marginBottom: 10 }}>
                                            <strong>Ghi chú:</strong> {order.note}
                                        </div>
                                    )}

                                    {/* Phương thức thanh toán */}
                                    <div style={{ marginBottom: 10 }}>
                                        <strong>Thanh toán:</strong> {order.paymentMethod === 'COD' ? '💵 COD (nhận hàng trả tiền)' : order.paymentMethod}
                                    </div>

                                    {/* Nút hủy đơn (chỉ khi Pending) */}
                                    {order.status === 'Pending' && (
                                        <button
                                            onClick={() => handleCancel(order._id)}
                                            disabled={actionLoading === order._id}
                                            style={{
                                                padding: '8px 20px', cursor: 'pointer',
                                                color: '#c00', border: '1px solid #c00',
                                                background: 'transparent', borderRadius: 4, fontWeight: 'bold',
                                            }}
                                        >
                                            {actionLoading === order._id ? 'Đang hủy...' : '❌ Hủy đơn hàng'}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Phân trang */}
                    {pagination.totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
                            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                                <button
                                    key={page}
                                    onClick={() => fetchOrders(page)}
                                    style={{
                                        padding: '8px 14px', cursor: 'pointer', borderRadius: 4,
                                        border: page === pagination.page ? '2px solid #333' : '1px solid #ccc',
                                        fontWeight: page === pagination.page ? 'bold' : 'normal',
                                        background: page === pagination.page ? '#333' : '#fff',
                                        color: page === pagination.page ? '#fff' : '#333',
                                    }}
                                >
                                    {page}
                                </button>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default OrderListPage;
