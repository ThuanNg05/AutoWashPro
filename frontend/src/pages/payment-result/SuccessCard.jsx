import React from 'react';
import './PaymentResult.css';

export const SuccessCard = ({ bookingId, paymentData, onViewDetail, onGoDashboard }) => {
  // Helper to extract properties support PascalCase / camelCase
  const getProp = (obj, key) => {
    if (!obj) return null;
    const pascal = key.charAt(0).toUpperCase() + key.slice(1);
    return obj[key] !== undefined ? obj[key] : obj[pascal];
  };

  const amt = getProp(paymentData, 'amount') || 0;
  const methodVal = getProp(paymentData, 'paymentMethod');
  const methodName = getProp(paymentData, 'paymentMethodName');
  const timeVal = getProp(paymentData, 'paidAt') || getProp(paymentData, 'createdAt');
  const serviceName = getProp(paymentData, 'serviceName') || 'Standard Wash Service';
  const points = getProp(paymentData, 'pointsEarned');

  const formatMethod = (methodVal, methodName) => {
    if (methodName) return methodName;
    if (methodVal === 1 || methodVal === 'Cash') return 'Tiền mặt';
    if (methodVal === 2 || methodVal === 'VNPay') return 'VNPay';
    if (methodVal === 3 || methodVal === 'PayOS') return 'PayOS';
    if (methodVal === 4 || methodVal === 'Free') return 'Miễn phí';
    return String(methodVal || 'Khác');
  };

  return (
    <div className="payment-result-page">
      <div className="payment-card">
        <div className="icon-circle icon-success">
          <i className="fas fa-check-circle"></i>
        </div>

        <h2 className="payment-title">Thanh toán thành công</h2>

        <div className="amount-text">
          {amt.toLocaleString()}đ
        </div>

        <p className="payment-subtitle">
          Thanh toán cho đơn đặt lịch của bạn đã được xác nhận.
        </p>

        <div className="details-list">
          <div className="details-row">
            <span className="detail-label">
              <i className="fas fa-file-invoice" /> Mã đặt lịch
            </span>
            <span className="detail-value">#{bookingId}</span>
          </div>
          <div className="details-row">
            <span className="detail-label">
              <i className="fas fa-car" /> Gói dịch vụ
            </span>
            <span className="detail-value">{serviceName}</span>
          </div>
          <div className="details-row">
            <span className="detail-label">
              <i className="fas fa-credit-card" /> Phương thức thanh toán
            </span>
            <span className="detail-value">{formatMethod(methodVal, methodName)}</span>
          </div>
          <div className="details-row-last">
            <span className="detail-label">
              <i className="fas fa-clock" /> Thời gian
            </span>
            <span className="detail-value">
              {timeVal ? new Date(timeVal).toLocaleString('vi-VN') : 'Đã thanh toán'}
            </span>
          </div>
        </div>

        {points > 0 && (
          <div className="reward-card">
            <span className="reward-title">🎁 Thưởng Loyalty</span>
            <span className="reward-value">+{points.toLocaleString()} điểm Loyalty</span>
          </div>
        )}

        <button onClick={onViewDetail} className="btn-primary">
          Xem chi tiết đặt lịch
        </button>
        <button onClick={onGoDashboard} className="btn-secondary">
          Về Dashboard
        </button>

        <div className="payment-footnote">
          Thông tin thanh toán sẽ luôn được lưu trong Chi tiết đặt lịch.
        </div>
      </div>
    </div>
  );
};

export default SuccessCard;
