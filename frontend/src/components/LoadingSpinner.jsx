/**
 * Component Loading Spinner dùng chung toàn app.
 * Sử dụng: <LoadingSpinner /> hoặc <LoadingSpinner size={48} />
 */
const LoadingSpinner = ({ size = 32 }) => {
    const style = {
        width: size,
        height: size,
        border: '3px solid #f0f0f0',
        borderTop: '3px solid #333',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <div style={style} />
        </div>
    );
};

export default LoadingSpinner;
