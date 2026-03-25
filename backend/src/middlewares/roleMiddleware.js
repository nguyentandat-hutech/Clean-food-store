const { createError } = require('../utils/responseHelper');

/**
 * Middleware phân quyền theo Role.
 * Phải đặt SAU middleware `protect` (cần req.user đã được gán).
 *
 * Cách dùng:
 *   router.delete('/users/:id', protect, authorize('admin'), controller.handler)
 *   router.get('/reports',      protect, authorize('admin', 'manager'), controller.handler)
 *
 * @param {...string} roles - Danh sách roles được phép truy cập
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    // req.user được gán bởi authMiddleware (protect) trước đó
    if (!req.user) {
      return next(createError(401, 'Bạn chưa xác thực. Hãy dùng middleware protect trước'));
    }

    // Kiểm tra role của user có nằm trong danh sách cho phép không
    if (!roles.includes(req.user.role)) {
      return next(
        createError(
          403,
          `Bạn không có quyền thực hiện hành động này. Yêu cầu quyền: [${roles.join(', ')}]`
        )
      );
    }

    next();
  };
};

module.exports = { authorize };
