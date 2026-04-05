// ============================================================
// Wishlist Service — Danh sách yêu thích sản phẩm
// ============================================================

const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');
const { createError } = require('../utils/responseHelper');

// Các trường cần thiết khi populate sản phẩm vào wishlist
const PRODUCT_FIELDS = 'name price unit imageUrl standards averageRating reviewCount category';

/**
 * Lấy danh sách yêu thích của user (tạo mới nếu chưa tồn tại).
 * Products được populate với thông tin cơ bản để hiển thị trực tiếp.
 *
 * @param {string} userId - ID của user đang đăng nhập
 * @returns {Promise<object>} Wishlist đã populate products
 */
const getWishlist = async (userId) => {
    // findOneAndUpdate với upsert để auto-create nếu chưa có
    const wishlist = await Wishlist.findOneAndUpdate(
        { userId },
        { $setOnInsert: { userId, products: [] } },
        { upsert: true, new: true }
    ).populate('products', PRODUCT_FIELDS);

    return wishlist;
};

/**
 * Toggle sản phẩm vào/ra khỏi wishlist (thêm nếu chưa có, xóa nếu đã có).
 * Dùng $addToSet và $pull để đảm bảo không trùng lặp và tính nguyên tử.
 *
 * @param {string} userId - ID user
 * @param {string} productId - ID sản phẩm cần toggle
 * @returns {Promise<{ wishlist: object, added: boolean }>}
 */
const toggleProduct = async (userId, productId) => {
    // Kiểm tra sản phẩm tồn tại
    const product = await Product.findById(productId);
    if (!product) {
        throw createError(404, 'Sản phẩm không tồn tại.');
    }

    // Đảm bảo wishlist document tồn tại
    await Wishlist.findOneAndUpdate(
        { userId },
        { $setOnInsert: { userId, products: [] } },
        { upsert: true, new: true }
    );

    // Kiểm tra sản phẩm đã có trong wishlist chưa
    const existing = await Wishlist.findOne({ userId, products: productId });

    let updatedWishlist;
    let added;

    if (existing) {
        // Đã có → xóa ra ($pull là nguyên tử)
        updatedWishlist = await Wishlist.findOneAndUpdate(
            { userId },
            { $pull: { products: productId } },
            { new: true }
        ).populate('products', PRODUCT_FIELDS);
        added = false;
    } else {
        // Chưa có → thêm vào ($addToSet đảm bảo không trùng)
        updatedWishlist = await Wishlist.findOneAndUpdate(
            { userId },
            { $addToSet: { products: productId } },
            { new: true }
        ).populate('products', PRODUCT_FIELDS);
        added = true;
    }

    return { wishlist: updatedWishlist, added };
};

/**
 * Xóa một sản phẩm khỏi wishlist.
 * Trả về 404 nếu sản phẩm không có trong wishlist.
 *
 * @param {string} userId - ID user
 * @param {string} productId - ID sản phẩm cần xóa
 * @returns {Promise<object>} Wishlist sau khi xóa
 */
const removeProduct = async (userId, productId) => {
    // Kiểm tra sản phẩm có trong wishlist không
    const wishlist = await Wishlist.findOne({ userId, products: productId });
    if (!wishlist) {
        throw createError(404, 'Sản phẩm không có trong danh sách yêu thích.');
    }

    const updated = await Wishlist.findOneAndUpdate(
        { userId },
        { $pull: { products: productId } },
        { new: true }
    ).populate('products', PRODUCT_FIELDS);

    return updated;
};

/**
 * Kiểm tra một sản phẩm có trong wishlist của user không.
 *
 * @param {string} userId - ID user
 * @param {string} productId - ID sản phẩm cần kiểm tra
 * @returns {Promise<boolean>}
 */
const checkProduct = async (userId, productId) => {
    const count = await Wishlist.countDocuments({ userId, products: productId });
    return count > 0;
};

module.exports = {
    getWishlist,
    toggleProduct,
    removeProduct,
    checkProduct,
};
