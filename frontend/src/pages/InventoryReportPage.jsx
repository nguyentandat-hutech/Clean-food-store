import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { getInventoryReportAPI, getExpiringBatchesAPI } from '../api/batchService';

// ── Trang Báo cáo Tồn kho (Admin) ──────────────────────────────
// Hiển thị: Bảng sản phẩm + tồn kho thực tế, Bảng cảnh báo lô sắp hết hạn
function InventoryReportPage() {
    // State báo cáo tồn kho
    const [report, setReport] = useState([]);
    const [loadingReport, setLoadingReport] = useState(false);

    // State lô sắp hết hạn
    const [expiringBatches, setExpiringBatches] = useState([]);
    const [loadingExpiring, setLoadingExpiring] = useState(false);

    // Số ngày cảnh báo (mặc định 7)
    const [warningDays, setWarningDays] = useState(7);

    // ── Lấy báo cáo tồn kho ────────────────────────────────────
    const fetchReport = useCallback(async () => {
        setLoadingReport(true);
        try {
            const data = await getInventoryReportAPI();
            setReport(data.report || []);
        } catch (err) {
            toast.error('Không thể tải báo cáo tồn kho');
            console.error(err);
        } finally {
            setLoadingReport(false);
        }
    }, []);

    // ── Lấy lô sắp hết hạn ─────────────────────────────────────
    const fetchExpiringBatches = useCallback(async () => {
        setLoadingExpiring(true);
        try {
            const data = await getExpiringBatchesAPI(warningDays);
            setExpiringBatches(data.batches || []);
        } catch (err) {
            toast.error('Không thể tải danh sách lô sắp hết hạn');
            console.error(err);
        } finally {
            setLoadingExpiring(false);
        }
    }, [warningDays]);

    // Load dữ liệu khi mount hoặc khi thay đổi warningDays
    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    useEffect(() => {
        fetchExpiringBatches();
    }, [fetchExpiringBatches]);

    // ── Format ngày hiển thị ────────────────────────────────────
    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('vi-VN');
    };

    // ── Tính số ngày còn lại đến hết hạn ───────────────────────
    const daysUntilExpiry = (expiryDate) => {
        const now = new Date();
        const exp = new Date(expiryDate);
        const diffMs = exp - now;
        return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    };

    return (
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: 20 }}>
            <h1>📊 Báo cáo Tồn kho</h1>

            {/* ── BẢNG TỒN KHO THỰC TẾ ─────────────────────────── */}
            <div style={{ marginBottom: 40 }}>
                <h2>🏬 Tồn kho thực tế theo Sản phẩm</h2>
                <p style={{ color: '#666', fontSize: 13 }}>
                    Tồn kho thực tế = Tổng số lượng từ các lô hàng <strong>CÒN HẠN SỬ DỤNG</strong>.
                    Các lô hết hạn không được tính vào kho bán.
                </p>

                {loadingReport ? (
                    <p>Đang tải báo cáo...</p>
                ) : report.length === 0 ? (
                    <p>Chưa có dữ liệu sản phẩm.</p>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                        <thead>
                            <tr style={{ background: '#2c3e50', color: '#fff' }}>
                                <th style={thStyle}>#</th>
                                <th style={thStyle}>Sản phẩm</th>
                                <th style={thStyle}>Danh mục</th>
                                <th style={thStyle}>Trang trại</th>
                                <th style={thStyle}>Đơn giá</th>
                                <th style={thStyle}>Đơn vị</th>
                                <th style={thStyle}>Tồn kho</th>
                                <th style={thStyle}>Số lô còn hạn</th>
                                <th style={thStyle}>HH gần nhất</th>
                            </tr>
                        </thead>
                        <tbody>
                            {report.map((item, index) => (
                                <tr
                                    key={item.product._id}
                                    style={{
                                        background: item.effectiveStock === 0 ? '#fff3cd' : '#fff',
                                    }}
                                >
                                    <td style={tdStyle}>{index + 1}</td>
                                    <td style={tdStyle}><strong>{item.product.name}</strong></td>
                                    <td style={tdStyle}>{item.product.category?.name || '—'}</td>
                                    <td style={tdStyle}>{item.product.farm?.name || '—'}</td>
                                    <td style={tdStyle}>{item.product.price?.toLocaleString('vi-VN')}đ</td>
                                    <td style={tdStyle}>{item.product.unit}</td>
                                    <td style={{
                                        ...tdStyle,
                                        fontWeight: 'bold',
                                        color: item.effectiveStock === 0 ? '#d9534f' : '#5cb85c',
                                        fontSize: 16,
                                    }}>
                                        {item.effectiveStock}
                                    </td>
                                    <td style={tdStyle}>{item.totalBatches}</td>
                                    <td style={tdStyle}>{formatDate(item.nearestExpiry)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {/* Tổng kết */}
                {!loadingReport && report.length > 0 && (
                    <div style={{ marginTop: 12, fontSize: 13, color: '#555' }}>
                        <strong>Tổng sản phẩm:</strong> {report.length} |{' '}
                        <strong>Hết hàng:</strong>{' '}
                        <span style={{ color: '#d9534f' }}>
                            {report.filter((r) => r.effectiveStock === 0).length}
                        </span> |{' '}
                        <strong>Còn hàng:</strong>{' '}
                        <span style={{ color: '#5cb85c' }}>
                            {report.filter((r) => r.effectiveStock > 0).length}
                        </span>
                    </div>
                )}
            </div>

            {/* ── BẢNG CẢNH BÁO LÔ SẮP HẾT HẠN ───────────────── */}
            <div>
                <h2>⚠️ Cảnh báo Lô hàng sắp hết hạn</h2>

                {/* Chọn số ngày cảnh báo */}
                <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <label><strong>Cảnh báo trong vòng:</strong></label>
                    <select
                        value={warningDays}
                        onChange={(e) => setWarningDays(Number(e.target.value))}
                        style={{ padding: 6, fontSize: 14 }}
                    >
                        <option value={3}>3 ngày</option>
                        <option value={7}>7 ngày</option>
                        <option value={14}>14 ngày</option>
                        <option value={30}>30 ngày</option>
                    </select>
                </div>

                {loadingExpiring ? (
                    <p>Đang tải...</p>
                ) : expiringBatches.length === 0 ? (
                    <p style={{ color: 'green' }}>
                        ✅ Không có lô hàng nào sắp hết hạn trong {warningDays} ngày tới.
                    </p>
                ) : (
                    <>
                        <p style={{ color: '#d9534f', fontWeight: 'bold' }}>
                            🔔 Có {expiringBatches.length} lô hàng sắp hết hạn!
                        </p>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                            <thead>
                                <tr style={{ background: '#d9534f', color: '#fff' }}>
                                    <th style={thStyle}>#</th>
                                    <th style={thStyle}>Mã lô</th>
                                    <th style={thStyle}>Sản phẩm</th>
                                    <th style={thStyle}>Số lượng còn</th>
                                    <th style={thStyle}>Ngày hết hạn</th>
                                    <th style={thStyle}>Còn lại</th>
                                </tr>
                            </thead>
                            <tbody>
                                {expiringBatches.map((batch, index) => {
                                    const remainDays = daysUntilExpiry(batch.expiryDate);
                                    return (
                                        <tr
                                            key={batch._id}
                                            style={{
                                                background: remainDays <= 3 ? '#ffe6e6' : '#fff8e1',
                                            }}
                                        >
                                            <td style={tdStyle}>{index + 1}</td>
                                            <td style={tdStyle}><strong>{batch.batchNumber}</strong></td>
                                            <td style={tdStyle}>{batch.product?.name || 'N/A'}</td>
                                            <td style={tdStyle}>{batch.quantity} {batch.product?.unit || ''}</td>
                                            <td style={tdStyle}>{formatDate(batch.expiryDate)}</td>
                                            <td style={{
                                                ...tdStyle,
                                                fontWeight: 'bold',
                                                color: remainDays <= 3 ? '#d9534f' : '#f0ad4e',
                                            }}>
                                                {remainDays} ngày
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </>
                )}
            </div>
        </div>
    );
}

// ── Style dùng chung cho bảng ───────────────────────────────────
const thStyle = { padding: '10px 8px', textAlign: 'left', borderBottom: '2px solid rgba(255,255,255,0.3)' };
const tdStyle = { padding: '8px', borderBottom: '1px solid #eee' };

export default InventoryReportPage;
