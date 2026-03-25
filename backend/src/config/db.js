const mongoose = require('mongoose');

/**
 * Kết nối tới MongoDB bằng Mongoose.
 * Hàm này được gọi một lần duy nhất khi server khởi động.
 */
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`❌ MongoDB Connection Error: ${error.message}`);
        // Thoát tiến trình nếu không kết nối được DB
        process.exit(1);
    }
};

module.exports = connectDB;
