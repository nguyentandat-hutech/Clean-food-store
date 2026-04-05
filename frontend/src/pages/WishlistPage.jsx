import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getWishlistAPI, removeFromWishlistAPI } from '../api/wishlistService';
import { addToCartAPI } from '../api/cartService';
import { useAuth } from '../contexts/AuthContext';

// ── Trang Danh sách Yêu thích ──────────────────────────────────
function WishlistPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [wishlist, setWishlist] = useState(null);
    const [loading, setLoading] = useState(true);
    const [removing, setRemoving] = useState(null);       // productId đang xóa
    const [addingProductId, setAddingProductId] = useState(null); // productId đang thêm vào giỏ

    // ── Lấy wishlist khi vào trang ─────────────────────────────
    useEffect(() => {
        const fetch = async () => {
            try {
                const data = await getWishlistAPI();
                setWishlist(data.wishlist);
            } catch (error) {
                toast.error(error.response?.data?.message || 'Không thể tải danh sách yêu thích.');
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, []);

    // ── Thêm sản phẩm vào giỏ hàng ──────────────────────────────
    const handleAddToCart = async (productId, productName) => {
        if (!user) {
            toast.info('Vui lòng đăng nhập để mua hàng.');
            navigate('/login');
            return;
        }
        setAddingProductId(productId);
        try {
            await addToCartAPI(productId, 1);
            toast.success(`✅ Đã thêm "${productName}" vào giỏ hàng!`);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể thêm vào giỏ hàng.');
        } finally {
            setAddingProductId(null);
        }
    };

    // ── Xóa sản phẩm khỏi wishlist ─────────────────────────────
    const handleRemove = async (productId) => {
        setRemoving(productId);
        try {
            const data = await removeFromWishlistAPI(productId);
            setWishlist(data.wishlist);
            toast.success('Đã xóa khỏi danh sách yêu thích.');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra.');
        } finally {
            setRemoving(null);
        }
    };

    // ── Format giá VND ──────────────────────────────────────────
    const formatPrice = (price) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

    // ── Inline styles ───────────────────────────────────────────
    const cardStyle = {
        display: 'flex', gap: '16px', padding: '16px',
        border: '1px solid #dee2e6', borderRadius: '8px',
        backgroundColor: '#fff', marginBottom: '12px',
        alignItems: 'center',
    };
    const imgStyle = {
        width: '80px', height: '80px', objectFit: 'cover',
        borderRadius: '6px', border: '1px solid #e9ecef',
        flexShrink: 0,
    };
    const btnStyle = (disabled) => ({
        padding: '8px 14px', borderRadius: '6px', cursor: disabled ? 'not-allowed' : 'pointer',
        border: 'none', fontSize: '13px', fontWeight: '500', opacity: disabled ? 0.6 : 1,
    });

    if (loading) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <p>Đang tải danh sách yêu thích...</p>
            </div>
        );
    }

    const products = wishlist?.products || [];

    return (
        <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <button
                    onClick={() => navigate('/')}
                    style={{ padding: '8px 16px', cursor: 'pointer', border: '1px solid #ced4da', borderRadius: '4px', backgroundColor: '#f8f9fa' }}
                >
                    ← Trang chủ
                </button>
                <h1 style={{ margin: 0, fontSize: '22px' }}>
                    ❤️ Danh sách yêu thích
                    <span style={{
                        marginLeft: '10px', fontSize: '14px', fontWeight: 'normal',
                        backgroundColor: '#e9ecef', borderRadius: '12px', padding: '2px 10px',
                    }}>
                        {products.length} sản phẩm
                    </span>
                </h1>
            </div>

            {/* Danh sách trống */}
            {products.length === 0 && (
                <div style={{
                    textAlign: 'center', padding: '60px 20px',
                    border: '1px dashed #dee2e6', borderRadius: '8px', color: '#6c757d',
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🤍</div>
                    <h3 style={{ margin: '0 0 8px' }}>Chưa có sản phẩm yêu thích</h3>
                    <p style={{ margin: '0 0 20px', fontSize: '14px' }}>
                        Nhấn vào nút ❤️ trên trang chi tiết sản phẩm để lưu sản phẩm bạn thích.
                    </p>
                    <button
                        onClick={() => navigate('/products')}
                        style={{ ...btnStyle(false), backgroundColor: '#007bff', color: '#fff', padding: '10px 24px' }}
                    >
                        🛒 Xem sản phẩm
                    </button>
                </div>
            )}

            {/* Danh sách sản phẩm */}
            {products.map((product) => (
                <div key={product._id} style={cardStyle}>
                    {/* Hình ảnh */}
                    <div
                        style={{ ...imgStyle, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8f9fa', fontSize: '32px' }}
                        onClick={() => navigate(`/products/${product._id}`)}
                    >
                        {product.images?.[0]
                            ? <img src={product.images[0]} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px' }} />
                            : '🥬'}
                    </div>

                    {/* Thông tin */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <h3
                            style={{ margin: '0 0 4px', fontSize: '16px', cursor: 'pointer', color: '#212529' }}
                            onClick={() => navigate(`/products/${product._id}`)}
                        >
                            {product.name}
                        </h3>
                        <p style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 'bold', color: '#e74c3c' }}>
                            {formatPrice(product.price)} / {product.unit}
                        </p>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                            {product.standards && (
                                <span style={{
                                    fontSize: '12px', padding: '2px 8px', borderRadius: '12px',
                                    backgroundColor: product.standards === 'Organic' ? '#d4edda' : '#cce5ff',
                                    color: product.standards === 'Organic' ? '#155724' : '#004085',
                                }}>
                                    ✅ {product.standards}
                                </span>
                            )}
                            {product.averageRating > 0 && (
                                <span style={{ fontSize: '13px', color: '#6c757d' }}>
                                    ⭐ {product.averageRating} ({product.reviewCount})
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
                        <button
                            onClick={() => navigate(`/products/${product._id}`)}
                            style={{ ...btnStyle(false), backgroundColor: '#007bff', color: '#fff' }}
                        >
                            Xem chi tiết
                        </button>
                        <button
                            onClick={() => handleAddToCart(product._id, product.name)}
                            disabled={addingProductId === product._id || product.status === 'Ngừng kinh doanh'}
                            style={{ ...btnStyle(addingProductId === product._id || product.status === 'Ngừng kinh doanh'), backgroundColor: '#28a745', color: '#fff' }}
                        >
                            {addingProductId === product._id ? '⏳ Đang thêm...' : product.status === 'Ngừng kinh doanh' ? '❌ Hết hàng' : '🛒 Thêm vào giỏ'}
                        </button>
                        <button
                            onClick={() => handleRemove(product._id)}
                            disabled={removing === product._id}
                            style={{ ...btnStyle(removing === product._id), backgroundColor: '#fff', color: '#dc3545', border: '1px solid #dc3545' }}
                        >
                            {removing === product._id ? 'Đang xóa...' : '🗑️ Xóa'}
                        </button>
                    </div>
                </div>
            ))}

            {/* Nút điều hướng dưới trang */}
            {products.length > 0 && (
                <div style={{ marginTop: '24px', textAlign: 'center' }}>
                    <button
                        onClick={() => navigate('/products')}
                        style={{ ...btnStyle(false), backgroundColor: '#28a745', color: '#fff', padding: '10px 28px', fontSize: '14px' }}
                    >
                        🛒 Tiếp tục mua sắm
                    </button>
                </div>
            )}
        </div>
    );
}

export default WishlistPage;
