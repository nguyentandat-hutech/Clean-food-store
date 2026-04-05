import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { getAllOrdersAPI, updateOrderStatusAPI } from '../api/orderService';

const statusOptions = ['Pending','Paid','Processing','Shipping','Delivered','Cancelled'];
const statusLabel = { Pending:'Chờ xác nhận', Paid:'Đã thanh toán', Processing:'Đang xử lý', Shipping:'Đang giao', Delivered:'Đã giao', Cancelled:'Đã hủy' };
const validTransitions = { Pending:['Processing','Cancelled'], Paid:['Processing','Cancelled'], Processing:['Shipping','Cancelled'], Shipping:['Delivered'], Delivered:[], Cancelled:[] };
const STATUS_BADGE = { Pending:'badge-orange', Paid:'badge-blue', Processing:'badge-purple', Shipping:'badge-blue', Delivered:'badge-green', Cancelled:'badge-red' };

const fmt = (n) => n?.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' }) ?? '—';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

function AdminOrderPage() {
    const [orders, setOrders] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState('');
    const [updatingId, setUpdatingId] = useState(null);

    const fetchOrders = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const data = await getAllOrdersAPI({ page, limit: 15, status: statusFilter || undefined });
            setOrders(data.orders || []);
            setPagination(data.pagination || { page: 1, totalPages: 1 });
        } catch { toast.error('Không thể tải đơn hàng'); }
        finally { setLoading(false); }
    }, [statusFilter]);

    useEffect(() => { fetchOrders(1); }, [fetchOrders]);

    const handleStatusChange = async (orderId, newStatus) => {
        setUpdatingId(orderId);
        try {
            await updateOrderStatusAPI(orderId, newStatus);
            toast.success(`Đã chuyển trạng thái thành "${statusLabel[newStatus]}"`);
            fetchOrders(pagination.page);
        } catch (err) { toast.error(err.response?.data?.message || 'Cập nhật thất bại'); }
        finally { setUpdatingId(null); }
    };

    return (
        <div style={{ background: 'var(--c-bg)', minHeight: '100vh' }}>
            <div className="admin-header">
                <div className="admin-header-inner">
                    <h1 className="admin-title">🛒 Quản lý Đơn hàng</h1>
                    <select
                        className="form-control"
                        style={{ width: 'auto', minWidth: 180 }}
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="">Tất cả trạng thái</option>
                        {statusOptions.map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}
                    </select>
                </div>
            </div>
            <div className="admin-content">
                {loading ? (
                    <div className="loading-wrap"><div className="spinner" /><p className="loading-text">Đang tải...</p></div>
                ) : (
                    <>
                        <div className="table-wrap">
                            <table className="table">
                                <thead><tr>
                                    <th>Mã ĐH</th><th>Khách hàng</th><th>Sản phẩm</th><th>Tổng tiền</th><th>Thanh toán</th><th>Trạng thái</th><th>Ngày đặt</th><th className="table-center">Cập nhật</th>
                                </tr></thead>
                                <tbody>
                                    {orders.length === 0 ? (
                                        <tr><td colSpan={8}><div className="empty-state" style={{ padding: '20px 0' }}><div className="empty-state-icon">🛒</div><p>Không có đơn hàng nào.</p></div></td></tr>
                                    ) : orders.map(order => (
                                        <tr key={order._id}>
                                            <td><code style={{ fontSize: 11 }}>#{order._id.slice(-6).toUpperCase()}</code></td>
                                            <td>
                                                <div style={{ fontWeight: 600, fontSize: 13 }}>{order.userId?.name || '—'}</div>
                                                <small style={{ color: 'var(--t-muted)' }}>{order.userId?.email}</small>
                                            </td>
                                            <td style={{ fontSize: 12, maxWidth: 160 }}>
                                                {(order.items || []).slice(0, 2).map((p, i) => <div key={i}>{p.name} x{p.quantity}</div>)}
                                                {(order.items || []).length > 2 && <small style={{ color: 'var(--t-muted)' }}>+{order.items.length - 2} sản phẩm</small>}
                                            </td>
                                            <td style={{ fontWeight: 700, color: 'var(--c-primary)' }}>{fmt(order.finalPrice)}</td>
                                            <td className="table-center">{order.paymentMethod === 'VNPay' ? '💳 VNPay' : '💵 COD'}</td>
                                            <td><span className={`badge ${STATUS_BADGE[order.status] || 'badge-gray'}`}>{statusLabel[order.status] || order.status}</span></td>
                                            <td style={{ fontSize: 12 }}>{fmtDate(order.createdAt)}</td>
                                            <td className="table-center">
                                                {(validTransitions[order.status] || []).length > 0 ? (
                                                    <select
                                                        className="form-control"
                                                        style={{ width: 'auto', fontSize: 12, padding: '4px 8px' }}
                                                        value=""
                                                        onChange={(e) => handleStatusChange(order._id, e.target.value)}
                                                        disabled={updatingId === order._id}
                                                    >
                                                        <option value="" disabled>{updatingId === order._id ? '...' : 'Chuyển →'}</option>
                                                        {validTransitions[order.status].map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}
                                                    </select>
                                                ) : (
                                                    <span style={{ color: 'var(--t-muted)', fontSize: 12 }}>—</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {pagination.totalPages > 1 && (
                            <div className="pagination">
                                <button className="page-btn" onClick={() => fetchOrders(pagination.page - 1)} disabled={pagination.page === 1}>‹</button>
                                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
                                    <button key={p} className={`page-btn ${p === pagination.page ? 'active' : ''}`} onClick={() => fetchOrders(p)}>{p}</button>
                                ))}
                                <button className="page-btn" onClick={() => fetchOrders(pagination.page + 1)} disabled={pagination.page === pagination.totalPages}>›</button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default AdminOrderPage;
