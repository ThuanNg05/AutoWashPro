import React from 'react';
import '../styles/customer/vehicle-cards.css';

const VehicleCard = ({ vehicle, onEdit, onDelete, onBookNow, onViewHistory, index = 0 }) => {
  const {
    vehicleId,
    licensePlate,
    brand,
    model,
    vehicleClass = 'Other',
    registeredAt,
    hasActiveBooking,
    lastWashDate,
    lastWashServiceName,
    upcomingBooking
  } = vehicle;

  const formatDate = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const formatTime = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Confirmed':
      case 'CheckedIn':
        return {
          className: 'vc-badge-confirmed',
          text: status === 'Confirmed' ? 'Đã xác nhận' : 'Đã check-in'
        };
      case 'Pending':
        return {
          className: 'vc-badge-pending',
          text: 'Chờ xác nhận'
        };
      default:
        return {
          className: 'vc-badge-pending',
          text: status
        };
    }
  };

  const isDeleteDisabled = hasActiveBooking;
  const vehicleClassLower = (vehicleClass || 'other').toLowerCase();

  return (
    <div className="vc-card vc-card-enter" style={{ animationDelay: `${index * 0.05}s` }}>
      <div className="vc-card-header">
        <div>🚗 {brand} {model}</div>
        <span className={`vc-class-badge vc-class-${vehicleClassLower}`}>{vehicleClass}</span>
      </div>
      
      <div className="vc-card-body">
        <div className="vc-plate">{licensePlate}</div>
        
        <div className="vc-info-row">
          <span className="vc-info-icon">📅</span>
          <span className="vc-info-label">Ngày đăng ký</span>
          <span className="vc-info-value">{formatDate(registeredAt) || 'Không xác định'}</span>
        </div>
        
        <div className="vc-info-row">
          <span className="vc-info-icon">🧼</span>
          <span className="vc-info-label">Lần rửa gần nhất</span>
          <span className="vc-info-value">
            {lastWashDate ? `${formatDate(lastWashDate)} ${lastWashServiceName ? `- ${lastWashServiceName}` : ''}` : 'Chưa có'}
          </span>
        </div>
        
        <div className="vc-info-row">
          <span className="vc-info-icon">📋</span>
          <span className="vc-info-label">Lịch hẹn sắp tới</span>
          <span className="vc-info-value">
            {upcomingBooking ? (
              <>
                {formatTime(upcomingBooking.scheduledAt)} {formatDate(upcomingBooking.scheduledAt)}
                <span className={getStatusBadge(upcomingBooking.status).className}>
                  {getStatusBadge(upcomingBooking.status).text}
                </span>
              </>
            ) : (
              'Không có'
            )}
          </span>
        </div>
      </div>
      
      <div className="vc-card-footer">
        <button className="vc-btn-book" onClick={() => onBookNow(vehicle)}>
          <i className="fas fa-calendar-plus"></i> Đặt lịch
        </button>
        <button className="vc-btn-history" onClick={() => onViewHistory(vehicle)}>
          <i className="fas fa-history"></i> Lịch sử
        </button>
        <button className="vc-btn-edit" onClick={() => onEdit(vehicle)} title="Sửa">
          <i className="fas fa-pencil-alt"></i>
        </button>
        <div className="vc-tooltip-wrapper">
          <button 
            className="vc-btn-delete" 
            onClick={() => onDelete(vehicleId)} 
            disabled={isDeleteDisabled} 
            title="Xóa"
          >
            <i className="fas fa-trash-alt"></i>
          </button>
          {isDeleteDisabled && (
            <span className="vc-tooltip">
              Không thể xóa — xe đang có lịch hẹn
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default VehicleCard;
