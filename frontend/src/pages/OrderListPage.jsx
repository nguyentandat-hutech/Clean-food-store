import { useState, useEffect, useCallback } from 'react';
import { getMyOrdersAPI, cancelOrderAPI } from '../api/orderService';

const fmt = (p) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p);
const fmtDate = (d) => new Date(d).toLocaleString('vi-VN');

const STATUS_LABEL = {
    Pending: 'Ch? x? l?', Paid: 'Ð? thanh toán', Processing: 'Ðang x? l?',
    Shipping: 'Ðang giao', Delivered: 'Ð? giao', Cancelled: 'Ð? h?y',
};
const STATUS_CLS = {
    Pending: 'status-pending', Paid: 'status-paid', Processing: 'status-processing',
    Shipping: 'status-shipping', Delivered: 'status-delivered', Cancelled: 'status-cancelled',
};

const OrderListPage = () => {
    const [orders, setOrders] = useState([]);
    const [pagination, setPagination] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionLoading, setActionLoading] = useState('');
    const [expandedId, setExpandedId] = useState(null);

    const fetchOrders = useCallback(async (page = 1) => {
        try {
            setLoading(true); setError('');
            const data = await getMyOrdersAPI({ page, limit: 10 });
            setOrders(data.orders); setPagination(data.pagination);
        } catch (err) {
            setError(err.response?.data?.message || 'Không th? t?i ðõn hàng');
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);

    const handleCancel = async (orderId) => {
        if (!window.confirm('B?n có ch?c mu?n h?y ðõn hàng này?')) return;
        try {
            setActionLoading(orderId); setError('');
            await cancelOrderAPI(orderId);
            await fetchOrders(pagination.page || 1);
        } catch (err) {
            setError(err.response?.data?.message || 'Không th? h?y ðõn hàng');
        } finally { setActionLoading(''); }
    };

    if (loading) return (
        <div className="loading-wrap"><div className="spinner" /><p className="loading-text">Ðang t?i ðõn hàng...</p></div>
    );

    return (
        <div style={{ background: 'var(--c-bg)', minHeight: '100vh' }}>
            <div className="page-header">
                <div className="page-header-inner">
                    <div className="page-header-icon">??</div>
                    <div>
                        <h1>Ðõn hàng c?a tôi</h1>
                        <p>Theo d?i tr?ng thái và l?ch s? ð?t hàng</p>
                    </div>
                </div>
            </div>

            <div className="container" style={{ paddingBottom: 48 }}>
                {error && <div className="alert alert-danger">?? {error}</div>}

                {orders.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">??</div>
                        <h3>Chýa có ðõn hàng nào</h3>
                        <p>H?y khám phá s?n ph?m và ð?t hàng ngay!</p>
                        <a href="/products" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>Mua s?m ngay</a>
                    </div>
                ) : (
                    <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {orders.map((order) => (
                                <div key={order._id} className="card" style={{ overflow: 'hidden' }}>
                                    {/* Order header row */}
                                    <div
                                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: 'var(--c-50)', cursor: 'pointer', flexWrap: 'wrap', gap: 10, borderBottom: '1px solid var(--s-border)' }}
                                        onClick={() => setExpandedId(expandedId === order._id ? null : order._id)}
                                    >
                                        <div>
                                            <span style={{ fontWeight: 700, color: 'var(--t-heading)', fontSize: 15 }}>
                                                Ðõn #{order._id.slice(-8).toUpperCase()}
                                            </span>
                                            <span style={{ marginLeft: 12, color: 'var(--t-muted)', fontSize: 13 }}>{fmtDate(order.createdAt)}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <span className={STATUS_CLS[order.status] || 'badge badge-gray'}>{STATUS_LABEL[order.status] || order.status}</span>
                                            <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--c-primary)' }}>{fmt(order.finalPrice)}</span>
                                            <span style={{ fontSize: 11, color: 'var(--t-muted)' }}>{expandedId === order._id ? '?' : '?'}</span>
                                        </div>
                                    </div>

                                    {/* Expanded detail */}
                                    {expandedId === order._id && (
                                        <div style={{ padding: 20 }}>
                                            {/* Items table */}
                                            <div className="table-wrap" style={{ marginBottom: 16 }}>
                                                <table className="table">
                                                    <thead>
                                                        <tr><th>S?n ph?m</th><th className="table-center">SL</th><th className="table-center">Ðõn giá</th><th className="table-center">Thành ti?n</th></tr>
                                                    </thead>
                                                    <tbody>
                                                        {(order.items || []).map((p, idx) => (
                                                            <tr key={idx}>
                                                                <td style={{ fontWeight: 500 }}>{p.name} <span style={{ color: 'var(--t-muted)', fontWeight: 400 }}>({p.unit})</span></td>
                                                                <td className="table-center">{p.quantity}</td>
                                                                <td className="table-center">{fmt(p.price)}</td>
                                                                <td className="table-center" style={{ fontWeight: 600, color: 'var(--c-primary)' }}>{fmt(p.subtotal)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* Delivery info */}
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, marginBottom: 16 }}>
                                                <div style={{ background: 'var(--c-50)', borderRadius: 8, padding: '12px 14px' }}>
                                                    <div style={{ fontSize: 12, color: 'var(--t-muted)', marginBottom: 4 }}>?? Giao ð?n</div>
                                                    <div style={{ fontWeight: 600, fontSize: 14 }}>{order.shippingAddress?.fullName} — {order.shippingAddress?.phone}</div>
                                                    <div style={{ fontSize: 13, color: 'var(--t-secondary)' }}>{order.shippingAddress?.address}</div>
                                                </div>
                                                <div style={{ background: 'var(--c-50)', borderRadius: 8, padding: '12px 14px' }}>
                                                    <div style={{ fontSize: 12, color: 'var(--t-muted)', marginBottom: 4 }}>?? Thanh toán</div>
                                                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                                                        {order.paymentMethod === 'COD' ? '?? Thanh toán khi nh?n hàng' : '?? VNPay'}
                                                    </div>
                                                </div>
                                                {order.note && (
                                                    <div style={{ background: 'var(--c-50)', borderRadius: 8, padding: '12px 14px' }}>
                                                        <div style={{ fontSize: 12, color: 'var(--t-muted)', marginBottom: 4 }}>?? Ghi chú</div>
                                                        <div style={{ fontSize: 13 }}>{order.note}</div>
                                                    </div>
                                                )}
                                            </div>

                                            {order.status === 'Pending' && (
                                                <button onClick={() => handleCancel(order._id)}
                                                    disabled={actionLoading === order._id}
                                                    className="btn btn-danger btn-sm">
                                                    {actionLoading === order._id ? 'Ðang h?y...' : '? H?y ðõn hàng'}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {pagination.totalPages > 1 && (
                            <div className="pagination">
                                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                                    <button key={page} onClick={() => fetchOrders(page)}
                                        className={`page-btn${page === pagination.page ? ' active' : ''}`}>
                                        {page}
                                    </button>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default OrderListPage;
