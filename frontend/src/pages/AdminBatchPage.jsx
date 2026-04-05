import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { getAllBatchesAPI, createBatchAPI, updateBatchAPI, deleteBatchAPI } from '../api/batchService';
import { getAllProductsAPI } from '../api/productService';

const EMPTY = { product: '', batchNumber: '', quantity: '', manufacturingDate: '', expiryDate: '' };
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

function AdminBatchPage() {
    const [batches, setBatches] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState(EMPTY);
    const [editingId, setEditingId] = useState(null);

    const fetchProducts = useCallback(async () => {
        try { const data = await getAllProductsAPI({ limit: 100 }); setProducts(data.products || []); }
        catch { toast.error('Không thể tải sản phẩm'); }
    }, []);

    const fetchBatches = useCallback(async (page = 1) => {
        setLoading(true);
        try { const data = await getAllBatchesAPI({ page, limit: 20 }); setBatches(data.batches || []); setPagination(data.pagination || { page: 1, totalPages: 1 }); }
        catch { toast.error('Không thể tải lô hàng'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchProducts(); fetchBatches(); }, [fetchProducts, fetchBatches]);

    const handleChange = (e) => { const { name, value } = e.target; setFormData(p => ({ ...p, [name]: value })); };

    const resetForm = () => { setFormData(EMPTY); setEditingId(null); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.product) { toast.warn('Chọn sản phẩm'); return; }
        if (!formData.batchNumber.trim()) { toast.warn('Nhập mã lô'); return; }
        if (!formData.quantity || Number(formData.quantity) < 1) { toast.warn('Số lượng phải > 0'); return; }
        if (!formData.manufacturingDate) { toast.warn('Chọn ngày sản xuất'); return; }
        if (!formData.expiryDate) { toast.warn('Chọn ngày hết hạn'); return; }
        try {
            const payload = { ...formData, quantity: Number(formData.quantity) };
            if (editingId) { await updateBatchAPI(editingId, payload); toast.success('Cập nhật lô hàng thành công!'); }
            else { await createBatchAPI(payload); toast.success('Nhập lô hàng mới thành công!'); }
            resetForm(); fetchBatches(pagination.page);
        } catch (err) { toast.error(err.response?.data?.message || 'Thao tác thất bại'); }
    };

    const handleEdit = (batch) => {
        setEditingId(batch._id);
        setFormData({
            product: batch.product?._id || batch.product,
            batchNumber: batch.batchNumber,
            quantity: String(batch.quantity),
            manufacturingDate: batch.manufacturingDate ? new Date(batch.manufacturingDate).toISOString().split('T')[0] : '',
            expiryDate: batch.expiryDate ? new Date(batch.expiryDate).toISOString().split('T')[0] : '',
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id, batchNumber) => {
        if (!window.confirm(`Xóa lô "${batchNumber}"?`)) return;
        try { await deleteBatchAPI(id); toast.success(`Đã xóa lô "${batchNumber}"`); fetchBatches(pagination.page); }
        catch (err) { toast.error(err.response?.data?.message || 'Xóa lô thất bại'); }
    };

    const isExpired = (d) => new Date(d) <= new Date();

    return (
        <div style={{ background: 'var(--c-bg)', minHeight: '100vh' }}>
            <div className="admin-header">
                <div className="admin-header-inner">
                    <h1 className="admin-title">📋 Quản lý Lô hàng</h1>
                </div>
            </div>
            <div className="admin-content">
                {/* ── Inline form ─────────────────────────────── */}
                <div className="card" style={{ marginBottom: 24 }}>
                    <div className="card-header">
                        <h3 style={{ margin: 0 }}>{editingId ? '✏️ Cập nhật lô hàng' : '➕ Nhập lô hàng mới'}</h3>
                    </div>
                    <div className="card-body">
                        <form onSubmit={handleSubmit}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                                <div className="form-row">
                                    <label className="form-label">Sản phẩm *</label>
                                    <select className="form-control" name="product" value={formData.product} onChange={handleChange} disabled={!!editingId}>
                                        <option value="">-- Chọn sản phẩm --</option>
                                        {products.map(p => <option key={p._id} value={p._id}>{p.name} ({p.unit})</option>)}
                                    </select>
                                </div>
                                <div className="form-row">
                                    <label className="form-label">Mã lô hàng *</label>
                                    <input className="form-control" name="batchNumber" value={formData.batchNumber} onChange={handleChange} placeholder="VD: LOT-2024-001" />
                                </div>
                                <div className="form-row">
                                    <label className="form-label">Số lượng *</label>
                                    <input className="form-control" type="number" name="quantity" value={formData.quantity} onChange={handleChange} min={1} placeholder="VD: 100" />
                                </div>
                                <div className="form-row">
                                    <label className="form-label">Ngày sản xuất *</label>
                                    <input className="form-control" type="date" name="manufacturingDate" value={formData.manufacturingDate} onChange={handleChange} />
                                </div>
                                <div className="form-row">
                                    <label className="form-label">Ngày hết hạn *</label>
                                    <input className="form-control" type="date" name="expiryDate" value={formData.expiryDate} onChange={handleChange} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                                <button type="submit" className="btn btn-primary">{editingId ? 'Cập nhật' : 'Nhập lô'}</button>
                                {editingId && <button type="button" className="btn btn-ghost" onClick={resetForm}>Hủy</button>}
                            </div>
                        </form>
                    </div>
                </div>

                {/* ── Table ────────────────────────────────────── */}
                {loading ? (
                    <div className="loading-wrap"><div className="spinner" /><p className="loading-text">Đang tải...</p></div>
                ) : (
                    <>
                        <div className="table-wrap">
                            <table className="table">
                                <thead><tr>
                                    <th>#</th><th>Mã lô</th><th>Sản phẩm</th><th>Số lượng</th><th>Ngày SX</th><th>Hết hạn</th><th>Tình trạng</th><th className="table-center">Hành động</th>
                                </tr></thead>
                                <tbody>
                                    {batches.length === 0 ? (
                                        <tr><td colSpan={8}><div className="empty-state" style={{ padding: '20px 0' }}><div className="empty-state-icon">📋</div><p>Chưa có lô hàng nào.</p></div></td></tr>
                                    ) : batches.map((b, idx) => (
                                        <tr key={b._id} style={isExpired(b.expiryDate) ? { background: 'rgba(198,40,40,0.04)' } : {}}>
                                            <td>{(pagination.page - 1) * 20 + idx + 1}</td>
                                            <td><strong>{b.batchNumber}</strong></td>
                                            <td>{b.product?.name || '—'}</td>
                                            <td>{b.quantity} {b.product?.unit || ''}</td>
                                            <td>{fmtDate(b.manufacturingDate)}</td>
                                            <td>{fmtDate(b.expiryDate)}</td>
                                            <td>{isExpired(b.expiryDate) ? <span className="badge badge-red">Hết hạn</span> : <span className="badge badge-green">Còn hạn</span>}</td>
                                            <td className="table-center">
                                                <button className="btn btn-secondary btn-sm" style={{ marginRight: 6 }} onClick={() => handleEdit(b)}>✏️ Sửa</button>
                                                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(b._id, b.batchNumber)}>🗑️ Xóa</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {pagination.totalPages > 1 && (
                            <div className="pagination">
                                <button className="page-btn" onClick={() => fetchBatches(pagination.page - 1)} disabled={pagination.page === 1}>‹</button>
                                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
                                    <button key={p} className={`page-btn ${p === pagination.page ? 'active' : ''}`} onClick={() => fetchBatches(p)}>{p}</button>
                                ))}
                                <button className="page-btn" onClick={() => fetchBatches(pagination.page + 1)} disabled={pagination.page === pagination.totalPages}>›</button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default AdminBatchPage;
