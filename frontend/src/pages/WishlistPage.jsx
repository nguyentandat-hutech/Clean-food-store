import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getWishlistAPI, removeFromWishlistAPI } from '../api/wishlistService';
import { addToCartAPI } from '../api/cartService';
import { useAuth } from '../contexts/AuthContext';

const fmt = (p) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p);

function WishlistPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [wishlist, setWishlist] = useState(null);
    const [loading, setLoading] = useState(true);
    const [removing, setRemoving] = useState(null);
    const [addingProductId, setAddingProductId] = useState(null);

    useEffect(() => {
        const fetch = async () => {
            try {
                const data = await getWishlistAPI();
                setWishlist(data.wishlist);
            } catch (error) {
                toast.error(error.response?.data?.message || 'Không thể tải danh sách yêu thích.');
            } finally { setLoading(false); }
        };
        fetch();
    }, []);

    const handleAddToCart = async (productId, productName) => {
        if (!user) { toast.info('Vui lòng đăng nhập để mua hàng.'); navigate('/login'); return; }
        setAddingProductId(productId);
        try {
            await addToCartAPI(productId, 1);
            toast.success(`✅ Đã thêm "${productName}" vào giỏ hàng!`);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể thêm vào giỏ hàng.');
        } finally { setAddingProductId(null); }
    };

    const handleRemove = async (productId) => {
        setRemoving(productId);
        try {
            const data = await removeFromWishlistAPI(productId);
            setWishlist(data.wishlist);
            toast.success('Đã xóa khỏi danh sách yêu thích.');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra.');
        } finally { setRemoving(null); }
    };

    if (loading) return (
        <div className="loading-wrap"><div className="spinner" /><p className="loading-text">Đang tải...</p></div>
    );

    const products = wishlist?.products || [];

    return (
        <div style={{ background: 'var(--c-bg)', minHeight: '100vh' }}>
            <div className="page-header">
                <div className="page-header-inner">
                    <div className="page-header-icon">❤️</div>
                    <div>
                        <h1>Danh sách yêu thích</h1>
                        <p>{products.length} sản phẩm đã lưu</p>
                    </div>
                </div>
            </div>

            <div className="container" style={{ paddingBottom: 48 }}>
                {products.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">🤍</div>
                        <h3>Chưa có sản phẩm yêu thích</h3>
                        <p>Nhấn vào nút ❤️ trên trang chi tiết sản phẩm để lưu sản phẩm bạn thích.</p>
                        <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => navigate('/products')}>
                            🛒 Xem sản phẩm
                        </button>
                    </div>
                ) : (
                    <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {products.map((product) => (
                                <div key={product._id} className="card card-hover" style={{ display: 'flex', gap: 16, padding: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                                    {/* Image */}
                                    <div onClick={() => navigate(`/products/${product._id}`)}
                                        style={{ width: 88, height: 88, flexShrink: 0, borderRadius: 10, overflow: 'hidden', background: 'var(--c-50)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>
                                        {product.images?.[0]
                                            ? <img src={product.images[0]} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            : '🥬'}
                                    </div>

                                    {/* Info */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <h3 style={{ margin: '0 0 4px', fontSize: 16, cursor: 'pointer', color: 'var(--t-heading)' }}
                                            onClick={() => navigate(`/products/${product._id}`)}>
                                            {product.name}
                                        </h3>
                                        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--c-primary)', marginBottom: 6 }}>
                                            {fmt(product.price)} <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--t-muted)' }}>/ {product.unit}</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                                            {product.standards && (
                                                <span className={`badge ${product.standards === 'Organic' ? 'badge-green' : 'badge-blue'}`}>✅ {product.standards}</span>
                                            )}
                                            {product.averageRating > 0 && (
                                                <span style={{ fontSize: 13, color: 'var(--t-muted)' }}>⭐ {product.averageRating} ({product.reviewCount})</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                                        <button className="btn btn-outline btn-sm" onClick={() => navigate(`/products/${product._id}`)}>Xem chi tiết</button>
                                        <button className="btn btn-primary btn-sm"
                                            onClick={() => handleAddToCart(product._id, product.name)}
                                            disabled={addingProductId === product._id || product.status === 'Ngừng kinh doanh'}>
                                            {addingProductId === product._id ? '⏳ Đang thêm...' : product.status === 'Ngừng kinh doanh' ? 'Hết hàng' : '🛒 Thêm vào giỏ'}
                                        </button>
                                        <button className="btn btn-danger btn-sm"
                                            onClick={() => handleRemove(product._id)}
                                            disabled={removing === product._id}>
                                            {removing === product._id ? 'Đang xóa...' : '🗑️ Xóa'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div style={{ marginTop: 24, textAlign: 'center' }}>
                            <button className="btn btn-primary" onClick={() => navigate('/products')}>🛒 Tiếp tục mua sắm</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default WishlistPage;
