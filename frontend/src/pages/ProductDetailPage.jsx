import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getProductByIdAPI } from '../api/productService';
import { toggleWishlistAPI, checkWishlistAPI } from '../api/wishlistService';
import { addToCartAPI } from '../api/cartService';
import { useAuth } from '../contexts/AuthContext';
import ProductReviews from '../components/ProductReviews';

const fmt = (v) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

function ProductDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState(0);
    const [inWishlist, setInWishlist] = useState(false);
    const [wishlistLoading, setWishlistLoading] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [addingToCart, setAddingToCart] = useState(false);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const result = await getProductByIdAPI(id);
                setProduct(result.product);
            } catch (error) {
                toast.error(error.response?.data?.message || 'Không tìm thấy sản phẩm');
                navigate('/products');
            } finally {
                setLoading(false);
            }
        };
        fetchProduct();
    }, [id, navigate]);

    useEffect(() => {
        if (!user || !id) return;
        checkWishlistAPI(id).then(r => setInWishlist(r.inWishlist)).catch(() => {});
    }, [id, user]);

    const handleToggleWishlist = async () => {
        if (!user) { toast.info('Vui lòng đăng nhập để lưu yêu thích.'); return; }
        setWishlistLoading(true);
        try {
            const r = await toggleWishlistAPI(id);
            setInWishlist(r.added);
            toast.success(r.added ? '❤️ Đã thêm vào yêu thích!' : '💔 Đã xóa khỏi yêu thích.');
        } catch (e) {
            toast.error(e.response?.data?.message || 'Có lỗi xảy ra.');
        } finally {
            setWishlistLoading(false);
        }
    };

    const handleAddToCart = async () => {
        if (!user) { toast.info('Vui lòng đăng nhập để mua hàng.'); navigate('/login'); return; }
        if (product.status === 'Ngừng kinh doanh') { toast.error('Sản phẩm này hiện không còn kinh doanh.'); return; }
        setAddingToCart(true);
        try {
            await addToCartAPI(id, quantity);
            toast.success(`✅ Đã thêm ${quantity} ${product.unit} "${product.name}" vào giỏ hàng!`);
        } catch (e) {
            toast.error(e.response?.data?.message || 'Không thể thêm vào giỏ hàng.');
        } finally {
            setAddingToCart(false);
        }
    };

    if (loading) return (
        <div className="loading-wrap">
            <div className="spinner" />
            <p className="loading-text">Đang tải sản phẩm...</p>
        </div>
    );

    if (!product) return (
        <div className="empty-state" style={{ marginTop: 60 }}>
            <div className="empty-state-icon">🔍</div>
            <h3>Không tìm thấy sản phẩm</h3>
            <button className="btn btn-primary" onClick={() => navigate('/products')}>← Về danh sách</button>
        </div>
    );

    return (
        <div style={{ background: 'var(--c-bg)', minHeight: '100vh' }}>
            {/* ── Page header ─────────────────────────────────── */}
            <div className="page-header">
                <div className="page-header-inner">
                    <button className="page-header-back" onClick={() => navigate('/products')}>← Danh sách</button>
                    <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{product.name}</h1>
                </div>
            </div>

            <div className="container" style={{ padding: '28px 16px' }}>
                {/* ── Main two-column layout ─────────────────── */}
                <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', marginBottom: 28 }}>

                    {/* ── Images column ──────────────────────── */}
                    <div style={{ flex: '1 1 340px', minWidth: 0 }}>
                        <div style={{
                            width: '100%', aspectRatio: '1/1', borderRadius: 16,
                            overflow: 'hidden', border: '1px solid var(--s-border)',
                            background: 'var(--c-50)', marginBottom: 12,
                        }}>
                            {product.images?.length > 0 ? (
                                <img src={product.images[selectedImage]} alt={product.name}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80 }}>🥬</div>
                            )}
                        </div>
                        {product.images?.length > 1 && (
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {product.images.map((img, idx) => (
                                    <img key={idx} src={img} alt={`Ảnh ${idx + 1}`}
                                        onClick={() => setSelectedImage(idx)}
                                        style={{
                                            width: 64, height: 64, objectFit: 'cover', borderRadius: 8,
                                            cursor: 'pointer',
                                            border: idx === selectedImage ? '3px solid var(--c-primary)' : '2px solid var(--s-border)',
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ── Info column ────────────────────────── */}
                    <div style={{ flex: '1 1 340px', minWidth: 0 }}>
                        <div className="card">
                            <div className="card-body">
                                {/* Title + wishlist */}
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                                    <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--t-heading)', lineHeight: 1.3 }}>{product.name}</h2>
                                    <button onClick={handleToggleWishlist} disabled={wishlistLoading}
                                        title={inWishlist ? 'Xóa khỏi yêu thích' : 'Thêm vào yêu thích'}
                                        style={{
                                            background: inWishlist ? '#fff5f5' : 'var(--c-50)',
                                            border: `2px solid ${inWishlist ? '#e53935' : 'var(--s-border)'}`,
                                            borderRadius: '50%', width: 44, height: 44, fontSize: 20,
                                            cursor: wishlistLoading ? 'not-allowed' : 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            flexShrink: 0, opacity: wishlistLoading ? 0.6 : 1,
                                        }}
                                    >
                                        {inWishlist ? '❤️' : '🤍'}
                                    </button>
                                </div>

                                {/* Price */}
                                <p style={{ fontSize: 32, fontWeight: 800, color: 'var(--c-primary)', margin: '0 0 12px' }}>
                                    {fmt(product.price)} <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--t-secondary)' }}>/ {product.unit}</span>
                                </p>

                                {/* Standards badge */}
                                <div style={{ marginBottom: 16 }}>
                                    <span className={`badge ${product.standards === 'Organic' ? 'badge-green' : 'badge-blue'}`}>
                                        ✅ {product.standards}
                                    </span>
                                </div>

                                {/* Info rows */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                                    <div style={{ display: 'flex', gap: 8, fontSize: 14 }}>
                                        <span style={{ color: 'var(--t-muted)', minWidth: 140 }}>Danh mục</span>
                                        <span style={{ fontWeight: 600, color: 'var(--t-heading)' }}>{product.category?.name || '—'}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, fontSize: 14 }}>
                                        <span style={{ color: 'var(--t-muted)', minWidth: 140 }}>📅 Ngày thu hoạch</span>
                                        <span style={{ fontWeight: 600, color: 'var(--t-heading)' }}>{fmtDate(product.harvestDate)}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, fontSize: 14 }}>
                                        <span style={{ color: 'var(--t-muted)', minWidth: 140 }}>⏰ Hạn sử dụng</span>
                                        <span style={{ fontWeight: 600, color: 'var(--t-heading)' }}>{fmtDate(product.expiryDate)}</span>
                                    </div>
                                </div>

                                {/* Description */}
                                {product.description && (
                                    <div style={{ background: 'var(--c-50)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, borderLeft: '4px solid var(--c-primary)' }}>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-primary)', marginBottom: 6 }}>Mô tả sản phẩm</div>
                                        <p style={{ margin: 0, fontSize: 14, color: 'var(--t-body)', lineHeight: 1.7 }}>{product.description}</p>
                                    </div>
                                )}

                                {/* Add to cart */}
                                <div style={{ borderTop: '1px solid var(--s-divider)', paddingTop: 20 }}>
                                    {product.status === 'Ngừng kinh doanh' ? (
                                        <div className="alert alert-danger" style={{ textAlign: 'center', fontWeight: 700 }}>
                                            ❌ Sản phẩm này hiện không còn kinh doanh
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                                            <div className="qty-control">
                                                <button className="qty-btn" type="button" onClick={() => setQuantity(q => Math.max(1, q - 1))}>−</button>
                                                <input className="qty-input" type="number" min={1} value={quantity}
                                                    onChange={e => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))} />
                                                <button className="qty-btn" type="button" onClick={() => setQuantity(q => q + 1)}>+</button>
                                            </div>
                                            <button className="btn btn-primary btn-lg" style={{ flex: 1, minWidth: 180 }}
                                                onClick={handleAddToCart} disabled={addingToCart}>
                                                {addingToCart ? '⏳ Đang thêm...' : '🛒 Thêm vào giỏ hàng'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Truy xuất nguồn gốc ────────────────────── */}
                {product.farm && (
                    <div className="card" style={{ marginBottom: 28 }}>
                        <div className="card-header">
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                                🌾 Truy xuất nguồn gốc
                            </h3>
                        </div>
                        <div className="card-body">
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
                                {[
                                    { icon: '🏡', label: 'Trang trại', val: product.farm.name, bold: true },
                                    { icon: '📍', label: 'Địa chỉ', val: product.farm.location },
                                    { icon: '📞', label: 'Liên hệ', val: product.farm.contact },
                                    { icon: '🏅', label: 'Chứng nhận', val: product.farm.certificate, badge: true },
                                ].map(({ icon, label, val, bold, badge }) => (
                                    <div key={label} style={{ background: 'var(--c-50)', borderRadius: 10, padding: '12px 16px' }}>
                                        <div style={{ fontSize: 12, color: 'var(--t-muted)', marginBottom: 4 }}>{icon} {label}</div>
                                        {badge
                                            ? <span className="badge badge-orange">{val}</span>
                                            : <div style={{ fontWeight: bold ? 700 : 500, color: 'var(--t-heading)', fontSize: 15 }}>{val}</div>
                                        }
                                    </div>
                                ))}
                            </div>

                            {product.farm.description && (
                                <div style={{ background: 'var(--c-100)', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-dark)', marginBottom: 6 }}>Giới thiệu trang trại</div>
                                    <p style={{ margin: 0, fontSize: 14, color: 'var(--t-body)', lineHeight: 1.7 }}>{product.farm.description}</p>
                                </div>
                            )}

                            <div style={{ borderLeft: '4px solid var(--c-primary)', paddingLeft: 16 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-primary)', marginBottom: 10 }}>📋 Chuỗi truy xuất</div>
                                {[
                                    { icon: '🌱', label: 'Thu hoạch', val: `${fmtDate(product.harvestDate)} tại ${product.farm.name}` },
                                    { icon: '✅', label: 'Tiêu chuẩn', val: product.standards },
                                    { icon: '📦', label: 'Đơn vị', val: product.unit },
                                    { icon: '⏰', label: 'Hạn sử dụng', val: fmtDate(product.expiryDate) },
                                ].map(({ icon, label, val }) => (
                                    <div key={label} style={{ display: 'flex', gap: 8, fontSize: 14, marginBottom: 8 }}>
                                        <span>{icon} <strong>{label}:</strong></span>
                                        <span style={{ color: 'var(--t-secondary)' }}>{val}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Reviews ──────────────────────────────────── */}
                <ProductReviews productId={id} />
            </div>
        </div>
    );
}

export default ProductDetailPage;
