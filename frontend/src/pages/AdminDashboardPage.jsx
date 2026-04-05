import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { getInventoryAlertsAPI } from '../api/inventoryService';
import { getRevenueAPI, getTopSellersAPI, getExpiringSoonAPI } from '../api/statsService';

const fmt = (v) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const daysUntil = (d) => Math.ceil((new Date(d) - new Date()) / 86400000);
const daysSince = (d) => Math.abs(Math.floor((new Date() - new Date(d)) / 86400000));

const NAV_LINKS = [
    { to: '/admin/products',   label: '🥦 Sản phẩm' },
    { to: '/admin/categories', label: '🏷️ Danh mục' },
    { to: '/admin/farms',      label: '🌱 Trang trại' },
    { to: '/admin/batches',    label: '📋 Lô hàng' },
    { to: '/admin/orders',     label: '🧾 Đơn hàng' },
    { to: '/admin/inventory',  label: '📊 Tồn kho' },
    { to: '/admin/discounts',  label: '🏷️ Mã giảm giá' },
    { to: '/admin/users',      label: '👥 Người dùng' },
];

function AdminDashboardPage() {
    const [revenue, setRevenue]           = useState(null);
    const [topSellers, setTopSellers]     = useState([]);
    const [expiringSoon, setExpiringSoon] = useState(null);
    const [alerts, setAlerts]             = useState(null);
    const [loading, setLoading]           = useState(true);
    const [revenuePeriod, setRevenuePeriod] = useState('monthly');
    const [warningDays, setWarningDays]   = useState(3);

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
        } catch {
            toast.error('Không thể tải dữ liệu thống kê');
        } finally {
            setLoading(false);
        }
    }, [revenuePeriod, warningDays]);

    useEffect(() => { fetchStats(); }, [fetchStats]);

    const RevenueTooltip = ({ active, payload, label }) => {
        if (!active || !payload?.length) return null;
        return (
            <div className="card" style={{ padding: '10px 14px', minWidth: 160 }}>
                <p style={{ margin: '0 0 4px', fontWeight: 600, color: 'var(--t-heading)' }}>{label}</p>
                <p style={{ margin: '0 0 2px', color: 'var(--c-primary)', fontWeight: 600 }}>Doanh thu: {fmt(payload[0].value)}</p>
                {payload[1] && <p style={{ margin: 0, color: '#1976d2' }}>Đơn hàng: {payload[1].value}</p>}
            </div>
        );
    };

    return (
        <div style={{ background: 'var(--c-bg)', minHeight: '100vh' }}>
            {/* ── Admin header ─────────────────────────────── */}
            <div className="admin-header">
                <div className="admin-header-inner">
                    <h1 className="admin-title">📊 Dashboard</h1>
                    <button className="btn btn-primary btn-sm" onClick={fetchStats}>↻ Làm mới</button>
                </div>
            </div>

            {/* ── Admin nav strip ──────────────────────────── */}
            <div className="admin-nav-strip">
                <div className="admin-nav-inner">
                    {NAV_LINKS.map(({ to, label }) => (
                        <Link key={to} to={to} className="admin-nav-link">{label}</Link>
                    ))}
                </div>
            </div>

            <div className="admin-content">
                {loading ? (
                    <div className="loading-wrap">
                        <div className="spinner" />
                        <p className="loading-text">Đang tải dữ liệu...</p>
                    </div>
                ) : (
                    <>
                        {/* ── Summary cards ──────────────────── */}
                        <div className="stats-grid" style={{ marginBottom: 28 }}>
                            {[
                                { icon: '💰', label: 'Tổng doanh thu', val: revenue ? fmt(revenue.totalRevenue) : '0đ', color: 'var(--c-primary)' },
                                { icon: '📦', label: 'Đơn đã giao',    val: revenue ? revenue.totalOrders : 0,           color: '#1976d2' },
                                { icon: '⚠️', label: 'Lô sắp hết hạn', val: expiringSoon ? expiringSoon.totalBatches : 0, color: '#f57c00' },
                                {
                                    icon: '🔔', label: 'Cảnh báo kho',
                                    val: alerts ? alerts.summary.totalAlerts : 0,
                                    color: alerts?.summary.totalAlerts > 0 ? 'var(--c-danger)' : 'var(--c-primary)',
                                },
                            ].map(({ icon, label, val, color }) => (
                                <div key={label} className="stat-card" style={{ borderLeftColor: color }}>
                                    <div style={{ fontSize: 28, marginBottom: 4 }}>{icon}</div>
                                    <div style={{ fontSize: typeof val === 'string' && val.length > 10 ? 18 : 26, fontWeight: 800, color }}>{val}</div>
                                    <div style={{ fontSize: 13, color: 'var(--t-muted)', marginTop: 2 }}>{label}</div>
                                </div>
                            ))}
                        </div>

                        {/* ── Revenue line chart ─────────────── */}
                        <div className="card" style={{ marginBottom: 24 }}>
                            <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <h3 style={{ margin: 0 }}>📈 Biến động doanh thu</h3>
                                <select className="form-control" style={{ width: 'auto', padding: '4px 10px', fontSize: 13 }}
                                    value={revenuePeriod} onChange={e => setRevenuePeriod(e.target.value)}>
                                    <option value="monthly">Theo tháng</option>
                                    <option value="daily">Theo ngày</option>
                                </select>
                            </div>
                            <div className="card-body">
                                {revenue?.details.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={320}>
                                        <LineChart data={revenue.details.map(item => ({
                                            name: item._id, 'Doanh thu': item.totalRevenue, 'Đơn hàng': item.orderCount,
                                        }))} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--s-divider)" />
                                            <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--t-muted)' }} />
                                            <YAxis yAxisId="revenue" tick={{ fontSize: 12, fill: 'var(--t-muted)' }}
                                                tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                                            <YAxis yAxisId="orders" orientation="right" tick={{ fontSize: 12, fill: 'var(--t-muted)' }} />
                                            <Tooltip content={<RevenueTooltip />} />
                                            <Legend />
                                            <Line yAxisId="revenue" type="monotone" dataKey="Doanh thu"
                                                stroke="var(--c-primary)" strokeWidth={3} dot={{ r: 5, fill: 'var(--c-primary)' }} activeDot={{ r: 7 }} />
                                            <Line yAxisId="orders" type="monotone" dataKey="Đơn hàng"
                                                stroke="#1976d2" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4, fill: '#1976d2' }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="empty-state"><div className="empty-state-icon">📊</div><p>Chưa có dữ liệu doanh thu.</p></div>
                                )}
                            </div>
                        </div>

                        {/* ── Top sellers bar chart ──────────── */}
                        <div className="card" style={{ marginBottom: 24 }}>
                            <div className="card-header"><h3 style={{ margin: 0 }}>🏆 Top 5 sản phẩm bán chạy</h3></div>
                            <div className="card-body">
                                {topSellers.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={280}>
                                        <BarChart data={topSellers.map(item => ({
                                            name: item.productName.length > 20 ? item.productName.slice(0, 20) + '...' : item.productName,
                                            'Số lượng bán': item.totalQuantity, 'Doanh thu': item.totalRevenue,
                                        }))} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--s-divider)" />
                                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--t-muted)' }} />
                                            <YAxis tick={{ fontSize: 12, fill: 'var(--t-muted)' }} />
                                            <Tooltip formatter={(v, n) => n === 'Doanh thu' ? fmt(v) : v}
                                                contentStyle={{ borderRadius: 8, border: '1px solid var(--s-border)' }} />
                                            <Legend />
                                            <Bar dataKey="Số lượng bán" fill="var(--c-primary)" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="Doanh thu" fill="var(--c-100)" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="empty-state"><div className="empty-state-icon">📦</div><p>Chưa có dữ liệu sản phẩm bán chạy.</p></div>
                                )}
                            </div>
                        </div>

                        {/* ── Warehouse alerts ───────────────── */}
                        <div className="card" style={{ marginBottom: 24 }}>
                            <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <h3 style={{ margin: 0 }}>🔔 Cảnh báo kho hàng</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: 13, color: 'var(--t-secondary)' }}>Cảnh báo trong:</span>
                                    <select className="form-control" style={{ width: 'auto', padding: '4px 10px', fontSize: 13 }}
                                        value={warningDays} onChange={e => setWarningDays(Number(e.target.value))}>
                                        {[1,3,7,14].map(d => <option key={d} value={d}>{d} ngày</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="card-body">
                                {alerts && (
                                    <>
                                        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                                            {[
                                                { label: 'Lô đã hết hạn',   val: alerts.summary.totalExpiredBatches,   color: 'var(--c-danger)' },
                                                { label: 'Lô sắp hết hạn',  val: alerts.summary.totalExpiringBatches,  color: '#f57c00' },
                                                { label: 'Sản phẩm hết hàng', val: alerts.summary.totalOutOfStockProducts, color: '#1976d2' },
                                            ].map(({ label, val, color }) => (
                                                <div key={label} style={{ flex: '1 1 140px', padding: '12px 16px', borderRadius: 10, background: 'var(--c-50)', borderLeft: `4px solid ${color}` }}>
                                                    <div style={{ fontSize: 24, fontWeight: 800, color }}>{val}</div>
                                                    <div style={{ fontSize: 12, color: 'var(--t-muted)' }}>{label}</div>
                                                </div>
                                            ))}
                                        </div>

                                        {alerts.expiredBatches.length > 0 && (
                                            <div style={{ marginBottom: 20 }}>
                                                <h4 style={{ color: 'var(--c-danger)', marginBottom: 8 }}>⛔ Lô hàng đã hết hạn</h4>
                                                <div className="table-wrap">
                                                    <table className="table">
                                                        <thead><tr>
                                                            <th>#</th><th>Mã lô</th><th>Sản phẩm</th><th>SL còn</th><th>Hết hạn ngày</th><th>Đã hết hạn</th>
                                                        </tr></thead>
                                                        <tbody>
                                                            {alerts.expiredBatches.map((b, i) => (
                                                                <tr key={b._id}>
                                                                    <td>{i + 1}</td>
                                                                    <td><strong>{b.batchNumber}</strong></td>
                                                                    <td>{b.product?.name || 'N/A'}</td>
                                                                    <td>{b.quantity} {b.product?.unit || ''}</td>
                                                                    <td>{fmtDate(b.expiryDate)}</td>
                                                                    <td><span className="badge badge-red">{daysSince(b.expiryDate)} ngày trước</span></td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}

                                        {alerts.expiringBatches.length > 0 && (
                                            <div style={{ marginBottom: 20 }}>
                                                <h4 style={{ color: '#f57c00', marginBottom: 8 }}>⚠️ Lô sắp hết hạn ({warningDays} ngày tới)</h4>
                                                <div className="table-wrap">
                                                    <table className="table">
                                                        <thead><tr>
                                                            <th>#</th><th>Mã lô</th><th>Sản phẩm</th><th>SL còn</th><th>Hết hạn ngày</th><th>Còn lại</th>
                                                        </tr></thead>
                                                        <tbody>
                                                            {alerts.expiringBatches.map((b, i) => {
                                                                const remain = daysUntil(b.expiryDate);
                                                                return (
                                                                    <tr key={b._id}>
                                                                        <td>{i + 1}</td>
                                                                        <td><strong>{b.batchNumber}</strong></td>
                                                                        <td>{b.product?.name || 'N/A'}</td>
                                                                        <td>{b.quantity} {b.product?.unit || ''}</td>
                                                                        <td>{fmtDate(b.expiryDate)}</td>
                                                                        <td><span className={`badge ${remain <= 1 ? 'badge-red' : 'badge-orange'}`}>{remain} ngày</span></td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}

                                        {alerts.outOfStockProducts.length > 0 && (
                                            <div>
                                                <h4 style={{ color: '#1976d2', marginBottom: 8 }}>📦 Sản phẩm hết hàng</h4>
                                                <div className="table-wrap">
                                                    <table className="table">
                                                        <thead><tr><th>#</th><th>Sản phẩm</th><th>Danh mục</th><th>Trạng thái</th></tr></thead>
                                                        <tbody>
                                                            {alerts.outOfStockProducts.map((p, i) => (
                                                                <tr key={p._id}>
                                                                    <td>{i + 1}</td>
                                                                    <td><strong>{p.name}</strong></td>
                                                                    <td>{p.category?.name || '—'}</td>
                                                                    <td><span className="badge badge-red">{p.status || 'Hết hàng'}</span></td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}

                                        {alerts.summary.totalAlerts === 0 && (
                                            <div className="empty-state">
                                                <div className="empty-state-icon">✅</div>
                                                <p style={{ color: 'var(--c-primary)', fontWeight: 600 }}>Tất cả đều ổn! Không có cảnh báo nào.</p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default AdminDashboardPage;
