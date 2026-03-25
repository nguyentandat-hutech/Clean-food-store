import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import {
    getAllCategoriesAPI,
    createCategoryAPI,
    updateCategoryAPI,
    deleteCategoryAPI,
} from '../api/categoryService';

// ── Component chính: Quản lý Danh mục (Admin) ──────────────────
function AdminCategoryPage() {
    // State danh sách danh mục & phân trang
    const [categories, setCategories] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [loading, setLoading] = useState(false);

    // State modal thêm/sửa
    const [showModal, setShowModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null); // null = thêm mới, object = sửa
    const [formData, setFormData] = useState({ name: '', description: '', image: '' });
    const [formError, setFormError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // ── Lấy danh sách danh mục ──────────────────────────────────
    const fetchCategories = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const result = await getAllCategoriesAPI({ page, limit: 10 });
            setCategories(result.categories);
            setPagination(result.pagination);
        } catch (error) {
            const msg = error.response?.data?.message || 'Lỗi khi tải danh sách danh mục';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    }, []);

    // Gọi API lần đầu khi component mount
    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    // ── Mở modal thêm mới ───────────────────────────────────────
    const handleOpenAdd = () => {
        setEditingCategory(null);
        setFormData({ name: '', description: '', image: '' });
        setFormError('');
        setShowModal(true);
    };

    // ── Mở modal chỉnh sửa ─────────────────────────────────────
    const handleOpenEdit = (category) => {
        setEditingCategory(category);
        setFormData({
            name: category.name || '',
            description: category.description || '',
            image: category.image || '',
        });
        setFormError('');
        setShowModal(true);
    };

    // ── Đóng modal ──────────────────────────────────────────────
    const handleCloseModal = () => {
        setShowModal(false);
        setEditingCategory(null);
        setFormData({ name: '', description: '', image: '' });
        setFormError('');
    };

    // ── Xử lý thay đổi input trong form ────────────────────────
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setFormError(''); // Xóa lỗi khi user nhập lại
    };

    // ── Submit form (Thêm mới hoặc Cập nhật) ───────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate client-side đơn giản
        if (!formData.name.trim() || formData.name.trim().length < 2) {
            setFormError('Tên danh mục phải có ít nhất 2 ký tự');
            return;
        }

        setSubmitting(true);
        setFormError('');

        try {
            if (editingCategory) {
                // Cập nhật danh mục
                await updateCategoryAPI(editingCategory._id, formData);
                toast.success('Cập nhật danh mục thành công!');
            } else {
                // Tạo mới danh mục
                await createCategoryAPI(formData);
                toast.success('Thêm danh mục thành công!');
            }
            handleCloseModal();
            fetchCategories(pagination.page); // Reload danh sách
        } catch (error) {
            const msg = error.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại';
            setFormError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    // ── Xóa danh mục ───────────────────────────────────────────
    const handleDelete = async (categoryId, categoryName) => {
        // Confirm trước khi xóa
        const confirmed = window.confirm(`Bạn có chắc chắn muốn xóa danh mục "${categoryName}"?`);
        if (!confirmed) return;

        try {
            await deleteCategoryAPI(categoryId);
            toast.success(`Đã xóa danh mục "${categoryName}"!`);
            fetchCategories(pagination.page); // Reload danh sách
        } catch (error) {
            const msg = error.response?.data?.message || 'Lỗi khi xóa danh mục';
            toast.error(msg);
        }
    };

    // ── Chuyển trang ────────────────────────────────────────────
    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            fetchCategories(newPage);
        }
    };

    // ═══════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════
    return (
        <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
            {/* ── Header ─────────────────────────────────────── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1>Quản lý Danh mục</h1>
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
                    + Thêm danh mục
                </button>
            </div>

            {/* ── Thông báo loading ──────────────────────────── */}
            {loading && <p>Đang tải dữ liệu...</p>}

            {/* ── Bảng danh sách danh mục ────────────────────── */}
            {!loading && (
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f8f9fa', textAlign: 'left' }}>
                            <th style={{ padding: '12px', border: '1px solid #dee2e6' }}>#</th>
                            <th style={{ padding: '12px', border: '1px solid #dee2e6' }}>Tên</th>
                            <th style={{ padding: '12px', border: '1px solid #dee2e6' }}>Slug</th>
                            <th style={{ padding: '12px', border: '1px solid #dee2e6' }}>Mô tả</th>
                            <th style={{ padding: '12px', border: '1px solid #dee2e6' }}>Hình ảnh</th>
                            <th style={{ padding: '12px', border: '1px solid #dee2e6' }}>Trạng thái</th>
                            <th style={{ padding: '12px', border: '1px solid #dee2e6' }}>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categories.length === 0 ? (
                            <tr>
                                <td colSpan={7} style={{ padding: '20px', textAlign: 'center', border: '1px solid #dee2e6' }}>
                                    Chưa có danh mục nào.
                                </td>
                            </tr>
                        ) : (
                            categories.map((cat, index) => (
                                <tr key={cat._id}>
                                    <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>
                                        {(pagination.page - 1) * pagination.limit + index + 1}
                                    </td>
                                    <td style={{ padding: '10px', border: '1px solid #dee2e6', fontWeight: 'bold' }}>
                                        {cat.name}
                                    </td>
                                    <td style={{ padding: '10px', border: '1px solid #dee2e6', color: '#6c757d' }}>
                                        {cat.slug}
                                    </td>
                                    <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>
                                        {cat.description || '—'}
                                    </td>
                                    <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>
                                        {cat.image ? (
                                            <img src={cat.image} alt={cat.name} style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }} />
                                        ) : (
                                            <span style={{ color: '#999' }}>Không có</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>
                                        <span style={{
                                            padding: '4px 8px',
                                            borderRadius: '4px',
                                            fontSize: '12px',
                                            backgroundColor: cat.isActive ? '#d4edda' : '#f8d7da',
                                            color: cat.isActive ? '#155724' : '#721c24',
                                        }}>
                                            {cat.isActive ? 'Hoạt động' : 'Ẩn'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>
                                        <button
                                            onClick={() => handleOpenEdit(cat)}
                                            style={{
                                                padding: '6px 12px',
                                                marginRight: '8px',
                                                backgroundColor: '#ffc107',
                                                color: '#212529',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontSize: '13px',
                                            }}
                                        >
                                            Sửa
                                        </button>
                                        <button
                                            onClick={() => handleDelete(cat._id, cat.name)}
                                            style={{
                                                padding: '6px 12px',
                                                backgroundColor: '#dc3545',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontSize: '13px',
                                            }}
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

            {/* ── Phân trang ─────────────────────────────────── */}
            {pagination.totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
                    <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page <= 1}
                        style={{ padding: '6px 12px', cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer' }}
                    >
                        ← Trước
                    </button>
                    <span style={{ padding: '6px 12px', lineHeight: '1.5' }}>
                        Trang {pagination.page} / {pagination.totalPages} (Tổng: {pagination.total})
                    </span>
                    <button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page >= pagination.totalPages}
                        style={{ padding: '6px 12px', cursor: pagination.page >= pagination.totalPages ? 'not-allowed' : 'pointer' }}
                    >
                        Sau →
                    </button>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════ */}
            {/* MODAL THÊM / SỬA DANH MỤC                          */}
            {/* ═══════════════════════════════════════════════════ */}
            {showModal && (
                <div
                    style={{
                        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                        backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
                        justifyContent: 'center', alignItems: 'center', zIndex: 1000,
                    }}
                    onClick={handleCloseModal}
                >
                    <div
                        style={{
                            backgroundColor: '#fff', padding: '30px', borderRadius: '8px',
                            width: '500px', maxHeight: '90vh', overflowY: 'auto',
                        }}
                        onClick={(e) => e.stopPropagation()} // Ngăn click overlay đóng modal
                    >
                        <h2 style={{ marginTop: 0 }}>
                            {editingCategory ? 'Chỉnh sửa Danh mục' : 'Thêm Danh mục mới'}
                        </h2>

                        {/* Hiển thị lỗi từ server */}
                        {formError && (
                            <div style={{
                                padding: '10px', marginBottom: '15px', backgroundColor: '#f8d7da',
                                color: '#721c24', borderRadius: '4px', border: '1px solid #f5c6cb',
                            }}>
                                {formError}
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            {/* Tên danh mục */}
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                    Tên danh mục <span style={{ color: 'red' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="VD: Rau củ quả"
                                    required
                                    style={{
                                        width: '100%', padding: '10px', border: '1px solid #ced4da',
                                        borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box',
                                    }}
                                />
                            </div>

                            {/* Mô tả */}
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                    Mô tả
                                </label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    placeholder="Mô tả ngắn gọn về danh mục..."
                                    rows={3}
                                    style={{
                                        width: '100%', padding: '10px', border: '1px solid #ced4da',
                                        borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box',
                                        resize: 'vertical',
                                    }}
                                />
                            </div>

                            {/* Hình ảnh (URL) */}
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                    URL Hình ảnh
                                </label>
                                <input
                                    type="text"
                                    name="image"
                                    value={formData.image}
                                    onChange={handleChange}
                                    placeholder="https://example.com/image.jpg"
                                    style={{
                                        width: '100%', padding: '10px', border: '1px solid #ced4da',
                                        borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box',
                                    }}
                                />
                            </div>

                            {/* Nút hành động */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    style={{
                                        padding: '10px 20px', backgroundColor: '#6c757d', color: '#fff',
                                        border: 'none', borderRadius: '4px', cursor: 'pointer',
                                    }}
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    style={{
                                        padding: '10px 20px',
                                        backgroundColor: submitting ? '#6c757d' : '#007bff',
                                        color: '#fff', border: 'none', borderRadius: '4px',
                                        cursor: submitting ? 'not-allowed' : 'pointer',
                                    }}
                                >
                                    {submitting
                                        ? 'Đang xử lý...'
                                        : editingCategory ? 'Cập nhật' : 'Thêm mới'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminCategoryPage;
