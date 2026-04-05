import Navbar from './Navbar';

export default function PageLayout({ children }) {
    return (
        <div className="page-wrapper">
            <Navbar />
            <main className="page-main">
                {children}
            </main>
        </div>
    );
}
