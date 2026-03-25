const productService = require('../services/productService');
const { successResponse } = require('../utils/responseHelper');

/**
 * GET /api/products
 * Lấy danh sách tất cả sản phẩm (public — ai cũng xem được).
 * Query: ?page=1&limit=10&category=ID&farm=ID&standards=VietGAP&minPrice=0&maxPrice=100000&search=...
 */
const getAllProducts = async (req, res) => {
    const result = await productService.getAllProducts(req.query);
    return successResponse(res, 200, 'Lấy danh sách sản phẩm thành công', result);
};

/**
 * GET /api/products/:id
 * Lấy chi tiết 1 sản phẩm theo ID (public).
 */
const getProductById = async (req, res) => {
    const product = await productService.getProductById(req.params.id);
    return successResponse(res, 200, 'Lấy thông tin sản phẩm thành công', { product });
};

/**
 * POST /api/products
 * Tạo sản phẩm mới (Admin only).
 * Hỗ trợ FormData (multipart/form-data) để upload ảnh qua Multer.
 * Body: { name, description?, price, unit, category, farm, standards, harvestDate, expiryDate }
 * Files: images (tối đa 5 file ảnh)
 */
const createProduct = async (req, res) => {
    // Multer đã lưu file vào uploads/products/ → lấy đường dẫn URL
    if (req.files && req.files.length > 0) {
        req.body.images = req.files.map((file) => `/uploads/products/${file.filename}`);
    }

    // Chuyển price từ string (FormData) sang number
    if (req.body.price !== undefined) {
        req.body.price = Number(req.body.price);
    }

    const product = await productService.createProduct(req.body, req.user._id);
    return successResponse(res, 201, 'Tạo sản phẩm thành công', { product });
};

/**
 * PUT /api/products/:id
 * Cập nhật thông tin sản phẩm (Admin only).
 * Hỗ trợ FormData để upload ảnh mới.
 */
const updateProduct = async (req, res) => {
    // Nếu có upload ảnh mới → thêm vào mảng images
    if (req.files && req.files.length > 0) {
        req.body.images = req.files.map((file) => `/uploads/products/${file.filename}`);
    }

    // Chuyển price từ string (FormData) sang number
    if (req.body.price !== undefined) {
        req.body.price = Number(req.body.price);
    }

    const product = await productService.updateProduct(req.params.id, req.body);
    return successResponse(res, 200, 'Cập nhật sản phẩm thành công', { product });
};

/**
 * DELETE /api/products/:id
 * Xóa sản phẩm (Admin only).
 */
const deleteProduct = async (req, res) => {
    const deleted = await productService.deleteProduct(req.params.id);
    return successResponse(res, 200, 'Xóa sản phẩm thành công', deleted);
};

module.exports = { getAllProducts, getProductById, createProduct, updateProduct, deleteProduct };
