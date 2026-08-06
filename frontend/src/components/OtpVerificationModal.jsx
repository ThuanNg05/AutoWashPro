import React, { useState, useEffect } from 'react';

const OtpVerificationModal = ({
  show,
  userEmail,
  onClose,
  onVerifyOtp,
  onResendOtp,
  isVerifying,
  otpError
}) => {
  const [otpArray, setOtpArray] = useState(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(60);

  useEffect(() => {
    if (show) {
      setResendTimer(60);
      setOtpArray(['', '', '', '', '', '']);
    }
  }, [show]);

  useEffect(() => {
    let interval = null;
    if (show && resendTimer > 0) {
      interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [show, resendTimer]);

  if (!show) return null;

  const maskEmail = (email) => {
    if (!email) return '';
    const [localPart, domain] = email.split('@');
    if (localPart.length <= 2) {
      return `${localPart}***@${domain}`;
    }
    return `${localPart.substring(0, 2)}***@${domain}`;
  };

  const handleOtpChange = (element, index) => {
    const val = element.value.replace(/\D/g, '');
    if (!val) {
      const newOtp = [...otpArray];
      newOtp[index] = '';
      setOtpArray(newOtp);
      return;
    }
    const char = val[val.length - 1];
    const newOtp = [...otpArray];
    newOtp[index] = char;
    setOtpArray(newOtp);
    if (char && element.nextElementSibling) element.nextElementSibling.focus();
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      if (!otpArray[index] && e.target.previousElementSibling) {
        e.target.previousElementSibling.focus();
        const newOtp = [...otpArray];
        newOtp[index - 1] = '';
        setOtpArray(newOtp);
      } else {
        const newOtp = [...otpArray];
        newOtp[index] = '';
        setOtpArray(newOtp);
      }
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length === 6) {
      setOtpArray(pastedData.split(''));
      const inputs = e.target.parentNode.querySelectorAll('.otp-box');
      if (inputs && inputs.length > 0) inputs[inputs.length - 1].focus();
    }
  };

  const otpCode = otpArray.join('');

  return (
    <div
      className="modal show d-block"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 1060 }}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden bg-white p-2">
          <div className="modal-header border-0 bg-white p-3 px-4 d-flex justify-content-between align-items-center">
            <h5 className="modal-title fw-bold m-0 text-slate-800" style={{ fontSize: '18px' }}>
              Xác thực Email
            </h5>
            <button type="button" className="btn-close shadow-none" onClick={onClose}></button>
          </div>

          <div className="modal-body p-4 text-center">
            <p className="text-muted small mb-4">
              Chúng tôi đã gửi mã xác thực 6 chữ số đến email<br />
              <strong className="text-slate-800">{maskEmail(userEmail)}</strong>
            </p>

            {/* 6-digit OTP boxes (Horizontal Row) */}
            <div
              className="d-flex align-items-center justify-content-center gap-2 mb-3 mt-2"
              style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', gap: '8px' }}
            >
              {otpArray.map((digit, i) => (
                <input
                  key={i}
                  type="text"
                  className="form-control text-center fw-bold"
                  style={{
                    width: '46px',
                    height: '50px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '22px',
                    textAlign: 'center',
                    backgroundColor: '#ffffff',
                    outline: 'none'
                  }}
                  value={digit}
                  maxLength={1}
                  onChange={(e) => handleOtpChange(e.target, i)}
                  onKeyDown={(e) => handleOtpKeyDown(e, i)}
                  onPaste={handleOtpPaste}
                  autoFocus={i === 0}
                />
              ))}
            </div>

            {/* Error Message */}
            {otpError && (
              <div className="validation-text-v2 text-danger text-center mb-3 fw-semibold" style={{ fontSize: '13px' }}>
                {otpError}
              </div>
            )}

            {/* Resend Timer */}
            <div className="text-center mb-4" style={{ fontSize: '13px' }}>
              <span className="text-muted">Không nhận được mã? </span>
              {resendTimer > 0 ? (
                <span className="text-muted fw-bold">Gửi lại sau {resendTimer}s</span>
              ) : (
                <button
                  type="button"
                  className="btn btn-link p-0 text-decoration-none fw-bold"
                  style={{ color: '#008ecf', fontSize: '13px' }}
                  onClick={() => { setResendTimer(60); onResendOtp(); }}
                >
                  Gửi lại mã OTP
                </button>
              )}
            </div>

            {/* Modal Buttons */}
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-secondary py-2.5 px-4 rounded-3 text-sm fw-bold border-0 flex-grow-1"
                style={{ backgroundColor: '#e2e8f0', color: '#475569' }}
                onClick={onClose}
                disabled={isVerifying}
              >
                HỦY BỎ
              </button>
              <button
                type="button"
                className="app-btn-blue-v2 py-2.5 px-4 rounded-3 text-sm fw-bold flex-grow-1"
                onClick={() => onVerifyOtp(otpCode)}
                disabled={isVerifying || otpCode.length < 6}
              >
                {isVerifying ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                    ĐANG XÁC THỰC...
                  </>
                ) : (
                  'XÁC THỰC'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OtpVerificationModal;
