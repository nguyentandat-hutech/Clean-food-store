import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { getInventoryReportAPI, getExpiringBatchesAPI } from '../api/batchService';

const fmt = (n) => n?.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' }) ?? '—';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

function InventoryReportPage() {
    const [report, setReport] = useState([]);
    const [loadingReport, setLoadingReport] = useState(false);
    const [expiringBatches, setExpiringBatches] = useState([]);
    const [loadingExpiring, setLoadingExpiring] = useState(false);
    const [warningDays, setWarningDays] = useState(7);

    const fetchReport = useCallback(async () => {
        setLoadingReport(true);
        try { const d = await getInventoryReportAPI(); setReport(d.report || []); }
        catch { toast.error('Không thể tải báo cáo tồn kho'); }
        finally { setLoadingReport(false); }
    }, []);

    const fetchExpiringBatches = useCallback(async () => {
        setLoadingExpiring(true);
        try { const d = await getExpiringBatchesAPI(warningDays); setExpiringBatches(d.batches || []); }
        catch { toast.error('Không thể tải danh sách lô sắp hết hạn'); }
        finally { setLoadingExpiring(false); }
    }, [warningDays]);

    useEffect(() => { fetchReport(); }, [fetchReport]);
    useEffect(() => { fetchExpiringBatches(); }, [fetchExpiringBatches]);

    const daysUntilExpiry = (d) => Math.ceil((new Date(d) - new Date()) / (1000 * 60 * 60 * 24));

    const outOfStock = report.filter(r => r.effectiveStock === 0).length;
    const inStock = report.filter(r => r.effectiveStock > 0).length;

    return (
        <div style={{ background: 'var(--c-bg)', minHeight: '100vh' }}>
            <div className="admin-header">
                <div className="admin-header-inner">
                    <h1 className="admin-title">📊 Báo cáo Tồn kho</h1>
                </div>
            </div>
            <div className="admin-content">
                {/* ── Summary cards ── */}
                {!loadingReport && report.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
                        {[
                            { label: 'Tổng sản phẩm', value: report.length, color: 'var(--c-primary)' },
                            { label: 'Còn hàng', value: inStock, color: '#2e7d32' },
                            { label: 'Hết hàng', value: outOfStock, color: 'var(--c-danger)' },
                            { label: 'Lô sắp hết hạn', value: expiringBatches.length, color: '#f57c00' },
                        ].map(s => (
                            <div key={s.label} className="card" style={{ textAlign: 'center', padding: 16 }}>
                                <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
                                <div style={{ fontSize: 13, color: 'var(--t-muted)' }}>{s.label}</div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Inventory table ── */}
                <div className="card" style={{ marginBottom: 28 }}>
                    <div className="card-header">
                        <h3 style={{ margin: 0 }}>🏬 Tồn kho thực tế theo Sản phẩm</h3>
                        <small style={{ color: 'var(--t-muted)' }}>Tính từ các lô hàng còn hạn sử dụng</small>
                    </div>
                    <div className="card-body" style={{ padding: 0 }}>
                        {loadingReport ? (
                            <div className="loading-wrap"><div className="spinner" /><p className="loading-text">Đang tải...</p></div>
                        ) : (
                            <div className="table-wrap" style={{ marginBottom: 0 }}>
                                <table className="table">
                                    <thead><tr>
                                        <th>#</th><th>Sản phẩm</th><th>Danh mục</th><th>Trang trại</th><th>Đơn giá</th><th>ĐVT</th><th className="table-center">Tồn kho</th><th className="table-center">Số lô</th><th>HH gần nhất</th>
                                    </tr></thead>
                                    <tbody>
                                        {report.length === 0 ? (
                                            <tr><td colSpan={9}><div className="empty-state" style={{ padding: '20px 0' }}><div className="empty-state-icon">📦</div><p>Chưa có dữ liệu tồn kho.</p></div></td></tr>
                                        ) : report.map((item, i) => (
                                            <tr key={item.product._id} style={item.effectiveStock === 0 ? { background: 'rgba(198,40,40,0.04)' } : {}}>
                                                <td>{i + 1}</td>
                                                <td><strong>{item.product.name}</strong></td>
                                                <td>{item.product.category?.name || '—'}</td>
                                                <td>{item.product.farm?.name || '—'}</td>
                                                <td>{fmt(item.product.price)}</td>
                                                <td>{item.product.unit}</td>
                                                <td className="table-center">
                                                    <strong style={{ color: item.effectiveStock === 0 ? 'var(--c-danger)' : 'var(--c-primary)', fontSize: 15 }}>
                                                        {item.effectiveStock}
                                                    </strong>
                                                    {item.effectiveStock === 0 && <span className="badge badge-red" style={{ marginLeft: 6 }}>Hết</span>}
                                                </td>
                                                <td className="table-center">{item.totalBatches}</td>
                                                <td>{fmtDate(item.nearestExpiry)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Expiring batches ── */}
                <div className="card">
                    <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                        <div>
                            <h3 style={{ margin: 0 }}>⚠️ Lô hàng sắp hết hạn</h3>
                        </div>
                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <label style={{ fontSize: 13, color: 'var(--t-body)' }}>Cảnh báo trong:</label>
                            <select className="form-control" style={{ width: 'auto' }} value={warningDays} onChange={e => setWarningDays(Number(e.target.value))}>
                                {[3, 7, 14, 30].map(d => <option key={d} value={d}>{d} ngày</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="card-body" style={{ padding: 0 }}>
                        {loadingExpiring ? (
                            <div className="loading-wrap"><div className="spinner" /><p className="loading-text">Đang tải...</p></div>
                        ) : expiringBatches.length === 0 ? (
                            <div className="empty-state" style={{ padding: '24px 0' }}>
                                <div className="empty-state-icon">✅</div>
                                <p style={{ color: 'var(--c-primary)' }}>Không có lô nào sắp hết hạn trong {warningDays} ngày tới.</p>
                            </div>
                        ) : (
                            <div className="table-wrap" style={{ marginBottom: 0 }}>
                                <table className="table">
                                    <thead><tr>
                                        <th>#</th><th>Mã lô</th><th>Sản phẩm</th><th className="table-center">Số lượng</th><th>Ngày hết hạn</th><th className="table-center">Còn lại</th>
                                    </tr></thead>
                                    <tbody>
                                        {expiringBatches.map((b, i) => {
                                            const days = daysUntilExpiry(b.expiryDate);
                                            return (
                                                <tr key={b._id} style={days <= 3 ? { background: 'rgba(198,40,40,0.05)' } : {}}>
                                                    <td>{i + 1}</td>
                                                    <td><strong>{b.batchNumber}</strong></td>
                                                    <td>{b.product?.name || '—'}</td>
                                                    <td className="table-center">{b.quantity} {b.product?.unit || ''}</td>
                                                    <td>{fmtDate(b.expiryDate)}</td>
                                                    <td className="table-center">
                                                        <span className={`badge ${days <= 3 ? 'badge-red' : days <= 7 ? 'badge-orange' : 'badge-blue'}`}>
                                                            {days} ngày
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default InventoryReportPage;
