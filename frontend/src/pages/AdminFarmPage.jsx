import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { getAllFarmsAPI, createFarmAPI, updateFarmAPI, deleteFarmAPI } from '../api/farmService';

const CERT_OPTIONS = ['VietGAP', 'Organic', 'GlobalGAP', 'Khác'];
const EMPTY = { name: '', location: '', description: '', contact: '', certificate: 'VietGAP', isActive: true };

function AdminFarmPage() {
    const [farms, setFarms] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingFarm, setEditingFarm] = useState(null);
    const [formData, setFormData] = useState(EMPTY);
    const [formError, setFormError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchFarms = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const result = await getAllFarmsAPI({ page, limit: 10 });
            setFarms(result.farms);
            setPagination(result.pagination);
        } catch (e) { toast.error(e.response?.data?.message || 'Lỗi tải trang trại'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchFarms(); }, [fetchFarms]);

    const handleOpenAdd = () => { setEditingFarm(null); setFormData(EMPTY); setFormError(''); setShowModal(true); };
    const handleOpenEdit = (farm) => {
        setEditingFarm(farm);
        setFormData({ name: farm.name || '', location: farm.location || '', description: farm.description || '', contact: farm.contact || '', certificate: farm.certificate || 'VietGAP', isActive: farm.isActive !== undefined ? farm.isActive : true });
        setFormError(''); setShowModal(true);
    };
    const handleClose = () => { setShowModal(false); setEditingFarm(null); setFormData(EMPTY); setFormError(''); };
    const handleChange = (e) => { const { name, value, type, checked } = e.target; setFormData(p => ({ ...p, [name]: type === 'checkbox' ? checked : value })); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) { setFormError('Tên trang trại là bắt buộc'); return; }
        setSubmitting(true); setFormError('');
        try {
            if (editingFarm) { await updateFarmAPI(editingFarm._id, formData); toast.success('Cập nhật trang trại thành công!'); }
            else { await createFarmAPI(formData); toast.success('Thêm trang trại thành công!'); }
            handleClose(); fetchFarms(pagination.page);
        } catch (e) { setFormError(e.response?.data?.message || 'Có lỗi xảy ra'); }
        finally { setSubmitting(false); }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Xóa trang trại "${name}"?`)) return;
        try { await deleteFarmAPI(id); toast.success(`Đã xóa "${name}"`); fetchFarms(pagination.page); }
        catch (e) { toast.error(e.response?.data?.message || 'Lỗi khi xóa'); }
    };

    return (
        <div style={{ background: 'var(--c-bg)', minHeight: '100vh' }}>
            <div className="admin-header">
                <div className="admin-header-inner">
                    <h1 className="admin-title">🌱 Quản lý Trang trại</h1>
                    <button className="btn btn-primary btn-sm" onClick={handleOpenAdd}>+ Thêm trang trại</button>
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
                                    <th>#</th><th>Tên trang trại</th><th>Địa chỉ</th><th>Liên hệ</th><th>Chứng nhận</th><th>Trạng thái</th><th className="table-center">Hành động</th>
                                </tr></thead>
                                <tbody>
                                    {farms.length === 0 ? (
                                        <tr><td colSpan={7}><div className="empty-state" style={{ padding: '20px 0' }}><div className="empty-state-icon">🌱</div><p>Chưa có trang trại nào.</p></div></td></tr>
                                    ) : farms.map((farm, idx) => (
                                        <tr key={farm._id}>
                                            <td>{(pagination.page - 1) * 10 + idx + 1}</td>
                                            <td><strong>{farm.name}</strong>{farm.description && <div style={{ fontSize: 12, color: 'var(--t-muted)', marginTop: 2 }}>{farm.description.slice(0, 50)}{farm.description.length > 50 ? '...' : ''}</div>}</td>
                                            <td>{farm.location || '—'}</td>
                                            <td>{farm.contact || '—'}</td>
                                            <td><span className="badge badge-orange">{farm.certificate}</span></td>
                                            <td><span className={`badge ${farm.isActive ? 'badge-green' : 'badge-gray'}`}>{farm.isActive ? 'Hoạt động' : 'Ẩn'}</span></td>
                                            <td className="table-center">
                                                <button className="btn btn-secondary btn-sm" style={{ marginRight: 6 }} onClick={() => handleOpenEdit(farm)}>✏️ Sửa</button>
                                                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(farm._id, farm.name)}>🗑️ Xóa</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {pagination.totalPages > 1 && (
                            <div className="pagination">
                                <button className="page-btn" onClick={() => fetchFarms(pagination.page - 1)} disabled={pagination.page === 1}>‹</button>
                                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
                                    <button key={p} className={`page-btn ${p === pagination.page ? 'active' : ''}`} onClick={() => fetchFarms(p)}>{p}</button>
                                ))}
                                <button className="page-btn" onClick={() => fetchFarms(pagination.page + 1)} disabled={pagination.page === pagination.totalPages}>›</button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {showModal && (
                <div className="modal-backdrop" onClick={handleClose}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h3 style={{ margin: 0 }}>{editingFarm ? '✏️ Sửa trang trại' : '+ Thêm trang trại'}</h3>
                            <button className="btn btn-ghost btn-sm" onClick={handleClose}>✕</button>
                        </div>
                        {formError && <div className="alert alert-danger" style={{ marginBottom: 14 }}>{formError}</div>}
                        <form onSubmit={handleSubmit}>
                            <div className="form-row">
                                <label className="form-label">Tên trang trại <span style={{ color: 'var(--c-danger)' }}>*</span></label>
                                <input className="form-control" name="name" value={formData.name} onChange={handleChange} placeholder="VD: Trang trại Xanh Sach" required />
                            </div>
                            <div className="form-row">
                                <label className="form-label">Địa chỉ</label>
                                <input className="form-control" name="location" value={formData.location} onChange={handleChange} placeholder="VD: Đà Lạt, Lâm Đồng" />
                            </div>
                            <div className="form-row">
                                <label className="form-label">Liên hệ</label>
                                <input className="form-control" name="contact" value={formData.contact} onChange={handleChange} placeholder="SĐT hoặc email" />
                            </div>
                            <div className="form-row">
                                <label className="form-label">Chứng nhận</label>
                                <select className="form-control" name="certificate" value={formData.certificate} onChange={handleChange}>
                                    {CERT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                            </div>
                            <div className="form-row">
                                <label className="form-label">Mô tả</label>
                                <textarea className="form-control" name="description" value={formData.description} onChange={handleChange} rows={3} placeholder="Mô tả trang trại..." />
                            </div>
                            <div className="form-row" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <input type="checkbox" name="isActive" id="isActive" checked={formData.isActive} onChange={handleChange} />
                                <label htmlFor="isActive" className="form-label" style={{ margin: 0 }}>Đang hoạt động</label>
                            </div>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                                <button type="button" className="btn btn-ghost" onClick={handleClose}>Hủy</button>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Đang lưu...' : editingFarm ? 'Cập nhật' : 'Thêm mới'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminFarmPage;
