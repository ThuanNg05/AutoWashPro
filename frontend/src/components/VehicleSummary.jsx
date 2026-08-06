import React from 'react';

const VehicleSummary = ({ stats }) => {
  if (!stats || stats.total === 0) return null;

  return (
    <div className="vc-stats-bar">
      <div className="vc-stat-item">
        <div className="vc-stat-icon">🚗</div>
        <div className="vc-stat-content">
          <span className="vc-stat-number">{stats.total}</span>
          <span className="vc-stat-label">Phương tiện đã đăng ký</span>
        </div>
      </div>
      <div className="vc-stat-item">
        <div className="vc-stat-icon" style={{ backgroundColor: '#dbeafe', color: '#2563eb' }}>📋</div>
        <div className="vc-stat-content">
          <span className="vc-stat-number">{stats.upcoming}</span>
          <span className="vc-stat-label">Lịch hẹn sắp tới</span>
        </div>
      </div>
      <div className="vc-stat-item">
        <div className="vc-stat-icon" style={{ backgroundColor: '#dcfce7', color: '#15803d' }}>📅</div>
        <div className="vc-stat-content">
          <span className="vc-stat-number">{stats.bookingToday}</span>
          <span className="vc-stat-label">Lịch hẹn hôm nay</span>
        </div>
      </div>
    </div>
  );
};

export default VehicleSummary;
