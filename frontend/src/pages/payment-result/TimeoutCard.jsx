import React from 'react';
import './PaymentResult.css';

export const TimeoutCard = ({ onViewDetail, onGoDashboard }) => {
  return (
    <div className="payment-result-page">
      <div className="payment-card">
        <div className="icon-circle icon-timeout">
          <i className="fas fa-exclamation-triangle"></i>
        </div>
        <h2 className="payment-title">Không thể xác nhận thanh toán</h2>
        <p className="payment-subtitle">
          Thanh toán của bạn có thể đã thành công nhưng hệ thống chưa nhận được xác nhận. Vui lòng kiểm tra lại sau.
        </p>

        <button onClick={onViewDetail} className="btn-primary">
          Chi tiết đặt lịch
        </button>
        <button onClick={onGoDashboard} className="btn-secondary">
          Quay lại Dashboard
        </button>
      </div>
    </div>
  );
};

export default TimeoutCard;
