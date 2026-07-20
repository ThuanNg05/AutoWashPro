import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { adminService } from "../services/adminService";
import { customerService } from "../services/customerService";
import { useAuth } from "../hooks/useAuth";
import "../styles/shared.css";

const STATUS_PAID = 2;
const STATUS_FAILED = 3;
const STATUS_EXPIRED = 4;
const POLL_INTERVAL = 3000;

// mm:ss from a positive number of seconds.
const fmt = (secs) => {
  const s = Math.max(0, Math.floor(secs));
  const m = String(Math.floor(s / 60)).padStart(2, "0");
  const r = String(s % 60).padStart(2, "0");
  return `${m}:${r}`;
};

export const PaymentCheckout = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();

  const [payment, setPayment] = useState(location.state?.payment || null);
  const [loadError, setLoadError] = useState(false);
  const [remaining, setRemaining] = useState(null); // seconds until expiry
  const [expired, setExpired] = useState(false);

  const pollRef = useRef(null);
  const abortRef = useRef(false);

  const dashboardPath = isAdmin ? "/admin/dashboard" : "/customer/dashboard";
  const goDashboard = () => navigate(dashboardPath, { replace: true });

  // ── Ensure we have payment data (create the link if arrived without state) ──
  useEffect(() => {
    if (payment) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await adminService.createPayment(Number(bookingId));
        if (cancelled) return;
        if (res?.success && res.payment) {
          if (res.payment.isFree && res.payment.redirectUrl) {
            window.location.href = res.payment.redirectUrl;
            return;
          }
          setPayment(res.payment);
        } else {
          setLoadError(true);
        }
      } catch {
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [payment, bookingId]);

  // ── Free bookings never reach this page's QR flow — redirect out ──
  useEffect(() => {
    if (payment?.isFree && payment.redirectUrl) {
      window.location.href = payment.redirectUrl;
    }
  }, [payment]);

  // ── Real-time countdown driven by the backend's expiry setting ──
  useEffect(() => {
    if (!payment?.expiredAt) return;
    const tick = () => {
      const secs = payment.expiredAt - Math.floor(Date.now() / 1000);
      setRemaining(secs);
      if (secs <= 0) setExpired(true);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [payment]);

  // ── Poll the backend for a status change (paid / failed / expired) ──
  const poll = useCallback(async () => {
    if (abortRef.current || !bookingId) return;
    try {
      const data = await customerService.getPaymentStatus(Number(bookingId), {
        skipGlobalLoader: true,
      });
      const status = data?.payment?.status;
      if (abortRef.current) return;
      if (status === STATUS_PAID) {
        navigate(`/payment/result?payment=success&bookingId=${bookingId}`, { replace: true });
      } else if (status === STATUS_FAILED) {
        navigate(`/payment/result?payment=cancel&bookingId=${bookingId}`, { replace: true });
      } else if (status === STATUS_EXPIRED) {
        setExpired(true);
      }
    } catch {
      /* transient — keep polling */
    }
  }, [bookingId, navigate]);

  useEffect(() => {
    if (!payment || payment.isFree) return;
    abortRef.current = false;
    pollRef.current = setInterval(poll, POLL_INTERVAL);
    poll();
    return () => {
      abortRef.current = true;
      clearInterval(pollRef.current);
    };
  }, [payment, poll]);

  // Stop polling once expired (link is dead; the sweep will mark it Hết hạn).
  useEffect(() => {
    if (expired) {
      abortRef.current = true;
      clearInterval(pollRef.current);
    }
  }, [expired]);

  const copy = (text, label) => {
    navigator.clipboard.writeText(text);
    if (window.showToast) window.showToast(`Đã sao chép ${label}!`, "success");
  };

  // ── Render states ──────────────────────────────────────────────
  const shell = (children) => (
    <div
      className="d-flex align-items-center justify-content-center min-vh-100 p-3"
      style={{ background: "linear-gradient(160deg, #0f172a 0%, #1e293b 100%)" }}
    >
      <div
        className="bg-white rounded-4 shadow-lg p-4 p-md-5 text-center"
        style={{ maxWidth: "440px", width: "100%" }}
      >
        {children}
      </div>
    </div>
  );

  if (loadError) {
    return shell(
      <>
        <i className="fas fa-triangle-exclamation fa-3x text-danger mb-3"></i>
        <h5 className="fw-bold text-dark mb-2">Không tạo được liên kết thanh toán</h5>
        <p className="text-muted small mb-4">Vui lòng thử lại từ hàng đợi dịch vụ.</p>
        <button className="btn btn-dark w-100 py-2.5 fw-bold rounded-3" onClick={goDashboard}>
          <i className="fas fa-arrow-left me-2"></i>Quay lại Dashboard
        </button>
      </>
    );
  }

  if (!payment) {
    return shell(
      <>
        <div className="spinner-border text-info mb-3" role="status">
          <span className="visually-hidden">Đang tải...</span>
        </div>
        <p className="text-muted small mb-0">Đang tạo liên kết thanh toán PayOS...</p>
      </>
    );
  }

  if (expired) {
    return shell(
      <>
        <i className="fas fa-clock fa-3x text-secondary mb-3"></i>
        <h5 className="fw-bold text-dark mb-2">Liên kết thanh toán đã hết hạn</h5>
        <p className="text-muted small mb-4">
          Mã QR cho lịch đặt #{bookingId} đã quá thời gian thanh toán. Vui lòng tạo lại giao dịch.
        </p>
        <button className="btn btn-dark w-100 py-2.5 fw-bold rounded-3" onClick={goDashboard}>
          <i className="fas fa-arrow-left me-2"></i>Quay lại Dashboard
        </button>
      </>
    );
  }

  const low = remaining !== null && remaining <= 60; // last minute → red

  return shell(
    <>
      <div className="mb-3">
        <h5 className="fw-black text-dark mb-1" style={{ letterSpacing: "-0.5px" }}>
          Quét mã QR để thanh toán
        </h5>
        <p className="text-muted small mb-0">Lịch đặt #{bookingId} • PayOS</p>
      </div>

      {/* Countdown */}
      <div
        className="d-inline-flex align-items-center gap-2 px-3 py-2 rounded-pill mb-3 fw-bold"
        style={{
          background: low ? "rgba(220,53,69,0.1)" : "rgba(14,165,233,0.1)",
          color: low ? "#dc3545" : "var(--cyan-electric, #0ea5e9)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <i className="fas fa-hourglass-half"></i>
        <span>Hết hạn sau {remaining === null ? "--:--" : fmt(remaining)}</span>
      </div>

      {/* QR */}
      {payment.qrCode ? (
        <div className="d-flex justify-content-center mb-3">
          <div className="p-3 bg-white rounded-4 border" style={{ borderColor: "#e2e8f0" }}>
            <QRCodeSVG value={payment.qrCode} size={220} level="M" includeMargin={false} />
          </div>
        </div>
      ) : (
        <p className="text-muted small">Không có mã QR — vui lòng dùng nút PayOS bên dưới.</p>
      )}

      {/* Amount */}
      <div className="mb-3">
        <small className="text-muted d-block" style={{ fontSize: "0.7rem" }}>SỐ TIỀN CẦN THANH TOÁN</small>
        <h3 className="fw-black text-cyan mb-0">{Number(payment.amount || 0).toLocaleString()}đ</h3>
      </div>

      {/* Bank transfer details */}
      {(payment.accountNumber || payment.accountName) && (
        <div className="bg-light rounded-3 p-3 mb-3 text-start" style={{ fontSize: "0.8rem" }}>
          {payment.accountName && (
            <div className="d-flex justify-content-between mb-1">
              <span className="text-muted">Chủ tài khoản</span>
              <strong className="text-dark">{payment.accountName}</strong>
            </div>
          )}
          {payment.accountNumber && (
            <div className="d-flex justify-content-between align-items-center">
              <span className="text-muted">Số tài khoản</span>
              <span className="d-flex align-items-center gap-2">
                <strong className="text-dark font-monospace">{payment.accountNumber}</strong>
                <button
                  className="btn btn-link p-0 text-cyan"
                  style={{ fontSize: "0.75rem" }}
                  onClick={() => copy(payment.accountNumber, "số tài khoản")}
                  title="Sao chép"
                >
                  <i className="far fa-copy"></i>
                </button>
              </span>
            </div>
          )}
        </div>
      )}

      <p className="text-muted mb-3" style={{ fontSize: "0.72rem" }}>
        <span className="spinner-grow spinner-grow-sm text-success me-1" style={{ width: "8px", height: "8px" }}></span>
        Trang sẽ tự cập nhật khi thanh toán thành công.
      </p>

      {/* Actions */}
      <div className="d-grid gap-2">
        {payment.checkoutUrl && (
          <a
            href={payment.checkoutUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn py-2.5 fw-bold rounded-3 text-white"
            style={{ background: "var(--cyan-electric, #0ea5e9)", border: "none" }}
          >
            <i className="fas fa-external-link-alt me-2"></i>Mở trang thanh toán PayOS
          </a>
        )}
        <button className="btn btn-outline-dark py-2.5 fw-bold rounded-3" onClick={goDashboard}>
          <i className="fas fa-arrow-left me-2"></i>Quay lại Dashboard
        </button>
      </div>
    </>
  );
};

export default PaymentCheckout;
