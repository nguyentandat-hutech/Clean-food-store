import { useState, useEffect, useCallback } from 'react';
import { getAllOrdersAPI, updateOrderStatusAPI } from '../api/orderService';

/**
 * ── AdminOrderPage ───────────────────────────────────────────────
 * Trang Admin quản lý đơn hàng: hiển thị tất cả đơn, dropdown
 * cập nhật trạng thái nhanh, filter theo status, phân trang.
 */
const AdminOrderPage = () => {
    const [orders, setOrders] = useState([]);
    const [pagination, setPagination] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [updatingId, setUpdatingId] = useState('');

    // Danh sách trạng thái
    const statusOptions = ['Pending', 'Paid', 'Processing', 'Shipping', 'Delivered', 'Cancelled'];

    // Label tiếng Việt
    const statusLabel = {
        Pending: 'Chờ xử lý',
        Paid: 'Đã thanh toán',
        Processing: 'Đang xử lý',
        Shipping: 'Đang giao',
        Delivered: 'Đã giao',
        Cancelled: 'Đã hủy',
    };

    // Màu sắc
    const statusColor = {
        Pending: '#ff9800',
        Paid: '#00bcd4',
        Processing: '#2196f3',
        Shipping: '#9c27b0',
        Delivered: '#4caf50',
        Cancelled: '#f44336',
    };

    // Trạng thái cho phép chuyển
    const validTransitions = {
        Pending: ['Processing', 'Cancelled'],
        Paid: ['Processing', 'Cancelled'],
        Processing: ['Shipping', 'Cancelled'],
        Shipping: ['Delivered'],
        Delivered: [],
        Cancelled: [],
    };

    // Lấy danh sách đơn hàng
    const fetchOrders = useCallback(async (page = 1) => {
        try {
            setLoading(true);
            setError('');
            const params = { page, limit: 15 };
            if (statusFilter) params.status = statusFilter;
            const data = await getAllOrdersAPI(params);
            setOrders(data.orders);
            setPagination(data.pagination);
        } catch (err) {
            setError(err.response?.data?.message || 'Không thể tải đơn hàng');
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    // Cập nhật trạng thái đơn hàng
    const handleStatusChange = async (orderId, newStatus) => {
        try {
            setUpdatingId(orderId);
            setError('');
            setSuccess('');
            await updateOrderStatusAPI(orderId, newStatus);
            setSuccess(`Cập nhật trạng thái → "${statusLabel[newStatus]}" thành công`);
            await fetchOrders(pagination.page || 1);
        } catch (err) {
            setError(err.response?.data?.message || 'Không thể cập nhật trạng thái');
        } finally {
            setUpdatingId('');
        }
    };

    // Format
    const formatPrice = (price) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
    const formatDate = (dateStr) => new Date(dateStr).toLocaleString('vi-VN');

    return (
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: 20 }}>
            <h1>🏪 Quản lý đơn hàng (Admin)</h1>

            {/* Filter theo trạng thái */}
            <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <strong>Lọc theo trạng thái:</strong>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                    style={{ padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
                >
                    <option value="">-- Tất cả --</option>
                    {statusOptions.map((s) => (
                        <option key={s} value={s}>{statusLabel[s]}</option>
                    ))}
                </select>
                {statusFilter && (
                    <button onClick={() => setStatusFilter('')} style={{ padding: '6px 12px', cursor: 'pointer' }}>
                        Xóa filter
                    </button>
                )}
            </div>

            {/* Thông báo */}
            {error && <div style={{ background: '#fee', border: '1px solid #f00', padding: 10, marginBottom: 10, borderRadius: 4, color: '#c00' }}>{error}</div>}
            {success && <div style={{ background: '#efe', border: '1px solid #0a0', padding: 10, marginBottom: 10, borderRadius: 4, color: '#070' }}>{success}</div>}

            {loading ? (
                <div style={{ textAlign: 'center', padding: 40 }}>Đang tải...</div>
            ) : orders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40 }}>Không có đơn hàng nào.</div>
            ) : (
                <>
                    {/* Bảng đơn hàng */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #333', textAlign: 'left' }}>
                                <th style={{ padding: 10 }}>Mã đơn</th>
                                <th style={{ padding: 10 }}>Khách hàng</th>
                                <th style={{ padding: 10 }}>Sản phẩm</th>
                                <th style={{ padding: 10, textAlign: 'right' }}>Tổng tiền</th>
                                <th style={{ padding: 10, textAlign: 'center' }}>Thanh toán</th>
                                <th style={{ padding: 10, textAlign: 'center' }}>Trạng thái</th>
                                <th style={{ padding: 10 }}>Ngày đặt</th>
                                <th style={{ padding: 10, textAlign: 'center' }}>Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((order) => (
                                <tr key={order._id} style={{ borderBottom: '1px solid #ddd' }}>
                                    {/* Mã đơn */}
                                    <td style={{ padding: 10, fontFamily: 'monospace', fontSize: 12 }}>
                                        #{order._id.slice(-8).toUpperCase()}
                                    </td>

                                    {/* Khách hàng */}
                                    <td style={{ padding: 10 }}>
                                        {order.userId?.name || 'N/A'}
                                        <br />
                                        <small style={{ color: '#888' }}>{order.userId?.email}</small>
                                    </td>

                                    {/* Sản phẩm */}
                                    <td style={{ padding: 10, fontSize: 13 }}>
                                        {(order.items || []).map((p, idx) => (
                                            <div key={idx}>{p.name} x{p.quantity}</div>
                                        ))}
                                    </td>

                                    {/* Tổng tiền */}
                                    <td style={{ padding: 10, textAlign: 'right', fontWeight: 'bold' }}>
                                        {formatPrice(order.finalPrice)}
                                    </td>

                                    {/* Phương thức */}
                                    <td style={{ padding: 10, textAlign: 'center' }}>
                                        {order.paymentMethod === 'VNPay' ? '💳 VNPay' : '💵 COD'}
                                    </td>

                                    {/* Trạng thái (badge) */}
                                    <td style={{ padding: 10, textAlign: 'center' }}>
                                        <span style={{
                                            padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 'bold',
                                            color: '#fff', background: statusColor[order.status] || '#999',
                                        }}>
                                            {statusLabel[order.status] || order.status}
                                        </span>
                                    </td>

                                    {/* Ngày đặt */}
                                    <td style={{ padding: 10, fontSize: 12 }}>
                                        {formatDate(order.createdAt)}
                                    </td>

                                    {/* Dropdown cập nhật trạng thái */}
                                    <td style={{ padding: 10, textAlign: 'center' }}>
                                        {(validTransitions[order.status] || []).length > 0 ? (
                                            <select
                                                value=""
                                                onChange={(e) => handleStatusChange(order._id, e.target.value)}
                                                disabled={updatingId === order._id}
                                                style={{ padding: 6, border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer' }}
                                            >
                                                <option value="" disabled>
                                                    {updatingId === order._id ? 'Đang cập nhật...' : 'Chuyển →'}
                                                </option>
                                                {(validTransitions[order.status] || []).map((s) => (
                                                    <option key={s} value={s}>{statusLabel[s]}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <span style={{ color: '#999', fontSize: 12 }}>—</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Phân trang */}
                    {pagination.totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
                            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                                <button key={page} onClick={() => fetchOrders(page)}
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

export default AdminOrderPage;
