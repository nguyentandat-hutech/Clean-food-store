import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { getInventoryAlertsAPI } from '../api/inventoryService';

// ── Trang Dashboard Admin — Widget cảnh báo kho hàng ────────────
// Hiển thị 3 bảng: Lô hết hạn (đỏ), Lô sắp hết hạn (vàng), SP hết hàng
function AdminDashboardPage() {
    // State cảnh báo
    const [alerts, setAlerts] = useState(null);
    const [loading, setLoading] = useState(false);
    const [warningDays, setWarningDays] = useState(3);

    // ── Lấy dữ liệu cảnh báo ───────────────────────────────────
    const fetchAlerts = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getInventoryAlertsAPI(warningDays);
            setAlerts(data);
        } catch (err) {
            toast.error('Không thể tải cảnh báo kho hàng');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [warningDays]);

    useEffect(() => {
        fetchAlerts();
    }, [fetchAlerts]);

    // ── Format ngày ─────────────────────────────────────────────
    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('vi-VN');
    };

    // ── Tính số ngày còn lại ────────────────────────────────────
    const daysUntilExpiry = (expiryDate) => {
        const now = new Date();
        const exp = new Date(expiryDate);
        return Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
    };

    // ── Tính số ngày đã hết hạn ─────────────────────────────────
    const daysSinceExpiry = (expiryDate) => {
        const now = new Date();
        const exp = new Date(expiryDate);
        return Math.abs(Math.floor((now - exp) / (1000 * 60 * 60 * 24)));
    };

    return (
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: 20 }}>
            <h1>🏠 Dashboard Admin</h1>

            {/* ── SUMMARY CARDS ──────────────────────────────────── */}
            {alerts && (
                <div style={{ display: 'flex', gap: 16, marginBottom: 30, flexWrap: 'wrap' }}>
                    <SummaryCard
                        icon="⛔"
                        label="Lô đã hết hạn"
                        value={alerts.summary.totalExpiredBatches}
                        color="#d9534f"
                    />
                    <SummaryCard
                        icon="⚠️"
                        label="Lô sắp hết hạn"
                        value={alerts.summary.totalExpiringBatches}
                        color="#f0ad4e"
                    />
                    <SummaryCard
                        icon="📦"
                        label="SP hết hàng"
                        value={alerts.summary.totalOutOfStockProducts}
                        color="#5bc0de"
                    />
                    <SummaryCard
                        icon="🔔"
                        label="Tổng cảnh báo"
                        value={alerts.summary.totalAlerts}
                        color={alerts.summary.totalAlerts > 0 ? '#d9534f' : '#5cb85c'}
                    />
                </div>
            )}

            {/* ── Chọn số ngày cảnh báo ─────────────────────────── */}
            <div style={{ marginBottom: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
                <label><strong>Cảnh báo lô hết hạn trong:</strong></label>
                <select
                    value={warningDays}
                    onChange={(e) => setWarningDays(Number(e.target.value))}
                    style={{ padding: 6, fontSize: 14 }}
                >
                    <option value={1}>1 ngày</option>
                    <option value={3}>3 ngày</option>
                    <option value={7}>7 ngày</option>
                    <option value={14}>14 ngày</option>
                </select>
            </div>

            {loading ? (
                <p>Đang tải cảnh báo...</p>
            ) : !alerts ? (
                <p>Không có dữ liệu.</p>
            ) : (
                <>
                    {/* ── BẢNG 1: LÔ ĐÃ HẾT HẠN (ĐỎ) ──────────── */}
                    <div style={{ marginBottom: 30 }}>
                        <h2 style={{ color: '#d9534f' }}>⛔ Lô hàng đã hết hạn</h2>
                        {alerts.expiredBatches.length === 0 ? (
                            <p style={{ color: '#5cb85c' }}>✅ Không có lô hàng nào hết hạn.</p>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                                <thead>
                                    <tr style={{ background: '#d9534f', color: '#fff' }}>
                                        <th style={thStyle}>#</th>
                                        <th style={thStyle}>Mã lô</th>
                                        <th style={thStyle}>Sản phẩm</th>
                                        <th style={thStyle}>SL còn</th>
                                        <th style={thStyle}>Hết hạn ngày</th>
                                        <th style={thStyle}>Đã hết hạn</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {alerts.expiredBatches.map((b, i) => (
                                        <tr key={b._id} style={{ background: '#ffe6e6' }}>
                                            <td style={tdStyle}>{i + 1}</td>
                                            <td style={tdStyle}><strong>{b.batchNumber}</strong></td>
                                            <td style={tdStyle}>{b.product?.name || 'N/A'}</td>
                                            <td style={tdStyle}>{b.quantity} {b.product?.unit || ''}</td>
                                            <td style={tdStyle}>{formatDate(b.expiryDate)}</td>
                                            <td style={{ ...tdStyle, color: '#d9534f', fontWeight: 'bold' }}>
                                                {daysSinceExpiry(b.expiryDate)} ngày trước
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* ── BẢNG 2: LÔ SẮP HẾT HẠN (VÀNG) ─────────── */}
                    <div style={{ marginBottom: 30 }}>
                        <h2 style={{ color: '#f0ad4e' }}>⚠️ Lô hàng sắp hết hạn ({warningDays} ngày tới)</h2>
                        {alerts.expiringBatches.length === 0 ? (
                            <p style={{ color: '#5cb85c' }}>✅ Không có lô hàng nào sắp hết hạn.</p>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                                <thead>
                                    <tr style={{ background: '#f0ad4e', color: '#fff' }}>
                                        <th style={thStyle}>#</th>
                                        <th style={thStyle}>Mã lô</th>
                                        <th style={thStyle}>Sản phẩm</th>
                                        <th style={thStyle}>SL còn</th>
                                        <th style={thStyle}>Hết hạn ngày</th>
                                        <th style={thStyle}>Còn lại</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {alerts.expiringBatches.map((b, i) => {
                                        const remain = daysUntilExpiry(b.expiryDate);
                                        return (
                                            <tr key={b._id} style={{ background: '#fff8e1' }}>
                                                <td style={tdStyle}>{i + 1}</td>
                                                <td style={tdStyle}><strong>{b.batchNumber}</strong></td>
                                                <td style={tdStyle}>{b.product?.name || 'N/A'}</td>
                                                <td style={tdStyle}>{b.quantity} {b.product?.unit || ''}</td>
                                                <td style={tdStyle}>{formatDate(b.expiryDate)}</td>
                                                <td style={{
                                                    ...tdStyle,
                                                    fontWeight: 'bold',
                                                    color: remain <= 1 ? '#d9534f' : '#f0ad4e',
                                                }}>
                                                    {remain} ngày
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* ── BẢNG 3: SẢN PHẨM HẾT HÀNG ────────────── */}
                    <div style={{ marginBottom: 30 }}>
                        <h2 style={{ color: '#5bc0de' }}>📦 Sản phẩm hết hàng (tồn kho = 0)</h2>
                        {alerts.outOfStockProducts.length === 0 ? (
                            <p style={{ color: '#5cb85c' }}>✅ Tất cả sản phẩm đều còn hàng.</p>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                                <thead>
                                    <tr style={{ background: '#5bc0de', color: '#fff' }}>
                                        <th style={thStyle}>#</th>
                                        <th style={thStyle}>Sản phẩm</th>
                                        <th style={thStyle}>Danh mục</th>
                                        <th style={thStyle}>Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {alerts.outOfStockProducts.map((p, i) => (
                                        <tr key={p._id} style={{ background: '#e1f5fe' }}>
                                            <td style={tdStyle}>{i + 1}</td>
                                            <td style={tdStyle}><strong>{p.name}</strong></td>
                                            <td style={tdStyle}>{p.category?.name || '—'}</td>
                                            <td style={{ ...tdStyle, color: '#d9534f', fontWeight: 'bold' }}>
                                                {p.status || 'Hết hàng'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

// ── Component Card tổng kết ─────────────────────────────────────
function SummaryCard({ icon, label, value, color }) {
    return (
        <div style={{
            flex: '1 1 200px',
            background: '#fff',
            borderLeft: `4px solid ${color}`,
            borderRadius: 6,
            padding: 16,
            boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
        }}>
            <div style={{ fontSize: 28 }}>{icon}</div>
            <div style={{ fontSize: 28, fontWeight: 'bold', color }}>{value}</div>
            <div style={{ fontSize: 13, color: '#666' }}>{label}</div>
        </div>
    );
}

// ── Style dùng chung ────────────────────────────────────────────
const thStyle = { padding: '10px 8px', textAlign: 'left', borderBottom: '2px solid rgba(255,255,255,0.3)' };
const tdStyle = { padding: '8px', borderBottom: '1px solid #eee' };

export default AdminDashboardPage;
