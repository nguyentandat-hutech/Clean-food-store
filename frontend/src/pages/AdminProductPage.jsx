import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import {
    getAllProductsAPI,
    createProductAPI,
    updateProductAPI,
    deleteProductAPI,
} from '../api/productService';
import { getAllCategoriesAPI } from '../api/categoryService';
import { getAllFarmsAPI } from '../api/farmService';

// ── Giá trị mặc định cho form ──────────────────────────────────
const INITIAL_FORM = {
    name: '', description: '', price: '', unit: 'kg',
    category: '', farm: '', standards: 'VietGAP',
    harvestDate: '', expiryDate: '',
};

// ── Component chính: Quản lý Sản phẩm (Admin) ──────────────────
function AdminProductPage() {
    // State danh sách sản phẩm & phân trang
    const [products, setProducts] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [loading, setLoading] = useState(false);

    // State dropdown data (danh mục & trang trại)
    const [categories, setCategories] = useState([]);
    const [farms, setFarms] = useState([]);

    // State modal thêm/sửa
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [formData, setFormData] = useState(INITIAL_FORM);
    const [imageFiles, setImageFiles] = useState([]); // File ảnh mới upload
    const [formError, setFormError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // ── Lấy danh sách sản phẩm ──────────────────────────────────
    const fetchProducts = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const result = await getAllProductsAPI({ page, limit: 10 });
            setProducts(result.products);
            setPagination(result.pagination);
        } catch (error) {
            const msg = error.response?.data?.message || 'Lỗi khi tải danh sách sản phẩm';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    }, []);

    // ── Lấy danh sách danh mục & trang trại cho dropdown ────────
    const fetchDropdownData = useCallback(async () => {
        try {
            const [catResult, farmResult] = await Promise.all([
                getAllCategoriesAPI({ limit: 50 }),
                getAllFarmsAPI({ limit: 50 }),
            ]);
            setCategories(catResult.categories || []);
            setFarms(farmResult.farms || []);
        } catch (error) {
            toast.error('Lỗi khi tải dữ liệu danh mục/trang trại');
        }
    }, []);

    // Gọi API lần đầu khi component mount
    useEffect(() => {
        fetchProducts();
        fetchDropdownData();
    }, [fetchProducts, fetchDropdownData]);

    // ── Mở modal thêm mới ───────────────────────────────────────
    const handleOpenAdd = () => {
        setEditingProduct(null);
        setFormData(INITIAL_FORM);
        setImageFiles([]);
        setFormError('');
        setShowModal(true);
    };

    // ── Mở modal chỉnh sửa ─────────────────────────────────────
    const handleOpenEdit = (product) => {
        setEditingProduct(product);
        setFormData({
            name: product.name || '',
            description: product.description || '',
            price: product.price !== undefined ? String(product.price) : '',
            unit: product.unit || 'kg',
            category: product.category?._id || '',
            farm: product.farm?._id || '',
            standards: product.standards || 'VietGAP',
            harvestDate: product.harvestDate ? product.harvestDate.substring(0, 10) : '',
            expiryDate: product.expiryDate ? product.expiryDate.substring(0, 10) : '',
        });
        setImageFiles([]);
        setFormError('');
        setShowModal(true);
    };

    // ── Đóng modal ──────────────────────────────────────────────
    const handleCloseModal = () => {
        setShowModal(false);
        setEditingProduct(null);
        setFormData(INITIAL_FORM);
        setImageFiles([]);
        setFormError('');
    };

    // ── Xử lý thay đổi input ───────────────────────────────────
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setFormError('');
    };

    // ── Xử lý chọn file ảnh ────────────────────────────────────
    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 5) {
            setFormError('Tối đa 5 file ảnh cho mỗi sản phẩm');
            return;
        }
        setImageFiles(files);
        setFormError('');
    };

    // ── Submit form (Thêm mới hoặc Cập nhật) ───────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate client-side
        if (!formData.name.trim() || formData.name.trim().length < 2) {
            setFormError('Tên sản phẩm phải có ít nhất 2 ký tự');
            return;
        }
        const price = Number(formData.price);
        if (isNaN(price) || price < 0) {
            setFormError('Giá sản phẩm phải là số không âm');
            return;
        }
        if (!formData.category) {
            setFormError('Vui lòng chọn danh mục');
            return;
        }
        if (!formData.farm) {
            setFormError('Vui lòng chọn trang trại');
            return;
        }
        if (!formData.harvestDate) {
            setFormError('Vui lòng chọn ngày thu hoạch');
            return;
        }
        if (!formData.expiryDate) {
            setFormError('Vui lòng chọn ngày hết hạn');
            return;
        }

        setSubmitting(true);
        setFormError('');

        try {
            // Dùng FormData để gửi cả text fields và file ảnh
            const fd = new FormData();
            fd.append('name', formData.name.trim());
            fd.append('description', formData.description.trim());
            fd.append('price', formData.price);
            fd.append('unit', formData.unit);
            fd.append('category', formData.category);
            fd.append('farm', formData.farm);
            fd.append('standards', formData.standards);
            fd.append('harvestDate', formData.harvestDate);
            fd.append('expiryDate', formData.expiryDate);

            // Thêm từng file ảnh vào FormData
            imageFiles.forEach((file) => {
                fd.append('images', file);
            });

            if (editingProduct) {
                await updateProductAPI(editingProduct._id, fd);
                toast.success('Cập nhật sản phẩm thành công!');
            } else {
                await createProductAPI(fd);
                toast.success('Thêm sản phẩm thành công!');
            }
            handleCloseModal();
            fetchProducts(pagination.page);
        } catch (error) {
            const msg = error.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại';
            setFormError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    // ── Xóa sản phẩm ───────────────────────────────────────────
    const handleDelete = async (productId, productName) => {
        const confirmed = window.confirm(`Bạn có chắc chắn muốn xóa sản phẩm "${productName}"?`);
        if (!confirmed) return;

        try {
            await deleteProductAPI(productId);
            toast.success(`Đã xóa sản phẩm "${productName}"!`);
            fetchProducts(pagination.page);
        } catch (error) {
            const msg = error.response?.data?.message || 'Lỗi khi xóa sản phẩm';
            toast.error(msg);
        }
    };

    // ── Chuyển trang ────────────────────────────────────────────
    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            fetchProducts(newPage);
        }
    };

    // ── Format giá VND ──────────────────────────────────────────
    const formatPrice = (price) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
    };

    // ═══════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════
    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            {/* ── Header ─────────────────────────────────────── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1>Quản lý Sản phẩm</h1>
                <button
                    onClick={handleOpenAdd}
                    style={{
                        padding: '10px 20px', backgroundColor: '#28a745', color: '#fff',
                        border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px',
                    }}
                >
                    + Thêm sản phẩm
                </button>
            </div>

            {/* ── Loading ────────────────────────────────────── */}
            {loading && <p>Đang tải dữ liệu...</p>}

            {/* ── Bảng danh sách sản phẩm ────────────────────── */}
            {!loading && (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f8f9fa', textAlign: 'left' }}>
                                <th style={{ padding: '12px', border: '1px solid #dee2e6' }}>#</th>
                                <th style={{ padding: '12px', border: '1px solid #dee2e6' }}>Tên</th>
                                <th style={{ padding: '12px', border: '1px solid #dee2e6' }}>Giá</th>
                                <th style={{ padding: '12px', border: '1px solid #dee2e6' }}>ĐVT</th>
                                <th style={{ padding: '12px', border: '1px solid #dee2e6' }}>Danh mục</th>
                                <th style={{ padding: '12px', border: '1px solid #dee2e6' }}>Trang trại</th>
                                <th style={{ padding: '12px', border: '1px solid #dee2e6' }}>Tiêu chuẩn</th>
                                <th style={{ padding: '12px', border: '1px solid #dee2e6' }}>Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.length === 0 ? (
                                <tr>
                                    <td colSpan={8} style={{ padding: '20px', textAlign: 'center', border: '1px solid #dee2e6' }}>
                                        Chưa có sản phẩm nào.
                                    </td>
                                </tr>
                            ) : (
                                products.map((prod, index) => (
                                    <tr key={prod._id}>
                                        <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>
                                            {(pagination.page - 1) * pagination.limit + index + 1}
                                        </td>
                                        <td style={{ padding: '10px', border: '1px solid #dee2e6', fontWeight: 'bold' }}>
                                            {prod.name}
                                        </td>
                                        <td style={{ padding: '10px', border: '1px solid #dee2e6', color: '#e74c3c' }}>
                                            {formatPrice(prod.price)}
                                        </td>
                                        <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>
                                            {prod.unit}
                                        </td>
                                        <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>
                                            {prod.category?.name || '—'}
                                        </td>
                                        <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>
                                            {prod.farm?.name || '—'}
                                        </td>
                                        <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>
                                            <span style={{
                                                padding: '4px 8px', borderRadius: '4px', fontSize: '12px',
                                                backgroundColor: prod.standards === 'Organic' ? '#d4edda' : '#cce5ff',
                                                color: prod.standards === 'Organic' ? '#155724' : '#004085',
                                            }}>
                                                {prod.standards}
                                            </span>
                                        </td>
                                        <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>
                                            <button
                                                onClick={() => handleOpenEdit(prod)}
                                                style={{
                                                    padding: '6px 12px', marginRight: '8px',
                                                    backgroundColor: '#ffc107', color: '#212529',
                                                    border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px',
                                                }}
                                            >
                                                Sửa
                                            </button>
                                            <button
                                                onClick={() => handleDelete(prod._id, prod.name)}
                                                style={{
                                                    padding: '6px 12px', backgroundColor: '#dc3545', color: '#fff',
                                                    border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px',
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
                </div>
            )}

            {/* ── Phân trang ─────────────────────────────────── */}
            {pagination.totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
                    <button onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page <= 1}
                        style={{ padding: '6px 12px', cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer' }}>
                        ← Trước
                    </button>
                    <span style={{ padding: '6px 12px', lineHeight: '1.5' }}>
                        Trang {pagination.page} / {pagination.totalPages} (Tổng: {pagination.total})
                    </span>
                    <button onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}
                        style={{ padding: '6px 12px', cursor: pagination.page >= pagination.totalPages ? 'not-allowed' : 'pointer' }}>
                        Sau →
                    </button>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════ */}
            {/* MODAL THÊM / SỬA SẢN PHẨM                          */}
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
                            width: '600px', maxHeight: '90vh', overflowY: 'auto',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 style={{ marginTop: 0 }}>
                            {editingProduct ? 'Chỉnh sửa Sản phẩm' : 'Thêm Sản phẩm mới'}
                        </h2>

                        {/* Hiển thị lỗi */}
                        {formError && (
                            <div style={{
                                padding: '10px', marginBottom: '15px', backgroundColor: '#f8d7da',
                                color: '#721c24', borderRadius: '4px', border: '1px solid #f5c6cb',
                            }}>
                                {formError}
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            {/* Tên sản phẩm */}
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                                    Tên sản phẩm <span style={{ color: 'red' }}>*</span>
                                </label>
                                <input type="text" name="name" value={formData.name} onChange={handleChange}
                                    placeholder="VD: Rau muống hữu cơ" required
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ced4da', borderRadius: '4px', boxSizing: 'border-box' }} />
                            </div>

                            {/* Mô tả */}
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Mô tả</label>
                                <textarea name="description" value={formData.description} onChange={handleChange}
                                    placeholder="Mô tả chi tiết sản phẩm..." rows={3}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ced4da', borderRadius: '4px', boxSizing: 'border-box', resize: 'vertical' }} />
                            </div>

                            {/* Giá & Đơn vị - trên cùng 1 hàng */}
                            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                                        Giá (VNĐ) <span style={{ color: 'red' }}>*</span>
                                    </label>
                                    <input type="number" name="price" value={formData.price} onChange={handleChange}
                                        min="0" step="1000" placeholder="50000" required
                                        style={{ width: '100%', padding: '8px', border: '1px solid #ced4da', borderRadius: '4px', boxSizing: 'border-box' }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                                        Đơn vị <span style={{ color: 'red' }}>*</span>
                                    </label>
                                    <select name="unit" value={formData.unit} onChange={handleChange}
                                        style={{ width: '100%', padding: '8px', border: '1px solid #ced4da', borderRadius: '4px', boxSizing: 'border-box' }}>
                                        <option value="kg">kg</option>
                                        <option value="bó">bó</option>
                                        <option value="gói">gói</option>
                                        <option value="hộp">hộp</option>
                                        <option value="túi">túi</option>
                                        <option value="trái">trái</option>
                                        <option value="lít">lít</option>
                                    </select>
                                </div>
                            </div>

                            {/* Danh mục & Trang trại - dropdown */}
                            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                                        Danh mục <span style={{ color: 'red' }}>*</span>
                                    </label>
                                    <select name="category" value={formData.category} onChange={handleChange} required
                                        style={{ width: '100%', padding: '8px', border: '1px solid #ced4da', borderRadius: '4px', boxSizing: 'border-box' }}>
                                        <option value="">-- Chọn danh mục --</option>
                                        {categories.map((cat) => (
                                            <option key={cat._id} value={cat._id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                                        Trang trại <span style={{ color: 'red' }}>*</span>
                                    </label>
                                    <select name="farm" value={formData.farm} onChange={handleChange} required
                                        style={{ width: '100%', padding: '8px', border: '1px solid #ced4da', borderRadius: '4px', boxSizing: 'border-box' }}>
                                        <option value="">-- Chọn trang trại --</option>
                                        {farms.map((f) => (
                                            <option key={f._id} value={f._id}>{f.name} ({f.location})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Tiêu chuẩn */}
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                                    Tiêu chuẩn <span style={{ color: 'red' }}>*</span>
                                </label>
                                <select name="standards" value={formData.standards} onChange={handleChange}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ced4da', borderRadius: '4px', boxSizing: 'border-box' }}>
                                    <option value="VietGAP">VietGAP</option>
                                    <option value="Organic">Organic</option>
                                    <option value="GlobalGAP">GlobalGAP</option>
                                    <option value="Khác">Khác</option>
                                </select>
                            </div>

                            {/* Ngày thu hoạch & Hạn sử dụng */}
                            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                                        Ngày thu hoạch <span style={{ color: 'red' }}>*</span>
                                    </label>
                                    <input type="date" name="harvestDate" value={formData.harvestDate} onChange={handleChange}
                                        max={new Date().toISOString().split('T')[0]} required
                                        style={{ width: '100%', padding: '8px', border: '1px solid #ced4da', borderRadius: '4px', boxSizing: 'border-box' }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                                        Hạn sử dụng <span style={{ color: 'red' }}>*</span>
                                    </label>
                                    <input type="date" name="expiryDate" value={formData.expiryDate} onChange={handleChange}
                                        required
                                        style={{ width: '100%', padding: '8px', border: '1px solid #ced4da', borderRadius: '4px', boxSizing: 'border-box' }} />
                                </div>
                            </div>

                            {/* Upload ảnh */}
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                                    Hình ảnh sản phẩm (tối đa 5 ảnh)
                                </label>
                                <input type="file" accept="image/jpeg,image/png,image/webp" multiple
                                    onChange={handleFileChange}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ced4da', borderRadius: '4px', boxSizing: 'border-box' }} />
                                {imageFiles.length > 0 && (
                                    <p style={{ fontSize: '13px', color: '#6c757d', marginTop: '4px' }}>
                                        Đã chọn {imageFiles.length} ảnh: {imageFiles.map(f => f.name).join(', ')}
                                    </p>
                                )}
                                {/* Hiển thị ảnh hiện tại khi sửa */}
                                {editingProduct && editingProduct.images && editingProduct.images.length > 0 && (
                                    <div style={{ marginTop: '8px' }}>
                                        <p style={{ fontSize: '13px', color: '#6c757d' }}>Ảnh hiện tại:</p>
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            {editingProduct.images.map((img, idx) => (
                                                <img key={idx} src={img} alt={`Ảnh ${idx + 1}`}
                                                    style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #dee2e6' }} />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Nút hành động */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button type="button" onClick={handleCloseModal}
                                    style={{ padding: '10px 20px', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                    Hủy
                                </button>
                                <button type="submit" disabled={submitting}
                                    style={{
                                        padding: '10px 20px',
                                        backgroundColor: submitting ? '#6c757d' : '#007bff',
                                        color: '#fff', border: 'none', borderRadius: '4px',
                                        cursor: submitting ? 'not-allowed' : 'pointer',
                                    }}>
                                    {submitting ? 'Đang xử lý...' : editingProduct ? 'Cập nhật' : 'Thêm mới'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminProductPage;
