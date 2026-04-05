import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCartAPI, updateCartItemAPI, removeCartItemAPI, clearCartAPI } from '../api/cartService';

const fmt = (price) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

const CartPage = () => {
    const navigate = useNavigate();
    const [cart, setCart] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionLoading, setActionLoading] = useState('');

    const fetchCart = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const data = await getCartAPI();
            setCart(data);
        } catch (err) {
            setError(err.response?.data?.message || 'Không thể tải giỏ hàng');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchCart(); }, [fetchCart]);

    const handleUpdateQuantity = async (productId, newQuantity) => {
        if (newQuantity < 1) return;
        try {
            setActionLoading(productId);
            setError('');
            const data = await updateCartItemAPI(productId, newQuantity);
            setCart(data);
        } catch (err) {
            setError(err.response?.data?.message || 'Không thể cập nhật số lượng');
        } finally {
            setActionLoading('');
        }
    };

    const handleRemoveItem = async (productId) => {
        if (!window.confirm('Bạn có chắc muốn xóa sản phẩm này khỏi giỏ hàng?')) return;
        try {
            setActionLoading(productId);
            setError('');
            const data = await removeCartItemAPI(productId);
            setCart(data);
        } catch (err) {
            setError(err.response?.data?.message || 'Không thể xóa sản phẩm');
        } finally {
            setActionLoading('');
        }
    };

    const handleClearCart = async () => {
        if (!window.confirm('Bạn có chắc muốn xóa toàn bộ giỏ hàng?')) return;
        try {
            setLoading(true);
            setError('');
            await clearCartAPI();
            await fetchCart();
        } catch (err) {
            setError(err.response?.data?.message || 'Không thể xóa giỏ hàng');
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="loading-wrap">
            <div className="spinner" />
            <p className="loading-text">Đang tải giỏ hàng...</p>
        </div>
    );

    return (
        <div style={{ background: 'var(--c-bg)', minHeight: '100vh' }}>
            {/* Page Header */}
            <div className="page-header">
                <div className="page-header-inner">
                    <div className="page-header-icon">🛒</div>
                    <div>
                        <h1>Giỏ hàng</h1>
                        <p>Xem lại sản phẩm trước khi đặt hàng</p>
                    </div>
                </div>
            </div>

            <div className="container" style={{ paddingBottom: 40 }}>
                {error && (
                    <div className="alert alert-danger" style={{ marginBottom: 20 }}>
                        ⚠️ {error}
                    </div>
                )}

                {!cart || cart.products.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">🛒</div>
                        <div className="empty-title">Giỏ hàng của bạn đang trống</div>
                        <div className="empty-desc">Hãy thêm sản phẩm vào giỏ hàng để tiếp tục mua sắm</div>
                        <button className="btn btn-primary" onClick={() => navigate('/products')}>
                            🛒 Tiếp tục mua sắm
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
                        {/* ── Product list ─────────────────────────── */}
                        <div className="card">
                            <div className="card-header" style={{ justifyContent: 'space-between' }}>
                                <h3>🛍️ Sản phẩm trong giỏ ({cart.totalItems})</h3>
                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={handleClearCart}
                                    style={{ color: 'var(--c-danger)', borderColor: 'var(--c-danger-border)' }}
                                >
                                    🗑️ Xóa tất cả
                                </button>
                            </div>
                            <div>
                                {cart.products.map((item, idx) => {
                                    const pid = item.productId._id;
                                    const busy = actionLoading === pid;
                                    const img = item.productId.images?.[0];
                                    return (
                                        <div
                                            key={pid}
                                            style={{
                                                display: 'flex', gap: 16, padding: '18px 20px',
                                                borderBottom: idx < cart.products.length - 1 ? '1px solid var(--s-divider)' : 'none',
                                                alignItems: 'center',
                                                opacity: busy ? .5 : 1,
                                                transition: 'opacity .2s',
                                            }}
                                        >
                                            {/* Image */}
                                            <div style={{ width: 72, height: 72, borderRadius: 10, overflow: 'hidden', background: 'var(--c-50)', flexShrink: 0 }}>
                                                {img
                                                    ? <img src={img} alt={item.productId.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🥦</div>
                                                }
                                            </div>

                                            {/* Info */}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--t-heading)', marginBottom: 3 }}>
                                                    {item.productId.name}
                                                </div>
                                                <div style={{ fontSize: 13, color: 'var(--t-muted)', marginBottom: 8 }}>
                                                    {item.productId.unit}
                                                    {item.effectiveStock <= 5 && (
                                                        <span className="badge badge-red" style={{ marginLeft: 8 }}>
                                                            Chỉ còn {item.effectiveStock}
                                                        </span>
                                                    )}
                                                </div>
                                                {/* Qty control */}
                                                <div className="qty-control">
                                                    <button className="qty-btn"
                                                        onClick={() => handleUpdateQuantity(pid, item.quantity - 1)}
                                                        disabled={item.quantity <= 1 || busy}
                                                    >−</button>
                                                    <input className="qty-input" readOnly value={item.quantity} />
                                                    <button className="qty-btn"
                                                        onClick={() => handleUpdateQuantity(pid, item.quantity + 1)}
                                                        disabled={item.quantity >= item.effectiveStock || busy}
                                                    >+</button>
                                                </div>
                                            </div>

                                            {/* Price & remove */}
                                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--c-primary)', marginBottom: 4 }}>
                                                    {fmt(item.subtotal)}
                                                </div>
                                                <div style={{ fontSize: 12, color: 'var(--t-muted)', marginBottom: 8 }}>
                                                    {fmt(item.productId.price)} / {item.productId.unit}
                                                </div>
                                                <button
                                                    className="btn btn-ghost btn-sm"
                                                    onClick={() => handleRemoveItem(pid)}
                                                    disabled={busy}
                                                    style={{ fontSize: 12, color: 'var(--c-danger)', borderColor: 'var(--c-danger-border)' }}
                                                >
                                                    {busy ? '...' : '🗑️ Xóa'}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ── Order summary ─────────────────────────── */}
                        <div style={{ position: 'sticky', top: 84 }}>
                            <div className="card">
                                <div className="card-header">
                                    <h3>📋 Tóm tắt đơn hàng</h3>
                                </div>
                                <div className="card-body">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 14, color: 'var(--t-secondary)' }}>
                                        <span>Tạm tính ({cart.totalItems} sp)</span>
                                        <span>{fmt(cart.totalPrice)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 14, color: 'var(--t-secondary)' }}>
                                        <span>Phí vận chuyển</span>
                                        <span className="text-green">Miễn phí</span>
                                    </div>
                                    <hr className="divider" style={{ margin: '14px 0' }} />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                        <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--t-heading)' }}>Tổng cộng</span>
                                        <span style={{ fontWeight: 800, fontSize: 22, color: 'var(--c-primary)' }}>
                                            {fmt(cart.totalPrice)}
                                        </span>
                                    </div>
                                    <button
                                        className="btn btn-primary btn-full btn-lg"
                                        onClick={() => navigate('/checkout')}
                                    >
                                        Đặt hàng ngay →
                                    </button>
                                    <button
                                        className="btn btn-ghost btn-full"
                                        style={{ marginTop: 10 }}
                                        onClick={() => navigate('/products')}
                                    >
                                        ← Tiếp tục mua sắm
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CartPage;