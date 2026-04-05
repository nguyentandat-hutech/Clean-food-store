import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getProductByIdAPI } from '../api/productService';
import { toggleWishlistAPI, checkWishlistAPI } from '../api/wishlistService';
import { useAuth } from '../contexts/AuthContext';
import ProductReviews from '../components/ProductReviews';

// ── Trang Chi tiết Sản phẩm + Truy xuất nguồn gốc ─────────────
function ProductDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState(0); // Index ảnh đang xem
    const [inWishlist, setInWishlist] = useState(false);   // Trạng thái yêu thích
    const [wishlistLoading, setWishlistLoading] = useState(false);

    // ── Gọi API lấy chi tiết sản phẩm ──────────────────────────
    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const result = await getProductByIdAPI(id);
                setProduct(result.product);
            } catch (error) {
                const msg = error.response?.data?.message || 'Không tìm thấy sản phẩm';
                toast.error(msg);
                navigate('/products'); // Quay về danh sách nếu lỗi
            } finally {
                setLoading(false);
            }
        };
        fetchProduct();
    }, [id, navigate]);

    // ── Kiểm tra sản phẩm có trong wishlist không (chỉ khi đã login) ──
    useEffect(() => {
        if (!user || !id) return;
        const checkWishlist = async () => {
            try {
                const result = await checkWishlistAPI(id);
                setInWishlist(result.inWishlist);
            } catch {
                // Bỏ qua lỗi kiểm tra wishlist
            }
        };
        checkWishlist();
    }, [id, user]);

    // ── Toggle yêu thích ────────────────────────────────────────
    const handleToggleWishlist = async () => {
        if (!user) {
            toast.info('Vui lòng đăng nhập để lưu sản phẩm yêu thích.');
            return;
        }
        setWishlistLoading(true);
        try {
            const result = await toggleWishlistAPI(id);
            setInWishlist(result.added);
            toast.success(result.added ? '❤️ Đã thêm vào danh sách yêu thích!' : '💔 Đã xóa khỏi danh sách yêu thích.');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra.');
        } finally {
            setWishlistLoading(false);
        }
    };

    // ── Format giá VND ──────────────────────────────────────────
    const formatPrice = (price) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
    };

    // ── Format ngày tháng ───────────────────────────────────────
    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric',
        });
    };

    // ── Loading state ───────────────────────────────────────────
    if (loading) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <p>Đang tải thông tin sản phẩm...</p>
            </div>
        );
    }

    // ── Không tìm thấy sản phẩm ────────────────────────────────
    if (!product) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <p>Không tìm thấy sản phẩm.</p>
                <button onClick={() => navigate('/products')}
                    style={{ padding: '10px 20px', cursor: 'pointer' }}>
                    ← Về danh sách sản phẩm
                </button>
            </div>
        );
    }

    // Inline styles
    const sectionStyle = { padding: '20px', border: '1px solid #dee2e6', borderRadius: '8px', backgroundColor: '#fff', marginBottom: '20px' };
    const labelStyle = { fontWeight: 'bold', color: '#495057', display: 'inline-block', minWidth: '140px' };
    const valueStyle = { color: '#212529' };

    return (
        <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
            {/* Nút quay lại */}
            <button onClick={() => navigate('/products')}
                style={{ padding: '8px 16px', marginBottom: '20px', cursor: 'pointer', border: '1px solid #ced4da', borderRadius: '4px', backgroundColor: '#f8f9fa' }}>
                ← Quay lại danh sách
            </button>

            <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
                {/* ═══════════════════════════════════════════════ */}
                {/* CỘT TRÁI: HÌNH ẢNH SẢN PHẨM                    */}
                {/* ═══════════════════════════════════════════════ */}
                <div style={{ flex: '1 1 360px' }}>
                    {/* Ảnh chính */}
                    <div style={{
                        width: '100%', height: '360px', borderRadius: '8px', overflow: 'hidden',
                        border: '1px solid #dee2e6', backgroundColor: '#f0f0f0', marginBottom: '12px',
                    }}>
                        {product.images && product.images.length > 0 ? (
                            <img src={product.images[selectedImage]} alt={product.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <div style={{
                                width: '100%', height: '100%', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', color: '#adb5bd', fontSize: '60px',
                            }}>
                                🥬
                            </div>
                        )}
                    </div>

                    {/* Thumbnails */}
                    {product.images && product.images.length > 1 && (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {product.images.map((img, idx) => (
                                <img
                                    key={idx}
                                    src={img}
                                    alt={`Ảnh ${idx + 1}`}
                                    onClick={() => setSelectedImage(idx)}
                                    style={{
                                        width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px',
                                        cursor: 'pointer',
                                        border: idx === selectedImage ? '3px solid #007bff' : '1px solid #dee2e6',
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* ═══════════════════════════════════════════════ */}
                {/* CỘT PHẢI: THÔNG TIN SẢN PHẨM                   */}
                {/* ═══════════════════════════════════════════════ */}
                <div style={{ flex: '1 1 360px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '10px' }}>
                        <h1 style={{ marginTop: 0, marginBottom: 0, fontSize: '24px', flex: 1 }}>{product.name}</h1>
                        {/* Nút yêu thích */}
                        <button
                            onClick={handleToggleWishlist}
                            disabled={wishlistLoading}
                            title={inWishlist ? 'Xóa khỏi yêu thích' : 'Thêm vào yêu thích'}
                            style={{
                                background: 'none', border: '2px solid',
                                borderColor: inWishlist ? '#e74c3c' : '#ced4da',
                                borderRadius: '50%', width: '44px', height: '44px',
                                fontSize: '20px', cursor: wishlistLoading ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0, transition: 'all 0.2s',
                                backgroundColor: inWishlist ? '#fff5f5' : '#fff',
                                opacity: wishlistLoading ? 0.6 : 1,
                            }}
                        >
                            {inWishlist ? '❤️' : '🤍'}
                        </button>
                    </div>

                    {/* Giá */}
                    <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#e74c3c', margin: '0 0 10px' }}>
                        {formatPrice(product.price)} / {product.unit}
                    </p>

                    {/* Tiêu chuẩn */}
                    <span style={{
                        display: 'inline-block', padding: '6px 14px', borderRadius: '20px', fontSize: '14px',
                        fontWeight: 'bold', marginBottom: '16px',
                        backgroundColor: product.standards === 'Organic' ? '#d4edda' : '#cce5ff',
                        color: product.standards === 'Organic' ? '#155724' : '#004085',
                    }}>
                        ✅ {product.standards}
                    </span>

                    {/* Danh mục */}
                    <p style={{ margin: '8px 0' }}>
                        <span style={labelStyle}>Danh mục:</span>
                        <span style={valueStyle}>{product.category?.name || '—'}</span>
                    </p>

                    {/* Mô tả */}
                    {product.description && (
                        <div style={{ margin: '16px 0', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
                            <strong>Mô tả:</strong>
                            <p style={{ margin: '8px 0 0', color: '#495057', lineHeight: '1.6' }}>
                                {product.description}
                            </p>
                        </div>
                    )}

                    {/* Ngày thu hoạch & Hạn sử dụng */}
                    <p style={{ margin: '8px 0' }}>
                        <span style={labelStyle}>📅 Ngày thu hoạch:</span>
                        <span style={valueStyle}>{formatDate(product.harvestDate)}</span>
                    </p>
                    <p style={{ margin: '8px 0' }}>
                        <span style={labelStyle}>⏰ Hạn sử dụng:</span>
                        <span style={valueStyle}>{formatDate(product.expiryDate)}</span>
                    </p>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════ */}
            {/* BOX TRUY XUẤT NGUỒN GỐC                             */}
            {/* ═══════════════════════════════════════════════════ */}
            {product.farm && (
                <div style={sectionStyle}>
                    <h2 style={{ marginTop: 0, marginBottom: '16px', fontSize: '20px', color: '#28a745' }}>
                        🌾 Truy xuất nguồn gốc
                    </h2>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <p style={{ margin: '4px 0' }}>
                            <span style={labelStyle}>🏡 Trang trại:</span>
                            <span style={{ ...valueStyle, fontWeight: 'bold' }}>{product.farm.name}</span>
                        </p>
                        <p style={{ margin: '4px 0' }}>
                            <span style={labelStyle}>📍 Địa chỉ:</span>
                            <span style={valueStyle}>{product.farm.location}</span>
                        </p>
                        <p style={{ margin: '4px 0' }}>
                            <span style={labelStyle}>📞 Liên hệ:</span>
                            <span style={valueStyle}>{product.farm.contact}</span>
                        </p>
                        <p style={{ margin: '4px 0' }}>
                            <span style={labelStyle}>🏅 Chứng nhận:</span>
                            <span style={{
                                padding: '4px 10px', borderRadius: '4px', fontSize: '13px', fontWeight: 'bold',
                                backgroundColor: '#fff3cd', color: '#856404',
                            }}>
                                {product.farm.certificate}
                            </span>
                        </p>
                    </div>

                    {/* Mô tả trang trại */}
                    {product.farm.description && (
                        <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#f0f8f0', borderRadius: '6px' }}>
                            <strong>Giới thiệu trang trại:</strong>
                            <p style={{ margin: '8px 0 0', color: '#495057', lineHeight: '1.6' }}>
                                {product.farm.description}
                            </p>
                        </div>
                    )}

                    {/* Timeline truy xuất */}
                    <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#e9ecef', borderRadius: '6px' }}>
                        <strong>📋 Thông tin truy xuất:</strong>
                        <div style={{ marginTop: '10px', paddingLeft: '20px', borderLeft: '3px solid #28a745' }}>
                            <p style={{ margin: '8px 0', fontSize: '14px' }}>
                                🌱 <strong>Thu hoạch:</strong> {formatDate(product.harvestDate)} tại {product.farm.name}
                            </p>
                            <p style={{ margin: '8px 0', fontSize: '14px' }}>
                                ✅ <strong>Tiêu chuẩn:</strong> {product.standards}
                            </p>
                            <p style={{ margin: '8px 0', fontSize: '14px' }}>
                                📦 <strong>Đơn vị:</strong> {product.unit}
                            </p>
                            <p style={{ margin: '8px 0', fontSize: '14px' }}>
                                ⏰ <strong>Hạn sử dụng:</strong> {formatDate(product.expiryDate)}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════ */}
            {/* ĐÁNH GIÁ SẢN PHẨM                                  */}
            {/* ═══════════════════════════════════════════════════ */}
            <ProductReviews productId={id} />
        </div>
    );
}

export default ProductDetailPage;
