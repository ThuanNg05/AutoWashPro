import React from 'react';
import './PaymentResult.css';

export const VerifyingCard = () => {
  return (
    <div className="payment-result-page">
      <div className="payment-card">
        <div className="icon-circle icon-verifying">
          <span className="spinner" />
        </div>
        <h2 className="payment-title">Đang xác nhận thanh toán</h2>
        <p className="payment-subtitle" style={{ marginBottom: 0 }}>
          Hệ thống đang xác nhận giao dịch với PayOS.<br />Quá trình này chỉ mất vài giây.
        </p>
      </div>
    </div>
  );
};

export default VerifyingCard;
