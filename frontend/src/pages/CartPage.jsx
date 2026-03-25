import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCartAPI, updateCartItemAPI, removeCartItemAPI, clearCartAPI } from '../api/cartService';

/**
 * ── CartPage ─────────────────────────────────────────────────────
 * Trang giỏ hàng: hiển thị danh sách sản phẩm, tăng/giảm số lượng,
 * xóa sản phẩm, tính tổng tiền, nút Đặt hàng.
 */
const CartPage = () => {
    const navigate = useNavigate();
    const [cart, setCart] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionLoading, setActionLoading] = useState(''); // ID sản phẩm đang xử lý

    // Lấy giỏ hàng từ API
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

    useEffect(() => {
        fetchCart();
    }, [fetchCart]);

    // Cập nhật số lượng sản phẩm (tăng/giảm)
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

    // Xóa 1 sản phẩm khỏi giỏ
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

    // Xóa toàn bộ giỏ hàng
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

    // Format tiền VNĐ
    const formatPrice = (price) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
    };

    // ── RENDER ────────────────────────────────────────────────────
    if (loading) return <div style={{ padding: 20, textAlign: 'center' }}>Đang tải giỏ hàng...</div>;

    return (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: 20 }}>
            <h1>🛒 Giỏ hàng</h1>

            {/* Thông báo lỗi */}
            {error && (
                <div style={{ background: '#fee', border: '1px solid #f00', padding: 10, marginBottom: 15, borderRadius: 4, color: '#c00' }}>
                    {error}
                </div>
            )}

            {/* Giỏ hàng trống */}
            {!cart || cart.products.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                    <p>Giỏ hàng của bạn đang trống.</p>
                    <button onClick={() => navigate('/products')} style={{ padding: '10px 20px', cursor: 'pointer' }}>
                        ← Tiếp tục mua sắm
                    </button>
                </div>
            ) : (
                <>
                    {/* Bảng sản phẩm */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #333', textAlign: 'left' }}>
                                <th style={{ padding: 10 }}>Sản phẩm</th>
                                <th style={{ padding: 10, textAlign: 'center' }}>Đơn giá</th>
                                <th style={{ padding: 10, textAlign: 'center' }}>Số lượng</th>
                                <th style={{ padding: 10, textAlign: 'center' }}>Tồn kho</th>
                                <th style={{ padding: 10, textAlign: 'right' }}>Thành tiền</th>
                                <th style={{ padding: 10, textAlign: 'center' }}>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cart.products.map((item) => (
                                <tr key={item.productId._id} style={{ borderBottom: '1px solid #ddd' }}>
                                    {/* Tên sản phẩm */}
                                    <td style={{ padding: 10 }}>
                                        <strong>{item.productId.name}</strong>
                                        <br />
                                        <small style={{ color: '#888' }}>({item.productId.unit})</small>
                                    </td>

                                    {/* Đơn giá */}
                                    <td style={{ padding: 10, textAlign: 'center' }}>
                                        {formatPrice(item.productId.price)}
                                    </td>

                                    {/* Nút tăng/giảm số lượng */}
                                    <td style={{ padding: 10, textAlign: 'center' }}>
                                        <button
                                            onClick={() => handleUpdateQuantity(item.productId._id, item.quantity - 1)}
                                            disabled={item.quantity <= 1 || actionLoading === item.productId._id}
                                            style={{ padding: '4px 10px', cursor: 'pointer' }}
                                        >
                                            −
                                        </button>
                                        <span style={{ margin: '0 12px', fontWeight: 'bold', minWidth: 30, display: 'inline-block', textAlign: 'center' }}>
                                            {item.quantity}
                                        </span>
                                        <button
                                            onClick={() => handleUpdateQuantity(item.productId._id, item.quantity + 1)}
                                            disabled={item.quantity >= item.effectiveStock || actionLoading === item.productId._id}
                                            style={{ padding: '4px 10px', cursor: 'pointer' }}
                                        >
                                            +
                                        </button>
                                    </td>

                                    {/* Tồn kho */}
                                    <td style={{ padding: 10, textAlign: 'center', color: item.effectiveStock <= 5 ? '#c00' : '#333' }}>
                                        {item.effectiveStock}
                                    </td>

                                    {/* Thành tiền */}
                                    <td style={{ padding: 10, textAlign: 'right', fontWeight: 'bold' }}>
                                        {formatPrice(item.subtotal)}
                                    </td>

                                    {/* Nút xóa */}
                                    <td style={{ padding: 10, textAlign: 'center' }}>
                                        <button
                                            onClick={() => handleRemoveItem(item.productId._id)}
                                            disabled={actionLoading === item.productId._id}
                                            style={{ padding: '6px 12px', cursor: 'pointer', color: '#c00', border: '1px solid #c00', background: 'transparent', borderRadius: 4 }}
                                        >
                                            {actionLoading === item.productId._id ? '...' : 'Xóa'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Tổng kết */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 15, background: '#f5f5f5', borderRadius: 8 }}>
                        <div>
                            <button onClick={handleClearCart} style={{ padding: '8px 16px', cursor: 'pointer', marginRight: 10 }}>
                                🗑️ Xóa giỏ hàng
                            </button>
                            <button onClick={() => navigate('/products')} style={{ padding: '8px 16px', cursor: 'pointer' }}>
                                ← Tiếp tục mua sắm
                            </button>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ margin: 0 }}>
                                Tổng ({cart.totalItems} sản phẩm):{' '}
                                <span style={{ fontSize: 22, fontWeight: 'bold', color: '#c00' }}>
                                    {formatPrice(cart.totalPrice)}
                                </span>
                            </p>
                            <button
                                onClick={() => navigate('/checkout')}
                                style={{ marginTop: 10, padding: '12px 30px', fontSize: 16, fontWeight: 'bold', cursor: 'pointer', background: '#28a745', color: '#fff', border: 'none', borderRadius: 6 }}
                            >
                                Đặt hàng →
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default CartPage;
