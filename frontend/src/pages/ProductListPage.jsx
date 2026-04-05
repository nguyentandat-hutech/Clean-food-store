import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { searchProductsAPI } from '../api/productService';
import { addToCartAPI } from '../api/cartService';
import { useAuth } from '../contexts/AuthContext';
import SearchBar from '../components/SearchBar';
import FilterBar from '../components/FilterBar';

const fmt = (p) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p);

function ProductListPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [products, setProducts] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [loading, setLoading] = useState(false);
    const [addingProductId, setAddingProductId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterParams, setFilterParams] = useState({});

    const fetchProducts = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const params = { page, limit: 12, ...filterParams };
            if (searchQuery) params.search = searchQuery;
            const result = await searchProductsAPI(params);
            setProducts(result.products);
            setPagination(result.pagination);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi tải sản phẩm');
        } finally { setLoading(false); }
    }, [searchQuery, filterParams]);

    useEffect(() => { fetchProducts(1); }, [fetchProducts]);

    const handleSearch = (text) => setSearchQuery(text);
    const handleFilter = (params) => setFilterParams(params);
    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) fetchProducts(newPage);
    };

    const handleQuickAddToCart = async (e, prod) => {
        e.stopPropagation();
        if (!user) { toast.info('Vui lòng đăng nhập để mua hàng.'); navigate('/login'); return; }
        if (prod.status === 'Ngừng kinh doanh') { toast.error('Sản phẩm này hiện không còn kinh doanh.'); return; }
        setAddingProductId(prod._id);
        try {
            await addToCartAPI(prod._id, 1);
            toast.success(`✅ Đã thêm "${prod.name}" vào giỏ hàng!`);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể thêm vào giỏ hàng.');
        } finally { setAddingProductId(null); }
    };

    return (
        <div style={{ background: 'var(--c-bg)', minHeight: '100vh' }}>
            <div className="page-header">
                <div className="page-header-inner">
                    <div className="page-header-icon">🌿</div>
                    <div>
                        <h1>Sản phẩm thực phẩm sạch</h1>
                        <p>Tìm kiếm và lọc {pagination.total} sản phẩm chất lượng cao</p>
                    </div>
                </div>
            </div>

            <div className="container" style={{ paddingBottom: 48 }}>
                <SearchBar onSearch={handleSearch} />
                <FilterBar onFilter={handleFilter} />

                {loading ? (
                    <div className="loading-wrap"><div className="spinner" /><p className="loading-text">Đang tải sản phẩm...</p></div>
                ) : products.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">🔍</div>
                        <h3>Không tìm thấy sản phẩm nào</h3>
                        <p>Hãy thử thay đổi từ khóa tìm kiếm hoặc bộ lọc</p>
                    </div>
                ) : (
                    <>
                        <div className="product-grid">
                            {products.map((prod) => (
                                <div key={prod._id} className="product-card card-hover"
                                    onClick={() => navigate(`/products/${prod._id}`)}>
                                    <div className="product-img">
                                        {prod.images?.[0]
                                            ? <img src={prod.images[0]} alt={prod.name} />
                                            : <span style={{ fontSize: 48 }}>🥬</span>}
                                    </div>
                                    <div className="product-body">
                                        <h3 className="product-name">{prod.name}</h3>
                                        <div className="product-price">{fmt(prod.price)}<span className="product-unit">/{prod.unit}</span></div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                            <span className={`badge ${prod.standards === 'Organic' ? 'badge-green' : 'badge-blue'}`}>{prod.standards}</span>
                                            <span style={{ fontSize: 12, color: 'var(--t-muted)' }}>{prod.farm?.name || ''}</span>
                                        </div>
                                        {prod.averageRating > 0 && (
                                            <div style={{ fontSize: 12, color: 'var(--t-muted)', marginBottom: 6 }}>
                                                ⭐ {prod.averageRating} ({prod.reviewCount} đánh giá)
                                            </div>
                                        )}
                                        <button className={`btn btn-full btn-sm ${prod.status === 'Ngừng kinh doanh' ? 'btn-secondary' : 'btn-primary'}`}
                                            onClick={(e) => handleQuickAddToCart(e, prod)}
                                            disabled={addingProductId === prod._id || prod.status === 'Ngừng kinh doanh'}
                                            style={{ marginTop: 'auto' }}>
                                            {addingProductId === prod._id ? '⏳ Đang thêm...'
                                                : prod.status === 'Ngừng kinh doanh' ? 'Hết hàng'
                                                    : '🛒 Thêm vào giỏ'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {pagination.totalPages > 1 && (
                            <div className="pagination">
                                <button className="page-btn" onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page <= 1}>← Trước</button>
                                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
                                    <button key={p} className={`page-btn${p === pagination.page ? ' active' : ''}`} onClick={() => handlePageChange(p)}>{p}</button>
                                ))}
                                <button className="page-btn" onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}>Sau →</button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default ProductListPage;
