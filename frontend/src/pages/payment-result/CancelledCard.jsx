import React from 'react';
import './PaymentResult.css';

export const CancelledCard = ({ onViewDetail, onGoDashboard }) => {
  return (
    <div className="payment-result-page">
      <div className="payment-card">
        <div className="icon-circle icon-cancelled">
          <i className="fas fa-times-circle"></i>
        </div>
        <h2 className="payment-title">Giao dịch đã bị hủy</h2>
        <p className="payment-subtitle">
          Bạn đã hủy giao dịch thanh toán hoặc giao dịch không thành công.
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

export default CancelledCard;
