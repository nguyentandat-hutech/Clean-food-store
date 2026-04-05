import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import {
    getAllCategoriesAPI, createCategoryAPI, updateCategoryAPI, deleteCategoryAPI,
} from '../api/categoryService';

const EMPTY = { name: '', description: '', image: '' };

function AdminCategoryPage() {
    const [categories, setCategories] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [formData, setFormData] = useState(EMPTY);
    const [formError, setFormError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchCategories = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const result = await getAllCategoriesAPI({ page, limit: 10 });
            setCategories(result.categories);
            setPagination(result.pagination);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi tải danh mục');
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchCategories(); }, [fetchCategories]);

    const handleOpenAdd = () => { setEditingCategory(null); setFormData(EMPTY); setFormError(''); setShowModal(true); };
    const handleOpenEdit = (cat) => { setEditingCategory(cat); setFormData({ name: cat.name || '', description: cat.description || '', image: cat.image || '' }); setFormError(''); setShowModal(true); };
    const handleClose = () => { setShowModal(false); setEditingCategory(null); setFormData(EMPTY); setFormError(''); };
    const handleChange = (e) => { const { name, value } = e.target; setFormData(p => ({ ...p, [name]: value })); setFormError(''); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim() || formData.name.trim().length < 2) { setFormError('Tên phải có ít nhất 2 ký tự'); return; }
        setSubmitting(true); setFormError('');
        try {
            if (editingCategory) { await updateCategoryAPI(editingCategory._id, formData); toast.success('Cập nhật danh mục thành công!'); }
            else { await createCategoryAPI(formData); toast.success('Thêm danh mục thành công!'); }
            handleClose(); fetchCategories(pagination.page);
        } catch (error) { setFormError(error.response?.data?.message || 'Có lỗi xảy ra'); }
        finally { setSubmitting(false); }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Xóa danh mục "${name}"?`)) return;
        try { await deleteCategoryAPI(id); toast.success(`Đã xóa "${name}"`); fetchCategories(pagination.page); }
        catch (e) { toast.error(e.response?.data?.message || 'Lỗi khi xóa'); }
    };

    const handlePageChange = (p) => { if (p >= 1 && p <= pagination.totalPages) fetchCategories(p); };

    return (
        <div style={{ background: 'var(--c-bg)', minHeight: '100vh' }}>
            <div className="admin-header">
                <div className="admin-header-inner">
                    <h1 className="admin-title">🏷️ Quản lý Danh mục</h1>
                    <button className="btn btn-primary btn-sm" onClick={handleOpenAdd}>+ Thêm danh mục</button>
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
                                    <th>#</th><th>Tên</th><th>Slug</th><th>Mô tả</th><th>Ảnh</th><th>Trạng thái</th><th className="table-center">Hành động</th>
                                </tr></thead>
                                <tbody>
                                    {categories.length === 0 ? (
                                        <tr><td colSpan={7}><div className="empty-state" style={{ padding: '20px 0' }}><div className="empty-state-icon">🏷️</div><p>Chưa có danh mục nào.</p></div></td></tr>
                                    ) : categories.map((cat, idx) => (
                                        <tr key={cat._id}>
                                            <td>{(pagination.page - 1) * 10 + idx + 1}</td>
                                            <td><strong>{cat.name}</strong></td>
                                            <td style={{ color: 'var(--t-muted)', fontSize: 13 }}>{cat.slug}</td>
                                            <td>{cat.description || '—'}</td>
                                            <td>{cat.image ? <img src={cat.image} alt={cat.name} style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6 }} /> : <span style={{ color: 'var(--t-muted)' }}>—</span>}</td>
                                            <td><span className={`badge ${cat.isActive ? 'badge-green' : 'badge-gray'}`}>{cat.isActive ? 'Hoạt động' : 'Ẩn'}</span></td>
                                            <td className="table-center">
                                                <button className="btn btn-secondary btn-sm" style={{ marginRight: 6 }} onClick={() => handleOpenEdit(cat)}>✏️ Sửa</button>
                                                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(cat._id, cat.name)}>🗑️ Xóa</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {pagination.totalPages > 1 && (
                            <div className="pagination">
                                <button className="page-btn" onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page === 1}>‹</button>
                                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
                                    <button key={p} className={`page-btn ${p === pagination.page ? 'active' : ''}`} onClick={() => handlePageChange(p)}>{p}</button>
                                ))}
                                <button className="page-btn" onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page === pagination.totalPages}>›</button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ── Modal ─────────────────────────────────────────────── */}
            {showModal && (
                <div className="modal-backdrop" onClick={handleClose}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h3 style={{ margin: 0 }}>{editingCategory ? '✏️ Sửa danh mục' : '+ Thêm danh mục'}</h3>
                            <button className="btn btn-ghost btn-sm" onClick={handleClose}>✕</button>
                        </div>
                        {formError && <div className="alert alert-danger" style={{ marginBottom: 14 }}>{formError}</div>}
                        <form onSubmit={handleSubmit}>
                            <div className="form-row">
                                <label className="form-label">Tên danh mục <span style={{ color: 'var(--c-danger)' }}>*</span></label>
                                <input className="form-control" name="name" value={formData.name} onChange={handleChange} placeholder="VD: Rau củ quả" required />
                            </div>
                            <div className="form-row">
                                <label className="form-label">Mô tả</label>
                                <textarea className="form-control" name="description" value={formData.description} onChange={handleChange} rows={3} placeholder="Mô tả danh mục..." />
                            </div>
                            <div className="form-row">
                                <label className="form-label">URL hình ảnh</label>
                                <input className="form-control" name="image" value={formData.image} onChange={handleChange} placeholder="https://..." />
                            </div>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                                <button type="button" className="btn btn-ghost" onClick={handleClose}>Hủy</button>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Đang lưu...' : editingCategory ? 'Cập nhật' : 'Thêm mới'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminCategoryPage;
