import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
    getAllDiscountsAPI,
    createDiscountAPI,
    updateDiscountAPI,
    deleteDiscountAPI,
} from '../api/discountService';

const EMPTY_FORM = {
    code: '',
    type: 'percentage',
    value: '',
    minOrderAmount: '',
    maxUses: '',
    expiryDate: '',
    isActive: true,
};

const formatPrice = (v) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);

const formatDate = (d) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—');

/**
 * ── AdminDiscountPage ─────────────────────────────────────────
 * Quản lý mã giảm giá: xem danh sách, tạo, sửa, xóa.
 */
const AdminDiscountPage = () => {
    const [discounts, setDiscounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const LIMIT = 10;

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);

    // Delete confirm
    const [deletingId, setDeletingId] = useState(null);

    const fetchDiscounts = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const data = await getAllDiscountsAPI({ page, limit: LIMIT });
            setDiscounts(data.discounts || []);
            setTotalPages(data.pagination?.totalPages || 1);
        } catch (err) {
            setError(err.response?.data?.message || 'Không thể tải danh sách mã giảm giá');
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => {
        fetchDiscounts();
    }, [fetchDiscounts]);

    // ── Modal helpers ──────────────────────────────────────────
    const openCreate = () => {
        setEditingId(null);
        setFormData(EMPTY_FORM);
        setFormError('');
        setShowModal(true);
    };

    const openEdit = (d) => {
        setEditingId(d._id);
        setFormData({
            code: d.code,
            type: d.type,
            value: String(d.value),
            minOrderAmount: d.minOrderAmount != null ? String(d.minOrderAmount) : '',
            maxUses: d.maxUses != null ? String(d.maxUses) : '',
            expiryDate: d.expiryDate ? d.expiryDate.slice(0, 10) : '',
            isActive: d.isActive,
        });
        setFormError('');
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingId(null);
        setFormData(EMPTY_FORM);
        setFormError('');
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : name === 'code' ? value.toUpperCase() : value,
        }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setFormError('');

        // Basic client validation
        if (!formData.code.trim()) return setFormError('Vui lòng nhập mã');
        if (!formData.value || Number(formData.value) <= 0)
            return setFormError('Giá trị giảm phải > 0');
        if (formData.type === 'percentage' && Number(formData.value) > 100)
            return setFormError('Phần trăm giảm không được vượt quá 100%');

        const payload = {
            code: formData.code.trim(),
            type: formData.type,
            value: Number(formData.value),
            minOrderAmount: formData.minOrderAmount !== '' ? Number(formData.minOrderAmount) : 0,
            maxUses: formData.maxUses !== '' ? Number(formData.maxUses) : null,
            expiryDate: formData.expiryDate || null,
            isActive: formData.isActive,
        };

        try {
            setSaving(true);
            if (editingId) {
                await updateDiscountAPI(editingId, payload);
            } else {
                await createDiscountAPI(payload);
            }
            closeModal();
            fetchDiscounts();
        } catch (err) {
            setFormError(err.response?.data?.message || 'Lưu thất bại');
        } finally {
            setSaving(false);
        }
    };

    // ── Toggle active ──────────────────────────────────────────
    const handleToggleActive = async (d) => {
        try {
            await updateDiscountAPI(d._id, { isActive: !d.isActive });
            fetchDiscounts();
        } catch {
            setError('Không thể cập nhật trạng thái');
        }
    };

    // ── Delete ─────────────────────────────────────────────────
    const handleDelete = async (id) => {
        try {
            await deleteDiscountAPI(id);
            setDeletingId(null);
            fetchDiscounts();
        } catch (err) {
            setError(err.response?.data?.message || 'Xóa thất bại');
        }
    };

    // ── Render ─────────────────────────────────────────────────
    return (
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                    <h1 style={{ margin: 0, color: '#1b5e20' }}>🏷️ Quản lý Mã giảm giá</h1>
                    <Link to="/admin/dashboard" style={{ fontSize: 13, color: '#555', textDecoration: 'none' }}>
                        ← Dashboard
                    </Link>
                </div>
                <button
                    onClick={openCreate}
                    style={{ padding: '9px 20px', background: '#28a745', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
                >
                    + Tạo mã mới
                </button>
            </div>

            {error && (
                <div style={{ background: '#fee', border: '1px solid #f00', padding: 10, marginBottom: 12, borderRadius: 4, color: '#c00' }}>
                    {error}
                </div>
            )}

            {loading ? (
                <p style={{ textAlign: 'center', padding: 40 }}>Đang tải...</p>
            ) : discounts.length === 0 ? (
                <p style={{ textAlign: 'center', padding: 40, color: '#888' }}>Chưa có mã giảm giá nào.</p>
            ) : (
                <>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                            <thead>
                                <tr style={{ background: '#1b5e20', color: '#fff' }}>
                                    {['Mã', 'Loại', 'Giá trị', 'Đơn tối thiểu', 'Đã dùng / Tối đa', 'Hết hạn', 'Trạng thái', ''].map((h) => (
                                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {discounts.map((d, i) => {
                                    const isExpired = d.expiryDate && new Date(d.expiryDate) < new Date();
                                    const isExhausted = d.maxUses !== null && d.usedCount >= d.maxUses;
                                    return (
                                        <tr key={d._id} style={{ background: i % 2 === 0 ? '#f9f9f9' : '#fff' }}>
                                            <td style={{ padding: '9px 12px', fontWeight: 700 }}>{d.code}</td>
                                            <td style={{ padding: '9px 12px' }}>
                                                {d.type === 'percentage' ? 'Phần trăm' : 'Cố định'}
                                            </td>
                                            <td style={{ padding: '9px 12px', fontWeight: 600, color: '#c00' }}>
                                                {d.type === 'percentage'
                                                    ? `${d.value}%`
                                                    : formatPrice(d.value)}
                                            </td>
                                            <td style={{ padding: '9px 12px' }}>
                                                {d.minOrderAmount > 0 ? formatPrice(d.minOrderAmount) : '—'}
                                            </td>
                                            <td style={{ padding: '9px 12px' }}>
                                                {d.usedCount} / {d.maxUses ?? '∞'}
                                                {isExhausted && (
                                                    <span style={{ marginLeft: 6, fontSize: 11, background: '#e53935', color: '#fff', borderRadius: 3, padding: '1px 5px' }}>
                                                        Hết lượt
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ padding: '9px 12px' }}>
                                                {d.expiryDate ? (
                                                    <span style={{ color: isExpired ? '#c00' : '#333' }}>
                                                        {formatDate(d.expiryDate)}
                                                        {isExpired && ' (Hết hạn)'}
                                                    </span>
                                                ) : '—'}
                                            </td>
                                            <td style={{ padding: '9px 12px' }}>
                                                <button
                                                    onClick={() => handleToggleActive(d)}
                                                    style={{
                                                        padding: '4px 10px', fontSize: 12, borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 600,
                                                        background: d.isActive ? '#e8f5e9' : '#fce4ec',
                                                        color: d.isActive ? '#2e7d32' : '#c62828',
                                                    }}
                                                >
                                                    {d.isActive ? '✅ Hoạt động' : '❌ Tắt'}
                                                </button>
                                            </td>
                                            <td style={{ padding: '9px 8px', whiteSpace: 'nowrap' }}>
                                                <button
                                                    onClick={() => openEdit(d)}
                                                    style={{ marginRight: 6, padding: '4px 10px', background: '#0277bd', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}
                                                >
                                                    Sửa
                                                </button>
                                                <button
                                                    onClick={() => setDeletingId(d._id)}
                                                    style={{ padding: '4px 10px', background: '#e53935', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}
                                                >
                                                    Xóa
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
                                style={{ padding: '6px 14px', cursor: page === 1 ? 'not-allowed' : 'pointer' }}>
                                ‹ Trước
                            </button>
                            <span style={{ padding: '6px 14px', background: '#eee', borderRadius: 4 }}>
                                {page} / {totalPages}
                            </span>
                            <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}
                                style={{ padding: '6px 14px', cursor: page === totalPages ? 'not-allowed' : 'pointer' }}>
                                Sau ›
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* ── Create / Edit Modal ──────────────────────────────── */}
            {showModal && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                }}>
                    <div style={{
                        background: '#fff', borderRadius: 8, padding: 28, width: '100%', maxWidth: 480,
                        maxHeight: '90vh', overflowY: 'auto', position: 'relative',
                    }}>
                        <h2 style={{ marginTop: 0 }}>
                            {editingId ? '✏️ Sửa mã giảm giá' : '➕ Tạo mã giảm giá mới'}
                        </h2>

                        {formError && (
                            <div style={{ background: '#fee', border: '1px solid #f00', padding: 8, marginBottom: 12, borderRadius: 4, color: '#c00', fontSize: 14 }}>
                                {formError}
                            </div>
                        )}

                        <form onSubmit={handleSave}>
                            {/* Mã code */}
                            <div style={{ marginBottom: 14 }}>
                                <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>
                                    Mã giảm giá *
                                </label>
                                <input
                                    type="text"
                                    name="code"
                                    value={formData.code}
                                    onChange={handleChange}
                                    placeholder="SUMMER20"
                                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #ccc', borderRadius: 4, boxSizing: 'border-box', textTransform: 'uppercase' }}
                                    disabled={!!editingId}
                                />
                                {editingId && <small style={{ color: '#888' }}>Mã không thể thay đổi sau khi tạo</small>}
                            </div>

                            {/* Loại */}
                            <div style={{ marginBottom: 14 }}>
                                <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Loại *</label>
                                <select
                                    name="type"
                                    value={formData.type}
                                    onChange={handleChange}
                                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #ccc', borderRadius: 4, boxSizing: 'border-box' }}
                                >
                                    <option value="percentage">Phần trăm (%)</option>
                                    <option value="fixed">Cố định (VNĐ)</option>
                                </select>
                            </div>

                            {/* Giá trị */}
                            <div style={{ marginBottom: 14 }}>
                                <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>
                                    Giá trị * {formData.type === 'percentage' ? '(%)' : '(VNĐ)'}
                                </label>
                                <input
                                    type="number"
                                    name="value"
                                    value={formData.value}
                                    onChange={handleChange}
                                    min="1"
                                    max={formData.type === 'percentage' ? 100 : undefined}
                                    step={formData.type === 'percentage' ? '1' : '1000'}
                                    placeholder={formData.type === 'percentage' ? '20' : '50000'}
                                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #ccc', borderRadius: 4, boxSizing: 'border-box' }}
                                />
                            </div>

                            {/* Đơn tối thiểu */}
                            <div style={{ marginBottom: 14 }}>
                                <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>
                                    Giá trị đơn tối thiểu (VNĐ)
                                </label>
                                <input
                                    type="number"
                                    name="minOrderAmount"
                                    value={formData.minOrderAmount}
                                    onChange={handleChange}
                                    min="0"
                                    step="1000"
                                    placeholder="0 = không giới hạn"
                                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #ccc', borderRadius: 4, boxSizing: 'border-box' }}
                                />
                            </div>

                            {/* Số lần dùng tối đa */}
                            <div style={{ marginBottom: 14 }}>
                                <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>
                                    Số lần dùng tối đa
                                </label>
                                <input
                                    type="number"
                                    name="maxUses"
                                    value={formData.maxUses}
                                    onChange={handleChange}
                                    min="1"
                                    placeholder="Để trống = không giới hạn"
                                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #ccc', borderRadius: 4, boxSizing: 'border-box' }}
                                />
                            </div>

                            {/* Ngày hết hạn */}
                            <div style={{ marginBottom: 14 }}>
                                <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>
                                    Ngày hết hạn
                                </label>
                                <input
                                    type="date"
                                    name="expiryDate"
                                    value={formData.expiryDate}
                                    onChange={handleChange}
                                    min={new Date().toISOString().slice(0, 10)}
                                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #ccc', borderRadius: 4, boxSizing: 'border-box' }}
                                />
                                <small style={{ color: '#888' }}>Để trống = không hết hạn</small>
                            </div>

                            {/* Trạng thái */}
                            <div style={{ marginBottom: 20 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 }}>
                                    <input
                                        type="checkbox"
                                        name="isActive"
                                        checked={formData.isActive}
                                        onChange={handleChange}
                                        style={{ width: 16, height: 16 }}
                                    />
                                    Kích hoạt ngay
                                </label>
                            </div>

                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    style={{ padding: '9px 20px', background: '#eee', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    style={{ padding: '9px 20px', background: saving ? '#999' : '#28a745', color: '#fff', border: 'none', borderRadius: 6, cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600 }}
                                >
                                    {saving ? 'Đang lưu...' : (editingId ? 'Cập nhật' : 'Tạo mã')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Delete Confirm Dialog ────────────────────────────── */}
            {deletingId && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                }}>
                    <div style={{ background: '#fff', borderRadius: 8, padding: 28, maxWidth: 360, textAlign: 'center' }}>
                        <p style={{ fontSize: 16, marginBottom: 20 }}>
                            Bạn có chắc muốn <strong>xóa</strong> mã giảm giá này không?
                            <br />
                            <small style={{ color: '#888' }}>Hành động này không thể hoàn tác.</small>
                        </p>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                            <button
                                onClick={() => setDeletingId(null)}
                                style={{ padding: '8px 20px', background: '#eee', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
                            >
                                Hủy
                            </button>
                            <button
                                onClick={() => handleDelete(deletingId)}
                                style={{ padding: '8px 20px', background: '#e53935', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
                            >
                                Xóa
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDiscountPage;
