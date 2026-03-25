import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { getAllBatchesAPI, createBatchAPI, updateBatchAPI, deleteBatchAPI } from '../api/batchService';
import { getAllProductsAPI } from '../api/productService';

// ── Trang quản lý Lô hàng (Admin) ──────────────────────────────
// Cho phép: Xem danh sách lô, Thêm lô mới, Sửa, Xóa
function AdminBatchPage() {
    // State danh sách lô hàng + phân trang
    const [batches, setBatches] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
    const [loading, setLoading] = useState(false);

    // State danh sách sản phẩm (dùng cho dropdown)
    const [products, setProducts] = useState([]);

    // State form nhập lô hàng
    const [formData, setFormData] = useState({
        product: '',
        batchNumber: '',
        quantity: '',
        manufacturingDate: '',
        expiryDate: '',
    });

    // State cho chế độ sửa
    const [editingId, setEditingId] = useState(null);

    // ── Lấy danh sách sản phẩm cho dropdown ────────────────────
    const fetchProducts = useCallback(async () => {
        try {
            const data = await getAllProductsAPI({ limit: 100 });
            setProducts(data.products || []);
        } catch (err) {
            toast.error('Không thể tải danh sách sản phẩm');
            console.error(err);
        }
    }, []);

    // ── Lấy danh sách lô hàng ──────────────────────────────────
    const fetchBatches = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const data = await getAllBatchesAPI({ page, limit: 20 });
            setBatches(data.batches || []);
            setPagination(data.pagination || { page: 1, totalPages: 1 });
        } catch (err) {
            toast.error('Không thể tải danh sách lô hàng');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Load dữ liệu khi component mount
    useEffect(() => {
        fetchProducts();
        fetchBatches();
    }, [fetchProducts, fetchBatches]);

    // ── Xử lý thay đổi input form ─────────────────────────────
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    // ── Reset form về trạng thái ban đầu ───────────────────────
    const resetForm = () => {
        setFormData({
            product: '',
            batchNumber: '',
            quantity: '',
            manufacturingDate: '',
            expiryDate: '',
        });
        setEditingId(null);
    };

    // ── Xử lý Submit form (Thêm mới hoặc Cập nhật) ────────────
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate phía client
        if (!formData.product) {
            toast.warn('Vui lòng chọn sản phẩm');
            return;
        }
        if (!formData.batchNumber.trim()) {
            toast.warn('Vui lòng nhập mã lô hàng');
            return;
        }
        if (!formData.quantity || Number(formData.quantity) < 1) {
            toast.warn('Số lượng phải lớn hơn 0');
            return;
        }
        if (!formData.manufacturingDate) {
            toast.warn('Vui lòng chọn ngày sản xuất');
            return;
        }
        if (!formData.expiryDate) {
            toast.warn('Vui lòng chọn ngày hết hạn');
            return;
        }

        try {
            const payload = {
                ...formData,
                quantity: Number(formData.quantity),
            };

            if (editingId) {
                // Chế độ cập nhật
                await updateBatchAPI(editingId, payload);
                toast.success('Cập nhật lô hàng thành công!');
            } else {
                // Chế độ thêm mới
                await createBatchAPI(payload);
                toast.success('Nhập lô hàng mới thành công!');
            }

            resetForm();
            fetchBatches(pagination.page);
        } catch (err) {
            const msg = err.response?.data?.message || 'Thao tác thất bại';
            toast.error(msg);
            console.error(err);
        }
    };

    // ── Nhấn nút Sửa → điền dữ liệu vào form ─────────────────
    const handleEdit = (batch) => {
        setEditingId(batch._id);
        setFormData({
            product: batch.product?._id || batch.product,
            batchNumber: batch.batchNumber,
            quantity: String(batch.quantity),
            manufacturingDate: batch.manufacturingDate
                ? new Date(batch.manufacturingDate).toISOString().split('T')[0]
                : '',
            expiryDate: batch.expiryDate
                ? new Date(batch.expiryDate).toISOString().split('T')[0]
                : '',
        });
        // Scroll lên form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // ── Xóa lô hàng ────────────────────────────────────────────
    const handleDelete = async (batchId, batchNumber) => {
        if (!window.confirm(`Bạn có chắc muốn xóa lô hàng "${batchNumber}"?`)) return;

        try {
            await deleteBatchAPI(batchId);
            toast.success(`Đã xóa lô hàng "${batchNumber}"`);
            fetchBatches(pagination.page);
        } catch (err) {
            const msg = err.response?.data?.message || 'Xóa lô hàng thất bại';
            toast.error(msg);
            console.error(err);
        }
    };

    // ── Kiểm tra lô đã hết hạn chưa ───────────────────────────
    const isExpired = (expiryDate) => new Date(expiryDate) <= new Date();

    // ── Format ngày hiển thị ────────────────────────────────────
    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('vi-VN');
    };

    return (
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: 20 }}>
            <h1>📦 Quản lý Lô hàng</h1>

            {/* ── FORM NHẬP LÔ HÀNG ────────────────────────────── */}
            <div style={{ background: '#f9f9f9', padding: 20, borderRadius: 8, marginBottom: 30 }}>
                <h2>{editingId ? '✏️ Cập nhật lô hàng' : '➕ Nhập lô hàng mới'}</h2>
                <form onSubmit={handleSubmit}>
                    {/* Chọn sản phẩm */}
                    <div style={{ marginBottom: 12 }}>
                        <label><strong>Sản phẩm:</strong></label><br />
                        <select
                            name="product"
                            value={formData.product}
                            onChange={handleChange}
                            disabled={!!editingId}
                            style={{ width: '100%', padding: 8, fontSize: 14 }}
                        >
                            <option value="">-- Chọn sản phẩm --</option>
                            {products.map((p) => (
                                <option key={p._id} value={p._id}>
                                    {p.name} ({p.unit}) - {p.price?.toLocaleString('vi-VN')}đ
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Mã lô hàng */}
                    <div style={{ marginBottom: 12 }}>
                        <label><strong>Mã lô hàng:</strong></label><br />
                        <input
                            type="text"
                            name="batchNumber"
                            value={formData.batchNumber}
                            onChange={handleChange}
                            placeholder="VD: LOT-2026-001"
                            style={{ width: '100%', padding: 8, fontSize: 14 }}
                        />
                    </div>

                    {/* Số lượng */}
                    <div style={{ marginBottom: 12 }}>
                        <label><strong>Số lượng:</strong></label><br />
                        <input
                            type="number"
                            name="quantity"
                            value={formData.quantity}
                            onChange={handleChange}
                            min="1"
                            placeholder="Nhập số lượng"
                            style={{ width: '100%', padding: 8, fontSize: 14 }}
                        />
                    </div>

                    {/* Ngày sản xuất & Ngày hết hạn (cùng hàng) */}
                    <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                        <div style={{ flex: 1 }}>
                            <label><strong>Ngày sản xuất:</strong></label><br />
                            <input
                                type="date"
                                name="manufacturingDate"
                                value={formData.manufacturingDate}
                                onChange={handleChange}
                                style={{ width: '100%', padding: 8, fontSize: 14 }}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label><strong>Ngày hết hạn:</strong></label><br />
                            <input
                                type="date"
                                name="expiryDate"
                                value={formData.expiryDate}
                                onChange={handleChange}
                                style={{ width: '100%', padding: 8, fontSize: 14 }}
                            />
                        </div>
                    </div>

                    {/* Nút Submit + Hủy */}
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button
                            type="submit"
                            style={{
                                padding: '10px 24px',
                                fontSize: 14,
                                backgroundColor: editingId ? '#f0ad4e' : '#5cb85c',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 4,
                                cursor: 'pointer',
                            }}
                        >
                            {editingId ? '💾 Cập nhật' : '📥 Nhập kho'}
                        </button>
                        {editingId && (
                            <button
                                type="button"
                                onClick={resetForm}
                                style={{
                                    padding: '10px 24px',
                                    fontSize: 14,
                                    backgroundColor: '#d9534f',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 4,
                                    cursor: 'pointer',
                                }}
                            >
                                ❌ Hủy
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {/* ── BẢNG DANH SÁCH LÔ HÀNG ───────────────────────── */}
            <h2>📋 Danh sách Lô hàng</h2>

            {loading ? (
                <p>Đang tải...</p>
            ) : batches.length === 0 ? (
                <p>Chưa có lô hàng nào.</p>
            ) : (
                <>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                        <thead>
                            <tr style={{ background: '#eee' }}>
                                <th style={thStyle}>Mã lô</th>
                                <th style={thStyle}>Sản phẩm</th>
                                <th style={thStyle}>SL hiện tại</th>
                                <th style={thStyle}>SL ban đầu</th>
                                <th style={thStyle}>Ngày SX</th>
                                <th style={thStyle}>Ngày HH</th>
                                <th style={thStyle}>Trạng thái</th>
                                <th style={thStyle}>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {batches.map((batch) => (
                                <tr
                                    key={batch._id}
                                    style={{
                                        background: isExpired(batch.expiryDate) ? '#ffe6e6' : '#fff',
                                    }}
                                >
                                    <td style={tdStyle}>{batch.batchNumber}</td>
                                    <td style={tdStyle}>{batch.product?.name || 'N/A'}</td>
                                    <td style={tdStyle}>{batch.quantity}</td>
                                    <td style={tdStyle}>{batch.originalQuantity}</td>
                                    <td style={tdStyle}>{formatDate(batch.manufacturingDate)}</td>
                                    <td style={tdStyle}>{formatDate(batch.expiryDate)}</td>
                                    <td style={tdStyle}>
                                        {isExpired(batch.expiryDate) ? (
                                            <span style={{ color: 'red', fontWeight: 'bold' }}>⛔ Hết hạn</span>
                                        ) : (
                                            <span style={{ color: 'green' }}>✅ Còn hạn</span>
                                        )}
                                    </td>
                                    <td style={tdStyle}>
                                        <button
                                            onClick={() => handleEdit(batch)}
                                            style={{ marginRight: 6, cursor: 'pointer' }}
                                        >
                                            ✏️ Sửa
                                        </button>
                                        <button
                                            onClick={() => handleDelete(batch._id, batch.batchNumber)}
                                            style={{ cursor: 'pointer', color: 'red' }}
                                        >
                                            🗑️ Xóa
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Phân trang */}
                    {pagination.totalPages > 1 && (
                        <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'center' }}>
                            <button
                                disabled={pagination.page <= 1}
                                onClick={() => fetchBatches(pagination.page - 1)}
                                style={{ padding: '6px 14px', cursor: 'pointer' }}
                            >
                                ← Trước
                            </button>
                            <span style={{ lineHeight: '32px' }}>
                                Trang {pagination.page} / {pagination.totalPages}
                            </span>
                            <button
                                disabled={pagination.page >= pagination.totalPages}
                                onClick={() => fetchBatches(pagination.page + 1)}
                                style={{ padding: '6px 14px', cursor: 'pointer' }}
                            >
                                Sau →
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

// ── Style dùng chung cho bảng ───────────────────────────────────
const thStyle = { padding: '10px 8px', textAlign: 'left', borderBottom: '2px solid #ccc' };
const tdStyle = { padding: '8px', borderBottom: '1px solid #eee' };

export default AdminBatchPage;
