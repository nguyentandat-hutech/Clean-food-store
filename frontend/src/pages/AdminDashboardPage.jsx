import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { getInventoryAlertsAPI } from '../api/inventoryService';
import { getRevenueAPI, getTopSellersAPI, getExpiringSoonAPI } from '../api/statsService';

// ── Format tiền VND ─────────────────────────────────────────────
const formatVND = (value) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

// ── Trang Dashboard Admin — Thống kê + Biểu đồ + Cảnh báo ─────
function AdminDashboardPage() {
    // State dữ liệu
    const [revenue, setRevenue] = useState(null);
    const [topSellers, setTopSellers] = useState([]);
    const [expiringSoon, setExpiringSoon] = useState(null);
    const [alerts, setAlerts] = useState(null);

    // State UI
    const [loading, setLoading] = useState(true);
    const [revenuePeriod, setRevenuePeriod] = useState('monthly');
    const [warningDays, setWarningDays] = useState(3);

    // ── Lấy dữ liệu thống kê ───────────────────────────────────
    const fetchStats = useCallback(async () => {
        setLoading(true);
        try {
            const [revenueData, topData, expiringData, alertData] = await Promise.all([
                getRevenueAPI(revenuePeriod),
                getTopSellersAPI(5),
                getExpiringSoonAPI(7),
                getInventoryAlertsAPI(warningDays),
            ]);
            setRevenue(revenueData);
            setTopSellers(topData.topSellers || []);
            setExpiringSoon(expiringData);
            setAlerts(alertData);
        } catch (err) {
            toast.error('Không thể tải dữ liệu thống kê');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [revenuePeriod, warningDays]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

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

    // ── Custom Tooltip cho Line Chart ───────────────────────────
    const RevenueTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{
                    background: '#fff', padding: '12px 16px', borderRadius: 8,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.12)', border: '1px solid #e0e0e0',
                }}>
                    <p style={{ margin: 0, fontWeight: 600, color: '#424242' }}>{label}</p>
                    <p style={{ margin: '4px 0 0', color: '#2e7d32', fontWeight: 600 }}>
                        Doanh thu: {formatVND(payload[0].value)}
                    </p>
                    {payload[1] && (
                        <p style={{ margin: '4px 0 0', color: '#1976d2' }}>
                            Đơn hàng: {payload[1].value}
                        </p>
                    )}
                </div>
            );
        }
        return null;
    };

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: 20 }}>
            <h1 style={{ marginBottom: 24, color: '#1b5e20' }}>📊 Dashboard Admin</h1>

            {loading ? (
                <p style={{ textAlign: 'center', color: '#757575', padding: 40 }}>Đang tải dữ liệu thống kê...</p>
            ) : (
                <>
                    {/* ═══════════════════════════════════════════════ */}
                    {/* SUMMARY CARDS                                   */}
                    {/* ═══════════════════════════════════════════════ */}
                    <div style={{ display: 'flex', gap: 16, marginBottom: 30, flexWrap: 'wrap' }}>
                        <SummaryCard
                            icon="💰"
                            label="Tổng doanh thu"
                            value={revenue ? formatVND(revenue.totalRevenue) : '0đ'}
                            color="#2e7d32"
                        />
                        <SummaryCard
                            icon="📦"
                            label="Tổng đơn hàng (Delivered)"
                            value={revenue ? revenue.totalOrders : 0}
                            color="#1976d2"
                        />
                        <SummaryCard
                            icon="⚠️"
                            label="Lô sắp hết hạn"
                            value={expiringSoon ? expiringSoon.totalBatches : 0}
                            color="#f0ad4e"
                        />
                        <SummaryCard
                            icon="🔔"
                            label="Tổng cảnh báo kho"
                            value={alerts ? alerts.summary.totalAlerts : 0}
                            color={alerts && alerts.summary.totalAlerts > 0 ? '#d9534f' : '#5cb85c'}
                        />
                    </div>

                    {/* ═══════════════════════════════════════════════ */}
                    {/* BIỂU ĐỒ DOANH THU (LINE CHART)                 */}
                    {/* ═══════════════════════════════════════════════ */}
                    <div style={{
                        background: '#fff', borderRadius: 12, padding: 24,
                        boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: 30,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
                            <h2 style={{ margin: 0, fontSize: '1.125rem', color: '#424242' }}>
                                📈 Biến động doanh thu
                            </h2>
                            <select
                                value={revenuePeriod}
                                onChange={(e) => setRevenuePeriod(e.target.value)}
                                style={{
                                    padding: '6px 12px', fontSize: 14, borderRadius: 6,
                                    border: '1.5px solid #e0e0e0', outline: 'none',
                                }}
                            >
                                <option value="monthly">Theo tháng</option>
                                <option value="daily">Theo ngày</option>
                            </select>
                        </div>

                        {revenue && revenue.details.length > 0 ? (
                            <ResponsiveContainer width="100%" height={350}>
                                <LineChart
                                    data={revenue.details.map((item) => ({
                                        name: item._id,
                                        'Doanh thu': item.totalRevenue,
                                        'Đơn hàng': item.orderCount,
                                    }))}
                                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis
                                        dataKey="name"
                                        tick={{ fontSize: 12, fill: '#757575' }}
                                        axisLine={{ stroke: '#e0e0e0' }}
                                    />
                                    <YAxis
                                        yAxisId="revenue"
                                        tick={{ fontSize: 12, fill: '#757575' }}
                                        axisLine={{ stroke: '#e0e0e0' }}
                                        tickFormatter={(val) => {
                                            if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                                            if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
                                            return val;
                                        }}
                                    />
                                    <YAxis
                                        yAxisId="orders"
                                        orientation="right"
                                        tick={{ fontSize: 12, fill: '#757575' }}
                                        axisLine={{ stroke: '#e0e0e0' }}
                                    />
                                    <Tooltip content={<RevenueTooltip />} />
                                    <Legend />
                                    <Line
                                        yAxisId="revenue"
                                        type="monotone"
                                        dataKey="Doanh thu"
                                        stroke="#2e7d32"
                                        strokeWidth={3}
                                        dot={{ r: 5, fill: '#2e7d32' }}
                                        activeDot={{ r: 7 }}
                                    />
                                    <Line
                                        yAxisId="orders"
                                        type="monotone"
                                        dataKey="Đơn hàng"
                                        stroke="#1976d2"
                                        strokeWidth={2}
                                        strokeDasharray="5 5"
                                        dot={{ r: 4, fill: '#1976d2' }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <p style={{ textAlign: 'center', color: '#9e9e9e', padding: 40 }}>
                                Chưa có dữ liệu doanh thu.
                            </p>
                        )}
                    </div>

                    {/* ═══════════════════════════════════════════════ */}
                    {/* TOP SẢN PHẨM BÁN CHẠY (BAR CHART)             */}
                    {/* ═══════════════════════════════════════════════ */}
                    <div style={{
                        background: '#fff', borderRadius: 12, padding: 24,
                        boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: 30,
                    }}>
                        <h2 style={{ margin: '0 0 20px', fontSize: '1.125rem', color: '#424242' }}>
                            🏆 Top 5 sản phẩm bán chạy
                        </h2>

                        {topSellers.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart
                                    data={topSellers.map((item) => ({
                                        name: item.productName.length > 20
                                            ? item.productName.substring(0, 20) + '...'
                                            : item.productName,
                                        'Số lượng bán': item.totalQuantity,
                                        'Doanh thu': item.totalRevenue,
                                    }))}
                                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis
                                        dataKey="name"
                                        tick={{ fontSize: 11, fill: '#757575' }}
                                        axisLine={{ stroke: '#e0e0e0' }}
                                    />
                                    <YAxis
                                        tick={{ fontSize: 12, fill: '#757575' }}
                                        axisLine={{ stroke: '#e0e0e0' }}
                                    />
                                    <Tooltip
                                        formatter={(value, name) => {
                                            if (name === 'Doanh thu') return formatVND(value);
                                            return value;
                                        }}
                                        contentStyle={{
                                            borderRadius: 8, border: '1px solid #e0e0e0',
                                            boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                                        }}
                                    />
                                    <Legend />
                                    <Bar dataKey="Số lượng bán" fill="#43a047" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="Doanh thu" fill="#66bb6a" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <p style={{ textAlign: 'center', color: '#9e9e9e', padding: 40 }}>
                                Chưa có dữ liệu sản phẩm bán chạy.
                            </p>
                        )}
                    </div>

                    {/* ═══════════════════════════════════════════════ */}
                    {/* CẢNH BÁO KHO HÀNG (giữ nguyên logic cũ)        */}
                    {/* ═══════════════════════════════════════════════ */}
                    <div style={{
                        background: '#fff', borderRadius: 12, padding: 24,
                        boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: 30,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
                            <h2 style={{ margin: 0, fontSize: '1.125rem', color: '#424242' }}>
                                🔔 Cảnh báo kho hàng
                            </h2>
                            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                <label style={{ fontSize: 14 }}><strong>Cảnh báo trong:</strong></label>
                                <select
                                    value={warningDays}
                                    onChange={(e) => setWarningDays(Number(e.target.value))}
                                    style={{
                                        padding: '6px 12px', fontSize: 14, borderRadius: 6,
                                        border: '1.5px solid #e0e0e0', outline: 'none',
                                    }}
                                >
                                    <option value={1}>1 ngày</option>
                                    <option value={3}>3 ngày</option>
                                    <option value={7}>7 ngày</option>
                                    <option value={14}>14 ngày</option>
                                </select>
                            </div>
                        </div>

                        {alerts && (
                            <>
                                {/* Mini summary cards cho cảnh báo */}
                                <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                                    <MiniCard
                                        label="Lô hết hạn"
                                        value={alerts.summary.totalExpiredBatches}
                                        color="#d9534f"
                                    />
                                    <MiniCard
                                        label="Lô sắp hết hạn"
                                        value={alerts.summary.totalExpiringBatches}
                                        color="#f0ad4e"
                                    />
                                    <MiniCard
                                        label="SP hết hàng"
                                        value={alerts.summary.totalOutOfStockProducts}
                                        color="#5bc0de"
                                    />
                                </div>

                                {/* Bảng lô đã hết hạn */}
                                {alerts.expiredBatches.length > 0 && (
                                    <div style={{ marginBottom: 24 }}>
                                        <h3 style={{ color: '#d9534f', marginBottom: 10 }}>⛔ Lô hàng đã hết hạn</h3>
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
                                    </div>
                                )}

                                {/* Bảng lô sắp hết hạn */}
                                {alerts.expiringBatches.length > 0 && (
                                    <div style={{ marginBottom: 24 }}>
                                        <h3 style={{ color: '#f0ad4e', marginBottom: 10 }}>⚠️ Lô sắp hết hạn ({warningDays} ngày tới)</h3>
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
                                                                ...tdStyle, fontWeight: 'bold',
                                                                color: remain <= 1 ? '#d9534f' : '#f0ad4e',
                                                            }}>
                                                                {remain} ngày
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {/* Bảng SP hết hàng */}
                                {alerts.outOfStockProducts.length > 0 && (
                                    <div>
                                        <h3 style={{ color: '#5bc0de', marginBottom: 10 }}>📦 Sản phẩm hết hàng</h3>
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
                                    </div>
                                )}

                                {/* Tất cả đều OK */}
                                {alerts.summary.totalAlerts === 0 && (
                                    <p style={{ textAlign: 'center', color: '#5cb85c', fontSize: 16, padding: 20 }}>
                                        ✅ Tất cả đều ổn! Không có cảnh báo nào.
                                    </p>
                                )}
                            </>
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
            flex: '1 1 220px',
            background: '#fff',
            borderLeft: `4px solid ${color}`,
            borderRadius: 10,
            padding: 18,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            transition: 'transform 0.2s, box-shadow 0.2s',
        }}>
            <div style={{ fontSize: 28, marginBottom: 4 }}>{icon}</div>
            <div style={{
                fontSize: typeof value === 'string' && value.length > 10 ? 18 : 28,
                fontWeight: 'bold', color, wordBreak: 'break-word',
            }}>{value}</div>
            <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>{label}</div>
        </div>
    );
}

// ── Mini card cho cảnh báo ──────────────────────────────────────
function MiniCard({ label, value, color }) {
    return (
        <div style={{
            flex: '1 1 140px',
            padding: '12px 16px',
            borderRadius: 8,
            background: `${color}15`,
            borderLeft: `3px solid ${color}`,
        }}>
            <div style={{ fontSize: 22, fontWeight: 'bold', color }}>{value}</div>
            <div style={{ fontSize: 12, color: '#666' }}>{label}</div>
        </div>
    );
}

// ── Style table dùng chung ──────────────────────────────────────
const thStyle = { padding: '10px 8px', textAlign: 'left', borderBottom: '2px solid rgba(255,255,255,0.3)' };
const tdStyle = { padding: '8px', borderBottom: '1px solid #eee' };

export default AdminDashboardPage;
