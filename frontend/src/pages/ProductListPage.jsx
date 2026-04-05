import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { searchProductsAPI } from '../api/productService';
import { addToCartAPI } from '../api/cartService';
import { useAuth } from '../contexts/AuthContext';
import SearchBar from '../components/SearchBar';
import FilterBar from '../components/FilterBar';

// ── Trang công khai: Danh sách sản phẩm với tìm kiếm & bộ lọc ──
function ProductListPage() {
    const navigate = useNavigate();
    const { user } = useAuth();

    // State danh sách sản phẩm & phân trang
    const [products, setProducts] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [loading, setLoading] = useState(false);
    const [addingProductId, setAddingProductId] = useState(null); // id sản phẩm đang thêm vào giỏ

    // State tìm kiếm & filter hiện tại
    const [searchQuery, setSearchQuery] = useState('');
    const [filterParams, setFilterParams] = useState({});

    // ── Lấy sản phẩm với search + filter ────────────────────────
    const fetchProducts = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            // Kết hợp search query và filter params
            const params = {
                page,
                limit: 12,
                ...filterParams,
            };
            if (searchQuery) {
                params.search = searchQuery;
            }

            const result = await searchProductsAPI(params);
            setProducts(result.products);
            setPagination(result.pagination);
        } catch (error) {
            const msg = error.response?.data?.message || 'Lỗi khi tải sản phẩm';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    }, [searchQuery, filterParams]);

    // Gọi lại khi search hoặc filter thay đổi
    useEffect(() => {
        fetchProducts(1);
    }, [fetchProducts]);

    // ── Xử lý tìm kiếm ────────────────────────────────────────
    const handleSearch = (text) => {
        setSearchQuery(text);
    };

    // ── Xử lý bộ lọc ──────────────────────────────────────────
    const handleFilter = (params) => {
        setFilterParams(params);
    };

    // ── Chuyển trang ────────────────────────────────────────────
    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            fetchProducts(newPage);
        }
    };
    // ── Thêm nhanh vào giỏ hàng ─────────────────────────────────
    const handleQuickAddToCart = async (e, prod) => {
        e.stopPropagation(); // Không navigate vào trang chi tiết
        if (!user) {
            toast.info('Vui lòng đăng nhập để mua hàng.');
            navigate('/login');
            return;
        }
        if (prod.status === 'Ngừng kinh doanh') {
            toast.error('Sản phẩm này hiện không còn kinh doanh.');
            return;
        }
        setAddingProductId(prod._id);
        try {
            await addToCartAPI(prod._id, 1);
            toast.success(`✅ Đã thêm "${prod.name}" vào giỏ hàng!`);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể thêm vào giỏ hàng.');
        } finally {
            setAddingProductId(null);
        }
    };
    // ── Xem chi tiết sản phẩm ──────────────────────────────────
    const handleViewDetail = (productId) => {
        navigate(`/products/${productId}`);
    };

    // ── Format giá VND ──────────────────────────────────────────
    const formatPrice = (price) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
    };

    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <h1 style={{ marginBottom: '20px' }}>🌿 Sản phẩm thực phẩm sạch</h1>

            {/* ── Thanh tìm kiếm ─────────────────────────────── */}
            <SearchBar onSearch={handleSearch} />

            {/* ── Bộ lọc nâng cao ────────────────────────────── */}
            <FilterBar onFilter={handleFilter} />

            {/* ── Thông báo loading ──────────────────────────── */}
            {loading && <p style={{ textAlign: 'center', padding: '20px' }}>Đang tải sản phẩm...</p>}

            {/* ── Danh sách sản phẩm (Grid) ──────────────────── */}
            {!loading && (
                <>
                    {products.length === 0 ? (
                        <div style={{
                            textAlign: 'center', padding: '40px', backgroundColor: '#f8f9fa',
                            borderRadius: '8px', color: '#6c757d',
                        }}>
                            <p style={{ fontSize: '18px', marginBottom: '8px' }}>Không tìm thấy sản phẩm nào</p>
                            <p>Hãy thử thay đổi từ khóa tìm kiếm hoặc bộ lọc</p>
                        </div>
                    ) : (
                        <div style={{
                            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                            gap: '20px', marginBottom: '20px',
                        }}>
                            {products.map((prod) => (
                                <div
                                    key={prod._id}
                                    onClick={() => handleViewDetail(prod._id)}
                                    style={{
                                        border: '1px solid #dee2e6', borderRadius: '8px',
                                        overflow: 'hidden', cursor: 'pointer',
                                        transition: 'box-shadow 0.2s',
                                        backgroundColor: '#fff',
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
                                >
                                    {/* Ảnh sản phẩm */}
                                    <div style={{ height: '180px', backgroundColor: '#f0f0f0', overflow: 'hidden' }}>
                                        {prod.images && prod.images.length > 0 ? (
                                            <img src={prod.images[0]} alt={prod.name}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{
                                                width: '100%', height: '100%', display: 'flex',
                                                alignItems: 'center', justifyContent: 'center',
                                                color: '#adb5bd', fontSize: '40px',
                                            }}>
                                                🥬
                                            </div>
                                        )}
                                    </div>

                                    {/* Thông tin sản phẩm */}
                                    <div style={{ padding: '12px' }}>
                                        <h3 style={{ margin: '0 0 6px', fontSize: '16px', color: '#212529' }}>
                                            {prod.name}
                                        </h3>
                                        <p style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 'bold', color: '#e74c3c' }}>
                                            {formatPrice(prod.price)}/{prod.unit}
                                        </p>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                                            <span style={{
                                                padding: '2px 8px', borderRadius: '4px',
                                                backgroundColor: prod.standards === 'Organic' ? '#d4edda' : '#cce5ff',
                                                color: prod.standards === 'Organic' ? '#155724' : '#004085',
                                            }}>
                                                {prod.standards}
                                            </span>
                                            <span style={{ color: '#6c757d' }}>
                                                {prod.farm?.name || ''}
                                            </span>
                                        </div>
                                        <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#6c757d' }}>
                                            Danh mục: {prod.category?.name || '—'}
                                        </p>
                                        {/* Nút thêm nhanh vào giỏ */}
                                        <button
                                            onClick={(e) => handleQuickAddToCart(e, prod)}
                                            disabled={addingProductId === prod._id || prod.status === 'Ngừng kinh doanh'}
                                            style={{
                                                marginTop: '10px', width: '100%',
                                                padding: '8px', border: 'none', borderRadius: '6px',
                                                backgroundColor: prod.status === 'Ngừng kinh doanh' ? '#adb5bd' : '#28a745',
                                                color: '#fff', cursor: (addingProductId === prod._id || prod.status === 'Ngừng kinh doanh') ? 'not-allowed' : 'pointer',
                                                fontWeight: 'bold', fontSize: '13px',
                                                opacity: addingProductId === prod._id ? 0.7 : 1,
                                                transition: 'opacity 0.2s',
                                            }}
                                        >
                                            {addingProductId === prod._id ? '⏳ Đang thêm...' : prod.status === 'Ngừng kinh doanh' ? '❌ Hết hàng' : '🛒 Thêm vào giỏ'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* ── Phân trang ─────────────────────────────────── */}
            {pagination.totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
                    <button onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page <= 1}
                        style={{ padding: '8px 16px', cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer' }}>
                        ← Trước
                    </button>
                    <span style={{ padding: '8px 16px', lineHeight: '1.5' }}>
                        Trang {pagination.page} / {pagination.totalPages} (Tổng: {pagination.total} sản phẩm)
                    </span>
                    <button onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}
                        style={{ padding: '8px 16px', cursor: pagination.page >= pagination.totalPages ? 'not-allowed' : 'pointer' }}>
                        Sau →
                    </button>
                </div>
            )}
        </div>
    );
}

export default ProductListPage;
