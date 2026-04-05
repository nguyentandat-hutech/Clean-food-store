import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { getAllProductsAPI, createProductAPI, updateProductAPI, deleteProductAPI } from '../api/productService';
import { getAllCategoriesAPI } from '../api/categoryService';
import { getAllFarmsAPI } from '../api/farmService';

const INITIAL_FORM = { name: '', description: '', price: '', unit: 'kg', category: '', farm: '', standards: 'VietGAP', harvestDate: '', expiryDate: '' };
const fmt = (n) => n?.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' }) ?? '—';

function AdminProductPage() {
    const [products, setProducts] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState([]);
    const [farms, setFarms] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [formData, setFormData] = useState(INITIAL_FORM);
    const [imageFiles, setImageFiles] = useState([]);
    const [formError, setFormError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchProducts = useCallback(async (page = 1) => {
        setLoading(true);
        try { const r = await getAllProductsAPI({ page, limit: 10 }); setProducts(r.products); setPagination(r.pagination); }
        catch (err) { toast.error(err.response?.data?.message || 'Lỗi khi tải sản phẩm'); }
        finally { setLoading(false); }
    }, []);

    const fetchDropdownData = useCallback(async () => {
        try {
            const [catR, farmR] = await Promise.all([getAllCategoriesAPI({ limit: 50 }), getAllFarmsAPI({ limit: 50 })]);
            setCategories(catR.categories || []);
            setFarms(farmR.farms || []);
        } catch { toast.error('Lỗi khi tải danh mục/trang trại'); }
    }, []);

    useEffect(() => { fetchProducts(); fetchDropdownData(); }, [fetchProducts, fetchDropdownData]);

    const handleOpenAdd = () => { setEditingProduct(null); setFormData(INITIAL_FORM); setImageFiles([]); setFormError(''); setShowModal(true); };

    const handleOpenEdit = (prod) => {
        setEditingProduct(prod);
        setFormData({
            name: prod.name || '', description: prod.description || '',
            price: prod.price !== undefined ? String(prod.price) : '',
            unit: prod.unit || 'kg', category: prod.category?._id || '',
            farm: prod.farm?._id || '', standards: prod.standards || 'VietGAP',
            harvestDate: prod.harvestDate ? prod.harvestDate.substring(0, 10) : '',
            expiryDate: prod.expiryDate ? prod.expiryDate.substring(0, 10) : '',
        });
        setImageFiles([]); setFormError(''); setShowModal(true);
    };

    const handleCloseModal = () => { setShowModal(false); setEditingProduct(null); setFormData(INITIAL_FORM); setImageFiles([]); setFormError(''); };

    const handleChange = (e) => { const { name, value } = e.target; setFormData(p => ({ ...p, [name]: value })); setFormError(''); };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 5) { setFormError('Tối đa 5 ảnh'); return; }
        setImageFiles(files); setFormError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim() || formData.name.trim().length < 2) { setFormError('Tên phải ≥ 2 ký tự'); return; }
        const price = Number(formData.price);
        if (isNaN(price) || price < 0) { setFormError('Giá không hợp lệ'); return; }
        if (!formData.category) { setFormError('Chọn danh mục'); return; }
        if (!formData.farm) { setFormError('Chọn trang trại'); return; }
        if (!formData.harvestDate) { setFormError('Chọn ngày thu hoạch'); return; }
        if (!formData.expiryDate) { setFormError('Chọn ngày hết hạn'); return; }
        setSubmitting(true); setFormError('');
        try {
            const fd = new FormData();
            Object.entries(formData).forEach(([k, v]) => fd.append(k, v));
            imageFiles.forEach(f => fd.append('images', f));
            if (editingProduct) { await updateProductAPI(editingProduct._id, fd); toast.success('Cập nhật sản phẩm thành công!'); }
            else { await createProductAPI(fd); toast.success('Thêm sản phẩm thành công!'); }
            handleCloseModal(); fetchProducts(pagination.page);
        } catch (err) { setFormError(err.response?.data?.message || 'Có lỗi xảy ra'); }
        finally { setSubmitting(false); }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Xóa sản phẩm "${name}"?`)) return;
        try { await deleteProductAPI(id); toast.success(`Đã xóa "${name}"`); fetchProducts(pagination.page); }
        catch (err) { toast.error(err.response?.data?.message || 'Xóa thất bại'); }
    };

    return (
        <div style={{ background: 'var(--c-bg)', minHeight: '100vh' }}>
            <div className="admin-header">
                <div className="admin-header-inner">
                    <h1 className="admin-title">🥬 Quản lý Sản phẩm</h1>
                    <button className="btn btn-primary" onClick={handleOpenAdd}>+ Thêm sản phẩm</button>
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
                                    <th>#</th><th>Tên sản phẩm</th><th>Giá</th><th>ĐVT</th><th>Danh mục</th><th>Trang trại</th><th>Tiêu chuẩn</th><th className="table-center">Hành động</th>
                                </tr></thead>
                                <tbody>
                                    {products.length === 0 ? (
                                        <tr><td colSpan={8}><div className="empty-state" style={{ padding: '20px 0' }}><div className="empty-state-icon">🥬</div><p>Chưa có sản phẩm nào.</p></div></td></tr>
                                    ) : products.map((prod, idx) => (
                                        <tr key={prod._id}>
                                            <td>{(pagination.page - 1) * 10 + idx + 1}</td>
                                            <td><strong>{prod.name}</strong></td>
                                            <td style={{ color: 'var(--c-primary)', fontWeight: 600 }}>{fmt(prod.price)}</td>
                                            <td>{prod.unit}</td>
                                            <td>{prod.category?.name || '—'}</td>
                                            <td>{prod.farm?.name || '—'}</td>
                                            <td><span className={`badge ${prod.standards === 'Organic' ? 'badge-green' : 'badge-blue'}`}>{prod.standards}</span></td>
                                            <td className="table-center">
                                                <button className="btn btn-secondary btn-sm" style={{ marginRight: 6 }} onClick={() => handleOpenEdit(prod)}>✏️ Sửa</button>
                                                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(prod._id, prod.name)}>🗑️ Xóa</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {pagination.totalPages > 1 && (
                            <div className="pagination">
                                <button className="page-btn" onClick={() => fetchProducts(pagination.page - 1)} disabled={pagination.page === 1}>‹</button>
                                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
                                    <button key={p} className={`page-btn ${p === pagination.page ? 'active' : ''}`} onClick={() => fetchProducts(p)}>{p}</button>
                                ))}
                                <button className="page-btn" onClick={() => fetchProducts(pagination.page + 1)} disabled={pagination.page === pagination.totalPages}>›</button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ── Modal ──────────────────────────────────────── */}
            {showModal && (
                <div className="modal-backdrop" onClick={handleCloseModal}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 620 }}>
                        <h3 style={{ marginTop: 0 }}>{editingProduct ? '✏️ Cập nhật sản phẩm' : '➕ Thêm sản phẩm mới'}</h3>
                        <form onSubmit={handleSubmit}>
                            <div className="form-row">
                                <label className="form-label">Tên sản phẩm *</label>
                                <input className="form-control" name="name" value={formData.name} onChange={handleChange} placeholder="VD: Rau muống hữu cơ" />
                            </div>
                            <div className="form-row">
                                <label className="form-label">Mô tả</label>
                                <textarea className="form-control" name="description" value={formData.description} onChange={handleChange} rows={2} style={{ resize: 'vertical' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div className="form-row">
                                    <label className="form-label">Giá (VND) *</label>
                                    <input className="form-control" type="number" name="price" value={formData.price} onChange={handleChange} min={0} step={1000} placeholder="50000" />
                                </div>
                                <div className="form-row">
                                    <label className="form-label">Đơn vị *</label>
                                    <select className="form-control" name="unit" value={formData.unit} onChange={handleChange}>
                                        {['kg','bó','gói','hộp','túi','trái','lít'].map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                </div>
                                <div className="form-row">
                                    <label className="form-label">Danh mục *</label>
                                    <select className="form-control" name="category" value={formData.category} onChange={handleChange}>
                                        <option value="">-- Chọn danh mục --</option>
                                        {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-row">
                                    <label className="form-label">Trang trại *</label>
                                    <select className="form-control" name="farm" value={formData.farm} onChange={handleChange}>
                                        <option value="">-- Chọn trang trại --</option>
                                        {farms.map(f => <option key={f._id} value={f._id}>{f.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-row">
                                    <label className="form-label">Tiêu chuẩn *</label>
                                    <select className="form-control" name="standards" value={formData.standards} onChange={handleChange}>
                                        {['VietGAP','Organic','GlobalGAP','Khác'].map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="form-row">
                                    <label className="form-label">Ngày thu hoạch *</label>
                                    <input className="form-control" type="date" name="harvestDate" value={formData.harvestDate} onChange={handleChange} max={new Date().toISOString().split('T')[0]} />
                                </div>
                                <div className="form-row" style={{ gridColumn: '1 / -1' }}>
                                    <label className="form-label">Ngày hết hạn *</label>
                                    <input className="form-control" type="date" name="expiryDate" value={formData.expiryDate} onChange={handleChange} />
                                </div>
                            </div>
                            <div className="form-row" style={{ marginTop: 8 }}>
                                <label className="form-label">Hình ảnh (tối đa 5 ảnh)</label>
                                <input className="form-control" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleFileChange} />
                                {imageFiles.length > 0 && <small style={{ color: 'var(--t-muted)' }}>{imageFiles.length} ảnh đã chọn</small>}
                                {editingProduct?.images?.length > 0 && (
                                    <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                                        {editingProduct.images.map((img, i) => <img key={i} src={img} alt="" style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--s-border)' }} />)}
                                    </div>
                                )}
                            </div>
                            {formError && <div className="alert alert-danger">{formError}</div>}
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
                                <button type="button" className="btn btn-ghost" onClick={handleCloseModal}>Hủy</button>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Đang lưu...' : (editingProduct ? 'Cập nhật' : 'Thêm mới')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminProductPage;
