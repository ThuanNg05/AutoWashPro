import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useStaffNotifications } from '../hooks/useStaffNotifications';
import { GlobalToastAndConfirm } from '../components/GlobalToastAndConfirm';
import { GlobalLoader } from '../components/GlobalLoader';
import '../styles/shared.css';
import '../styles/admin/admin.css';

export const AdminLayout = () => {
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const activeNav = location.pathname.startsWith('/admin/dashboard') ? 'dashboard' :
                    location.pathname.startsWith('/admin/loyalty') ? 'loyalty' :
                    location.pathname.startsWith('/admin/rewards') ? 'rewards' :
                    location.pathname.startsWith('/admin/queue') ? 'queue' :
                    location.pathname.startsWith('/admin/bookings') ? 'bookings' :
                    location.pathname.startsWith('/admin/customers') ? 'customers' :
                    location.pathname.startsWith('/admin/services') ? 'services' :
                    location.pathname.startsWith('/admin/transactions') ? 'transactions' :
                    location.pathname.startsWith('/admin/ownership-transfers') ? 'ownership-transfers' : 'dashboard';

  const { unreadBookings, queueInService, popup, dismissPopup } = useStaffNotifications({
    isOnBookings: activeNav === 'bookings',
  });

  const handleViewNewBooking = () => {
    dismissPopup();
    navigate('/admin/bookings');
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleLogout = () => {
    if (window.showConfirm) {
      window.showConfirm('Đăng xuất Admin', 'Bạn có chắc chắn muốn đăng xuất khỏi hệ thống quản trị AutoWash Pro?', async () => {
        await logout();
        if (window.showToast) window.showToast('Đăng xuất thành công!', 'success');
        navigate('/login');
      });
    }
  };

  return (
    <div className="admin-wrapper">
      <GlobalToastAndConfirm />
      <GlobalLoader />

      {/* Admin Sidebar */}
      <nav id="sidebar" className={sidebarCollapsed ? 'collapsed' : ''}>
        <Link to="/admin/dashboard" className="text-decoration-none d-block p-3 mb-2 hover-opacity" style={{ transition: 'opacity 0.2s', cursor: 'pointer' }}>
          <div className="brand-full">
            <h4 className="fw-bold mb-0 text-dark">AutoWash <span className="text-cyan">Pro</span></h4>
            <small className="text-muted fw-bold" style={{ fontSize: '0.65rem', letterSpacing: '1px', textTransform: 'uppercase' }}>
              Hệ thống quản trị
            </small>
          </div>
          <div className="admin-brand-mini" id="sidebar-brand-mini">
            <i className="fas fa-hands-wash text-dark fa-lg"></i>
          </div>
        </Link>

        <div style={{ flex: 1 }} className="d-flex flex-column gap-1">
          <Link to="/admin/dashboard" className={`sidebar-link ${activeNav === 'dashboard' ? 'active' : ''}`}>
            <i className="fas fa-chart-line"></i> <span>Bảng điều khiển</span>
          </Link>
          <Link to="/admin/bookings" className={`sidebar-link ${activeNav === 'bookings' ? 'active' : ''}`}>
            <i className="fas fa-calendar-check"></i> <span>Quản lý đặt lịch</span>
            {unreadBookings > 0 && (
              <span className="sidebar-badge" title="Booking mới chưa xem">
                {unreadBookings > 99 ? '99+' : unreadBookings}
              </span>
            )}
          </Link>
          <Link to="/admin/queue" className={`sidebar-link ${activeNav === 'queue' ? 'active' : ''}`}>
            <i className="fas fa-list-ol"></i> <span>Tiến độ dịch vụ</span>
            {queueInService > 0 && (
              <span className="sidebar-badge sidebar-badge-info" title="Xe đang trong hàng đợi (đã check-in)">
                {queueInService > 99 ? '99+' : queueInService}
              </span>
            )}
          </Link>
          <Link to="/admin/customers" className={`sidebar-link ${activeNav === 'customers' ? 'active' : ''}`}>
            <i className="fas fa-users"></i> <span>Khách hàng</span>
          </Link>
          <Link to="/admin/loyalty" className={`sidebar-link ${activeNav === 'loyalty' ? 'active' : ''}`}>
            <i className="fas fa-crown"></i> <span>Quản lý Loyalty</span>
          </Link>
          <Link to="/admin/rewards" className={`sidebar-link ${activeNav === 'rewards' ? 'active' : ''}`}>
            <i className="fas fa-gift"></i> <span>Voucher & Rewards</span>
          </Link>
          <Link to="/admin/services" className={`sidebar-link ${activeNav === 'services' ? 'active' : ''}`}>
            <i className="fas fa-box"></i> <span>Dịch vụ</span>
          </Link>
          <Link to="/admin/transactions" className={`sidebar-link ${activeNav === 'transactions' ? 'active' : ''}`}>
            <i className="fas fa-receipt"></i> <span>Lịch sử giao dịch</span>
          </Link>
          <Link to="/admin/ownership-transfers" className={`sidebar-link ${activeNav === 'ownership-transfers' ? 'active' : ''}`}>
            <i className="fas fa-exchange-alt"></i> <span>Chuyển nhượng xe</span>
          </Link>
          <button type="button" className="sidebar-link text-danger opacity-75 border-0 bg-transparent w-100 text-start" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i> <span>Đăng xuất</span>
          </button>
        </div>

        <div className="p-3 d-flex flex-column gap-2">
          <button className="sidebar-collapse-btn" onClick={toggleSidebar}>
            <i className="fas fa-chevron-left"></i>
            <span>Thu gọn menu</span>
          </button>
          {/* <Link to="/admin/demo-tools" className="sidebar-demo-btn" title="Demo tool: chỉnh database trực tiếp">
            <i className="fas fa-database"></i>
            <span>Demo Tool</span>
          </Link> */}
        </div>
      </nav>

      {/* Admin Main */}
      <div className={`admin-main ${sidebarCollapsed ? 'collapsed' : ''} ${activeNav === 'queue' ? 'admin-main-queue' : ''}`} id="admin-main">
        <Outlet />
      </div>

      {/* Pop-up thông báo booking mới cho staff (nền mờ, nổi bật toàn màn hình) */}
      {popup && (
        <div className="confirm-modal-backdrop booking-alert-backdrop show" style={{ display: 'flex' }}>
          <div className="confirm-modal-card booking-alert-card animate-confirm-in">
            <div className="booking-alert-icon">
              <i className="fas fa-calendar-plus"></i>
            </div>
            <h5 className="booking-alert-title">Có lịch đặt mới!</h5>
            <p className="booking-alert-text">
              Lịch đặt <strong>#BK-{popup.bookingId}</strong>
              {popup.licensePlate ? <> · biển số <strong>{popup.licensePlate}</strong></> : null} vừa được tạo.
            </p>
            <div className="confirm-modal-footer">
              <button className="confirm-cancel-btn" onClick={dismissPopup}>ĐỂ SAU</button>
              <button className="confirm-ok-btn confirm-btn-cyan" onClick={handleViewNewBooking}>XEM NGAY</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default AdminLayout;
