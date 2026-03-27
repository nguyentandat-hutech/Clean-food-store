import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import {
    getAllFarmsAPI,
    createFarmAPI,
    updateFarmAPI,
    deleteFarmAPI,
} from '../api/farmService';

const CERTIFICATE_OPTIONS = ['VietGAP', 'Organic', 'GlobalGAP', 'Khác'];

const EMPTY_FORM = {
    name: '',
    location: '',
    description: '',
    contact: '',
    certificate: 'VietGAP',
    isActive: true,
};

// ── Component chính: Quản lý Trang trại (Admin) ────────────────
function AdminFarmPage() {
    const [farms, setFarms] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [loading, setLoading] = useState(false);

    const [showModal, setShowModal] = useState(false);
    const [editingFarm, setEditingFarm] = useState(null);
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [formError, setFormError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // ── Lấy danh sách trang trại ───────────────────────────────
    const fetchFarms = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const result = await getAllFarmsAPI({ page, limit: 10 });
            setFarms(result.farms);
            setPagination(result.pagination);
        } catch (error) {
            const msg = error.response?.data?.message || 'Lỗi khi tải danh sách trang trại';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchFarms();
    }, [fetchFarms]);

    // ── Mở modal thêm mới ──────────────────────────────────────
    const handleOpenAdd = () => {
        setEditingFarm(null);
        setFormData(EMPTY_FORM);
        setFormError('');
        setShowModal(true);
    };

    // ── Mở modal chỉnh sửa ────────────────────────────────────
    const handleOpenEdit = (farm) => {
        setEditingFarm(farm);
        setFormData({
            name: farm.name || '',
            location: farm.location || '',
            description: farm.description || '',
            contact: farm.contact || '',
            certificate: farm.certificate || 'VietGAP',
            isActive: farm.isActive !== undefined ? farm.isActive : true,
        });
        setFormError('');
        setShowModal(true);
    };

    // ── Đóng modal ────────────────────────────────────────────
    const handleCloseModal = () => {
        setShowModal(false);
        setEditingFarm(null);
        setFormData(EMPTY_FORM);
        setFormError('');
    };

    // ── Xử lý thay đổi input ──────────────────────────────────
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
        setFormError('');
    };

    // ── Submit form ───────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name.trim() || formData.name.trim().length < 2) {
            setFormError('Tên trang trại phải có ít nhất 2 ký tự');
            return;
        }
        if (!formData.location.trim()) {
            setFormError('Vui lòng nhập địa chỉ trang trại');
            return;
        }

        setSubmitting(true);
        setFormError('');

        try {
            if (editingFarm) {
                await updateFarmAPI(editingFarm._id, formData);
                toast.success('Cập nhật trang trại thành công!');
            } else {
                await createFarmAPI(formData);
                toast.success('Thêm trang trại thành công!');
            }
            handleCloseModal();
            fetchFarms(pagination.page);
        } catch (error) {
            const msg = error.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại';
            setFormError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    // ── Xóa trang trại ────────────────────────────────────────
    const handleDelete = async (farmId, farmName) => {
        const confirmed = window.confirm(`Bạn có chắc chắn muốn xóa trang trại "${farmName}"?\nCác sản phẩm liên kết với trang trại này có thể bị ảnh hưởng.`);
        if (!confirmed) return;

        try {
            await deleteFarmAPI(farmId);
            toast.success(`Đã xóa trang trại "${farmName}"!`);
            // Nếu xóa item cuối cùng trên trang > 1, quay về trang trước
            const newTotal = pagination.total - 1;
            const newTotalPages = Math.ceil(newTotal / 10) || 1;
            const targetPage = pagination.page > newTotalPages ? newTotalPages : pagination.page;
            fetchFarms(targetPage);
        } catch (error) {
            const msg = error.response?.data?.message || 'Lỗi khi xóa trang trại';
            toast.error(msg);
        }
    };

    // ── Chuyển trang ──────────────────────────────────────────
    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            fetchFarms(newPage);
        }
    };

    // ─────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────
    return (
        <div style={{ padding: '20px', maxWidth: '1100px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1>Quản lý Trang trại</h1>
                <button
                    onClick={handleOpenAdd}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#28a745',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px',
                    }}
                >
                    + Thêm trang trại
                </button>
            </div>

            {loading && <p>Đang tải dữ liệu...</p>}

            {/* Bảng danh sách */}
            {!loading && (
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f8f9fa', textAlign: 'left' }}>
                            <th style={thStyle}>#</th>
                            <th style={thStyle}>Tên trang trại</th>
                            <th style={thStyle}>Địa chỉ</th>
                            <th style={thStyle}>Liên hệ</th>
                            <th style={thStyle}>Chứng nhận</th>
                            <th style={thStyle}>Trạng thái</th>
                            <th style={thStyle}>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {farms.length === 0 ? (
                            <tr>
                                <td colSpan={7} style={{ padding: '20px', textAlign: 'center', border: '1px solid #dee2e6' }}>
                                    Chưa có trang trại nào.
                                </td>
                            </tr>
                        ) : (
                            farms.map((farm, index) => (
                                <tr key={farm._id} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                                    <td style={tdStyle}>{(pagination.page - 1) * 10 + index + 1}</td>
                                    <td style={{ ...tdStyle, fontWeight: 'bold' }}>{farm.name}</td>
                                    <td style={tdStyle}>{farm.location}</td>
                                    <td style={tdStyle}>{farm.contact || '—'}</td>
                                    <td style={tdStyle}>
                                        <span style={{
                                            padding: '3px 8px',
                                            borderRadius: '12px',
                                            fontSize: '12px',
                                            backgroundColor: getCertBadgeColor(farm.certificate),
                                            color: '#fff',
                                        }}>
                                            {farm.certificate}
                                        </span>
                                    </td>
                                    <td style={tdStyle}>
                                        <span style={{
                                            padding: '3px 8px',
                                            borderRadius: '12px',
                                            fontSize: '12px',
                                            backgroundColor: farm.isActive ? '#28a745' : '#6c757d',
                                            color: '#fff',
                                        }}>
                                            {farm.isActive ? 'Hoạt động' : 'Ẩn'}
                                        </span>
                                    </td>
                                    <td style={tdStyle}>
                                        <button
                                            onClick={() => handleOpenEdit(farm)}
                                            style={editBtnStyle}
                                        >
                                            Sửa
                                        </button>
                                        <button
                                            onClick={() => handleDelete(farm._id, farm.name)}
                                            style={deleteBtnStyle}
                                        >
                                            Xóa
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            )}

            {/* Phân trang */}
            {pagination.totalPages > 1 && (
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                        style={pageBtnStyle}
                    >
                        ‹ Trước
                    </button>
                    <span style={{ padding: '6px 12px', lineHeight: '1.8' }}>
                        Trang {pagination.page} / {pagination.totalPages}
                    </span>
                    <button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page === pagination.totalPages}
                        style={pageBtnStyle}
                    >
                        Sau ›
                    </button>
                </div>
            )}

            {/* Modal thêm/sửa */}
            {showModal && (
                <div style={overlayStyle}>
                    <div style={modalStyle}>
                        <h2 style={{ marginTop: 0, marginBottom: '20px' }}>
                            {editingFarm ? 'Chỉnh sửa trang trại' : 'Thêm trang trại mới'}
                        </h2>

                        <form onSubmit={handleSubmit}>
                            {/* Tên */}
                            <div style={fieldStyle}>
                                <label style={labelStyle}>Tên trang trại <span style={{ color: 'red' }}>*</span></label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="VD: Trang Trại Xanh Đà Lạt"
                                    style={inputStyle}
                                />
                            </div>

                            {/* Địa chỉ */}
                            <div style={fieldStyle}>
                                <label style={labelStyle}>Địa chỉ <span style={{ color: 'red' }}>*</span></label>
                                <input
                                    type="text"
                                    name="location"
                                    value={formData.location}
                                    onChange={handleChange}
                                    placeholder="VD: Đà Lạt, Lâm Đồng"
                                    style={inputStyle}
                                />
                            </div>

                            {/* Liên hệ */}
                            <div style={fieldStyle}>
                                <label style={labelStyle}>Thông tin liên hệ</label>
                                <input
                                    type="text"
                                    name="contact"
                                    value={formData.contact}
                                    onChange={handleChange}
                                    placeholder="VD: 0901 234 567 hoặc email"
                                    style={inputStyle}
                                />
                            </div>

                            {/* Chứng nhận */}
                            <div style={fieldStyle}>
                                <label style={labelStyle}>Chứng nhận sản xuất <span style={{ color: 'red' }}>*</span></label>
                                <select
                                    name="certificate"
                                    value={formData.certificate}
                                    onChange={handleChange}
                                    style={inputStyle}
                                >
                                    {CERTIFICATE_OPTIONS.map((opt) => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Mô tả */}
                            <div style={fieldStyle}>
                                <label style={labelStyle}>Mô tả</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    placeholder="Mô tả ngắn về trang trại, quy trình sản xuất..."
                                    rows={3}
                                    style={{ ...inputStyle, resize: 'vertical' }}
                                />
                            </div>

                            {/* Trạng thái */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    name="isActive"
                                    checked={formData.isActive}
                                    onChange={handleChange}
                                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                />
                                <label htmlFor="isActive" style={{ cursor: 'pointer', margin: 0 }}>
                                    Đang hoạt động (hiển thị trên trang sản phẩm)
                                </label>
                            </div>

                            {/* Lỗi */}
                            {formError && (
                                <p style={{ color: '#dc3545', margin: '0 0 12px', fontSize: '14px' }}>
                                    {formError}
                                </p>
                            )}

                            {/* Nút hành động */}
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    style={cancelBtnStyle}
                                    disabled={submitting}
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    style={submitBtnStyle}
                                    disabled={submitting}
                                >
                                    {submitting ? 'Đang lưu...' : (editingFarm ? 'Lưu thay đổi' : 'Thêm trang trại')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Helpers ───────────────────────────────────────────────────
function getCertBadgeColor(cert) {
    switch (cert) {
        case 'VietGAP': return '#17a2b8';
        case 'Organic': return '#28a745';
        case 'GlobalGAP': return '#007bff';
        default: return '#6c757d';
    }
}

// ── Inline styles ──────────────────────────────────────────────
const thStyle = { padding: '12px', border: '1px solid #dee2e6' };
const tdStyle = { padding: '10px', border: '1px solid #dee2e6' };
const editBtnStyle = {
    padding: '5px 12px', marginRight: '6px',
    backgroundColor: '#ffc107', color: '#212529',
    border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px',
};
const deleteBtnStyle = {
    padding: '5px 12px',
    backgroundColor: '#dc3545', color: '#fff',
    border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px',
};
const pageBtnStyle = {
    padding: '6px 14px', border: '1px solid #dee2e6',
    borderRadius: '4px', cursor: 'pointer', backgroundColor: '#fff',
};
const overlayStyle = {
    position: 'fixed', inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
};
const modalStyle = {
    backgroundColor: '#fff', borderRadius: '8px',
    padding: '24px', width: '540px', maxWidth: '95vw',
    maxHeight: '90vh', overflowY: 'auto',
    boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
};
const fieldStyle = { marginBottom: '16px' };
const labelStyle = { display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' };
const inputStyle = {
    width: '100%', padding: '8px 10px',
    border: '1px solid #ced4da', borderRadius: '4px',
    fontSize: '14px', boxSizing: 'border-box',
};
const cancelBtnStyle = {
    padding: '9px 20px', border: '1px solid #ced4da',
    borderRadius: '4px', cursor: 'pointer', backgroundColor: '#fff', fontSize: '14px',
};
const submitBtnStyle = {
    padding: '9px 20px',
    backgroundColor: '#007bff', color: '#fff',
    border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px',
};

export default AdminFarmPage;
