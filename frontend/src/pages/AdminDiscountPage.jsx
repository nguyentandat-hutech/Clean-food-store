import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { getAllDiscountsAPI, createDiscountAPI, updateDiscountAPI, deleteDiscountAPI } from '../api/discountService';

const LIMIT = 10;
const EMPTY = { code: '', type: 'percentage', value: '', minOrderAmount: '', maxUses: '', expiryDate: '', isActive: true };

const fmt = (n) => n?.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' }) ?? '—';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

function AdminDiscountPage() {
    const [discounts, setDiscounts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState(EMPTY);
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    const fetchDiscounts = useCallback(async (p = 1) => {
        setLoading(true);
        try { const data = await getAllDiscountsAPI({ page: p, limit: LIMIT }); setDiscounts(data.discounts || []); setTotalPages(data.pagination?.totalPages || 1); }
        catch { toast.error('Không thể tải mã giảm giá'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchDiscounts(page); }, [fetchDiscounts, page]);

    const openCreate = () => { setFormData(EMPTY); setEditingId(null); setFormError(''); setShowModal(true); };

    const openEdit = (d) => {
        setEditingId(d._id);
        setFormData({
            code: d.code,
            type: d.type,
            value: String(d.value),
            minOrderAmount: d.minOrderAmount ? String(d.minOrderAmount) : '',
            maxUses: d.maxUses != null ? String(d.maxUses) : '',
            expiryDate: d.expiryDate ? new Date(d.expiryDate).toISOString().split('T')[0] : '',
            isActive: d.isActive,
        });
        setFormError('');
        setShowModal(true);
    };

    const closeModal = () => { setShowModal(false); setEditingId(null); };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(p => ({ ...p, [name]: type === 'checkbox' ? checked : (name === 'code' ? value.toUpperCase() : value) }));
    };

    const handleSave = async () => {
        const { code, type, value, minOrderAmount, maxUses, expiryDate, isActive } = formData;
        if (!code.trim()) { setFormError('Nhập mã giảm giá'); return; }
        if (!value || Number(value) <= 0) { setFormError('Giá trị phải > 0'); return; }
        if (type === 'percentage' && Number(value) > 100) { setFormError('Phần trăm không được vượt 100%'); return; }
        setFormError(''); setSaving(true);
        try {
            const payload = {
                code: code.trim(), type,
                value: Number(value),
                minOrderAmount: minOrderAmount ? Number(minOrderAmount) : 0,
                maxUses: maxUses ? Number(maxUses) : null,
                expiryDate: expiryDate || undefined,
                isActive,
            };
            if (editingId) { await updateDiscountAPI(editingId, payload); toast.success('Cập nhật mã thành công!'); }
            else { await createDiscountAPI(payload); toast.success('Tạo mã giảm giá thành công!'); }
            closeModal(); fetchDiscounts(page);
        } catch (err) { setFormError(err.response?.data?.message || 'Thao tác thất bại'); }
        finally { setSaving(false); }
    };

    const handleToggleActive = async (d) => {
        try { await updateDiscountAPI(d._id, { isActive: !d.isActive }); fetchDiscounts(page); }
        catch { toast.error('Không thể cập nhật trạng thái'); }
    };

    const handleDelete = async (id) => {
        try { await deleteDiscountAPI(id); toast.success('Đã xóa mã giảm giá'); setDeletingId(null); fetchDiscounts(page); }
        catch (err) { toast.error(err.response?.data?.message || 'Xóa thất bại'); setDeletingId(null); }
    };

    return (
        <div style={{ background: 'var(--c-bg)', minHeight: '100vh' }}>
            <div className="admin-header">
                <div className="admin-header-inner">
                    <h1 className="admin-title">🏷️ Quản lý Mã giảm giá</h1>
                    <button className="btn btn-primary" onClick={openCreate}>+ Tạo mã mới</button>
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
                                    <th>Mã</th><th>Loại</th><th>Giá trị</th><th>Đơn tối thiểu</th><th>Đã dùng / Tối đa</th><th>Hết hạn</th><th>Trạng thái</th><th className="table-center">Hành động</th>
                                </tr></thead>
                                <tbody>
                                    {discounts.length === 0 ? (
                                        <tr><td colSpan={8}><div className="empty-state" style={{ padding: '20px 0' }}><div className="empty-state-icon">🏷️</div><p>Chưa có mã giảm giá nào.</p></div></td></tr>
                                    ) : discounts.map(d => (
                                        <tr key={d._id}>
                                            <td><strong>{d.code}</strong></td>
                                            <td><span className={`badge ${d.type === 'percentage' ? 'badge-blue' : 'badge-purple'}`}>{d.type === 'percentage' ? 'Phần trăm' : 'Cố định'}</span></td>
                                            <td>{d.type === 'percentage' ? `${d.value}%` : fmt(d.value)}</td>
                                            <td>{d.minOrderAmount ? fmt(d.minOrderAmount) : '—'}</td>
                                            <td>{(d.usedCount ?? 0)} / {d.maxUses ?? '∞'}</td>
                                            <td>{fmtDate(d.expiryDate)}</td>
                                            <td>
                                                <button
                                                    className={`badge ${d.isActive ? 'badge-green' : 'badge-gray'}`}
                                                    style={{ cursor: 'pointer', border: 'none', background: 'none' }}
                                                    onClick={() => handleToggleActive(d)}
                                                    title="Nhấn để bật/tắt"
                                                >
                                                    {d.isActive ? '✅ Hoạt động' : '⛔ Tắt'}
                                                </button>
                                            </td>
                                            <td className="table-center">
                                                <button className="btn btn-secondary btn-sm" style={{ marginRight: 6 }} onClick={() => openEdit(d)}>✏️ Sửa</button>
                                                {deletingId === d._id ? (
                                                    <>
                                                        <button className="btn btn-danger btn-sm" style={{ marginRight: 4 }} onClick={() => handleDelete(d._id)}>Xác nhận</button>
                                                        <button className="btn btn-ghost btn-sm" onClick={() => setDeletingId(null)}>Hủy</button>
                                                    </>
                                                ) : (
                                                    <button className="btn btn-danger btn-sm" onClick={() => setDeletingId(d._id)}>🗑️ Xóa</button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {totalPages > 1 && (
                            <div className="pagination">
                                <button className="page-btn" onClick={() => setPage(p => p - 1)} disabled={page === 1}>‹</button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                    <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                                ))}
                                <button className="page-btn" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>›</button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ── Modal ──────────────────────────────────────── */}
            {showModal && (
                <div className="modal-backdrop" onClick={closeModal}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
                        <h3 style={{ marginTop: 0 }}>{editingId ? '✏️ Cập nhật mã giảm giá' : '➕ Tạo mã giảm giá'}</h3>
                        <div className="form-row">
                            <label className="form-label">Mã giảm giá *</label>
                            <input className="form-control" name="code" value={formData.code} onChange={handleChange} placeholder="VD: SUMMER20" disabled={!!editingId} />
                        </div>
                        <div className="form-row">
                            <label className="form-label">Loại giảm giá *</label>
                            <select className="form-control" name="type" value={formData.type} onChange={handleChange}>
                                <option value="percentage">Phần trăm (%)</option>
                                <option value="fixed">Cố định (VND)</option>
                            </select>
                        </div>
                        <div className="form-row">
                            <label className="form-label">Giá trị * {formData.type === 'percentage' ? '(%)' : '(VND)'}</label>
                            <input className="form-control" type="number" name="value" value={formData.value} onChange={handleChange} min={1} max={formData.type === 'percentage' ? 100 : undefined} />
                        </div>
                        <div className="form-row">
                            <label className="form-label">Đơn hàng tối thiểu (VND)</label>
                            <input className="form-control" type="number" name="minOrderAmount" value={formData.minOrderAmount} onChange={handleChange} min={0} placeholder="Để trống nếu không giới hạn" />
                        </div>
                        <div className="form-row">
                            <label className="form-label">Số lần dùng tối đa</label>
                            <input className="form-control" type="number" name="maxUses" value={formData.maxUses} onChange={handleChange} min={1} placeholder="Để trống = không giới hạn" />
                        </div>
                        <div className="form-row">
                            <label className="form-label">Ngày hết hạn</label>
                            <input className="form-control" type="date" name="expiryDate" value={formData.expiryDate} onChange={handleChange} />
                        </div>
                        <div className="form-row" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <input type="checkbox" id="isActive" name="isActive" checked={formData.isActive} onChange={handleChange} />
                            <label htmlFor="isActive" className="form-label" style={{ margin: 0 }}>Kích hoạt mã</label>
                        </div>
                        {formError && <div className="alert alert-danger" style={{ marginTop: 8 }}>{formError}</div>}
                        <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
                            <button className="btn btn-ghost" onClick={closeModal}>Hủy</button>
                            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminDiscountPage;
