import { useState, useEffect } from "react";
import { adminService } from "../services/adminService";
import "../styles/admin/bookings.css";

// Read-only booking detail drawer. Reuses the exact `booking-drawer text-start`
// block (and its CSS) from AdminBookings so the transaction page surfaces the
// same information without the booking-workflow action controls.
const getStatusLabel = (status) => {
  switch (status) {
    case "Pending": return "Chờ xác nhận";
    case "Confirmed": return "Đã xác nhận";
    case "CheckedIn": return "Đã check-in";
    case "Washing": return "Đang rửa";
    case "Completed": return "Hoàn thành";
    case "Cancelled": return "Đã hủy";
    case "NoShow": return "Khách không đến";
    case "WaitingCheckout": return "Chờ thanh toán";
    default: return status;
  }
};

const getStatusClass = (status) => {
  switch (status) {
    case "Pending": return "status-pending";
    case "Confirmed": return "status-confirmed";
    case "CheckedIn": return "status-checkedin";
    case "Washing": return "status-washing";
    case "Completed": return "status-completed";
    case "Cancelled": return "status-cancelled";
    case "NoShow": return "status-noshow";
    case "WaitingCheckout": return "status-waiting-checkout";
    default: return "";
  }
};

const getTierBadgeClass = (tierName) => {
  const t = (tierName || "").toUpperCase();
  if (t.includes("PLATINUM")) return "tier-pill-platinum active";
  if (t.includes("GOLD")) return "tier-pill-gold active";
  if (t.includes("SILVER")) return "tier-pill-silver active";
  return "tier-pill-member active";
};

const renderSkeletonDrawer = () => (
  <div className="p-4">
    {Array.from({ length: 4 }).map((_, idx) => (
      <div key={idx} className="mb-3">
        <div className="skeleton-pulse skeleton-block mb-2" style={{ width: "40%", height: "14px" }}></div>
        <div className="skeleton-pulse skeleton-block" style={{ width: "100%", height: "60px", borderRadius: "12px" }}></div>
      </div>
    ))}
  </div>
);

export const BookingDetailDrawer = ({ bookingId, onClose }) => {
  const [bookingDetail, setBookingDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    customer: true,
    vehicle: true,
    schedule: true,
    payment: true,
    history: false,
  });

  useEffect(() => {
    if (!bookingId) {
      setBookingDetail(null);
      return;
    }
    let cancelled = false;
    setLoadingDetail(true);
    setExpandedSections({ customer: true, vehicle: true, schedule: true, payment: true, history: false });
    adminService
      .getBookingDetail(bookingId)
      .then((res) => {
        if (cancelled) return;
        if (res && res.success) {
          setBookingDetail(res.booking);
        } else {
          if (window.showToast) window.showToast("Không thể tải chi tiết đặt lịch", "error");
          onClose();
        }
      })
      .catch(() => {
        if (cancelled) return;
        if (window.showToast) window.showToast("Lỗi tải chi tiết đặt lịch", "error");
        onClose();
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false);
      });
    return () => {
      cancelled = true;
    };
  }, [bookingId, onClose]);

  const toggleSection = (section) =>
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text);
    if (window.showToast) window.showToast(`Đã sao chép ${label}!`, "success");
  };

  return (
    <div
      className={`booking-drawer-overlay ${bookingId ? "show" : ""}`}
      onClick={onClose}
    >
      <div className="booking-drawer text-start" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="booking-drawer-header d-flex justify-content-between align-items-center">
          <h5 className="fw-black text-dark mb-0" style={{ letterSpacing: "-0.5px" }}>
            Chi tiết Lịch đặt: #{bookingId}
          </h5>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
        </div>

        {/* Body */}
        <div className="booking-drawer-body">
          {loadingDetail || !bookingDetail ? (
            renderSkeletonDrawer()
          ) : (
            <>
              {/* Section 1: Customer Information */}
              <div className="booking-drawer-section mb-2">
                <div className="booking-drawer-section-title" onClick={() => toggleSection("customer")}>
                  <span>1. Thông tin khách hàng</span>
                  <i className={`fas fa-chevron-${expandedSections.customer ? "up" : "down"} text-muted`} style={{ fontSize: "0.65rem" }}></i>
                </div>
                {expandedSections.customer && (
                  <div className="bg-light p-2 rounded-3 border">
                    <div className="row g-2">
                      <div className="col-6">
                        <small className="text-muted d-block" style={{ fontSize: "0.65rem" }}>Họ tên</small>
                        <strong className="text-dark" style={{ fontSize: "0.8rem" }}>{bookingDetail.customer.fullName}</strong>
                      </div>
                      <div className="col-6">
                        <small className="text-muted d-block" style={{ fontSize: "0.65rem" }}>Số điện thoại</small>
                        <strong className="text-dark font-monospace" style={{ fontSize: "0.8rem" }}>{bookingDetail.customer.phone}</strong>
                      </div>
                      <div className="col-6 border-top pt-1">
                        <small className="text-muted d-block" style={{ fontSize: "0.65rem" }}>Email</small>
                        <span className="text-dark small" style={{ fontSize: "0.78rem" }}>{bookingDetail.customer.email || "Chưa cập nhật"}</span>
                      </div>
                      <div className="col-6 border-top pt-1">
                        <small className="text-muted d-block" style={{ fontSize: "0.65rem" }}>Hạng TV & Điểm</small>
                        <div className="d-flex align-items-center gap-1.5 mt-0.5">
                          <span className={getTierBadgeClass(bookingDetail.customer.tierName)} style={{ fontSize: "0.65rem", padding: "1px 6px" }}>
                            {bookingDetail.customer.tierName}
                          </span>
                          <strong className="text-secondary small" style={{ fontSize: "0.75rem" }}>
                            {bookingDetail.customer.pointBalance.toLocaleString()}đ
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 2: Vehicle Information */}
              <div className="booking-drawer-section mb-2">
                <div className="booking-drawer-section-title" onClick={() => toggleSection("vehicle")}>
                  <span>2. Thông tin phương tiện</span>
                  <i className={`fas fa-chevron-${expandedSections.vehicle ? "up" : "down"} text-muted`} style={{ fontSize: "0.65rem" }}></i>
                </div>
                {expandedSections.vehicle && (
                  <div className="bg-light p-2 rounded-3 border">
                    <div className="row g-2">
                      <div className="col-6">
                        <small className="text-muted d-block" style={{ fontSize: "0.65rem" }}>Biển số xe</small>
                        <strong className="text-dark font-monospace" style={{ fontSize: "0.85rem" }}>{bookingDetail.vehicle.licensePlate}</strong>
                      </div>
                      <div className="col-6">
                        <small className="text-muted d-block" style={{ fontSize: "0.65rem" }}>Phân khúc xe</small>
                        <span className="text-dark fw-bold" style={{ fontSize: "0.78rem" }}>{bookingDetail.vehicle.vehicleClass}</span>
                      </div>
                      <div className="col-12 border-top pt-1">
                        <small className="text-muted d-block" style={{ fontSize: "0.65rem" }}>Hãng xe & Dòng xe</small>
                        <span className="text-dark small" style={{ fontSize: "0.78rem" }}>{bookingDetail.vehicle.brand} - {bookingDetail.vehicle.model}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 3: Appointment Information */}
              <div className="booking-drawer-section mb-2">
                <div className="booking-drawer-section-title" onClick={() => toggleSection("schedule")}>
                  <span>3. Thông tin lịch trình</span>
                  <i className={`fas fa-chevron-${expandedSections.schedule ? "up" : "down"} text-muted`} style={{ fontSize: "0.65rem" }}></i>
                </div>
                {expandedSections.schedule && (
                  <div className="bg-light p-2 rounded-3 border">
                    <div className="row g-2">
                      <div className="col-6">
                        <small className="text-muted d-block" style={{ fontSize: "0.65rem" }}>Thời gian hẹn</small>
                        <strong className="text-dark" style={{ fontSize: "0.8rem" }}>
                          {new Date(bookingDetail.scheduledAt).toLocaleDateString("vi-VN")} @{" "}
                          {new Date(bookingDetail.scheduledAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                        </strong>
                      </div>
                      <div className="col-6">
                        <small className="text-muted d-block" style={{ fontSize: "0.65rem" }}>Trạng thái</small>
                        <span className={`booking-status-badge d-inline-block mt-0.5 ${getStatusClass(bookingDetail.status)}`} style={{ fontSize: "0.62rem", padding: "2px 8px" }}>
                          {getStatusLabel(bookingDetail.status)}
                        </span>
                      </div>
                      <div className="col-12 border-top pt-1">
                        <small className="text-muted d-block" style={{ fontSize: "0.65rem" }}>Ngày tạo đơn</small>
                        <span className="text-secondary small" style={{ fontSize: "0.75rem" }}>{new Date(bookingDetail.createdAt).toLocaleString("vi-VN")}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {bookingDetail.status === "Cancelled" && bookingDetail.cancelReason && (
                <div className="booking-drawer-section mb-3">
                  <div
                    className="booking-drawer-section-title text-danger mb-1.5"
                    style={{ fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.8px", borderLeft: "3px solid #dc3545", paddingLeft: "8px" }}
                  >
                    Lý do hủy lịch
                  </div>
                  <div className="p-2 border border-danger-subtle rounded-3 text-danger bg-danger bg-opacity-10 small fw-semibold" style={{ fontSize: "0.78rem" }}>
                    <i className="fas fa-exclamation-circle me-1.5"></i>
                    {bookingDetail.cancelReason}
                  </div>
                </div>
              )}

              {/* Section 4: Payment Summary */}
              <div className="booking-drawer-section mb-2">
                <div className="booking-drawer-section-title" onClick={() => toggleSection("payment")}>
                  <span>4. Chi phí & thanh toán</span>
                  <i className={`fas fa-chevron-${expandedSections.payment ? "up" : "down"} text-muted`} style={{ fontSize: "0.65rem" }}></i>
                </div>
                {expandedSections.payment && (
                  <div className="bg-light p-2 rounded-3 border">
                    {/* Service Table */}
                    <div className="border rounded-3 overflow-hidden bg-white mb-2">
                      <table className="table table-sm table-borderless mb-0 align-middle" style={{ fontSize: "0.78rem", tableLayout: "fixed", width: "100%" }}>
                        <thead className="bg-light border-bottom" style={{ fontSize: "0.65rem", fontWeight: 800, textTransform: "uppercase" }}>
                          <tr>
                            <th className="ps-3 py-1.5 text-muted" style={{ width: "60%" }}>Tên dịch vụ</th>
                            <th className="py-1.5 text-muted text-center" style={{ width: "20%" }}>Thời lượng</th>
                            <th className="pe-3 py-1.5 text-muted text-end" style={{ width: "20%" }}>Đơn giá</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bookingDetail.mainService ? (
                            <tr>
                              <td className="ps-3 py-2 fw-semibold text-dark" style={{ wordBreak: "break-word", whiteSpace: "normal" }}>
                                <i className="fas fa-cog text-cyan me-1.5"></i>
                                {bookingDetail.mainService.serviceName}{" "}
                                <span className="badge bg-cyan text-dark small" style={{ fontSize: "0.55rem", padding: "1.5px 4px" }}>Chính</span>
                              </td>
                              <td className="py-2 text-center text-secondary">60 phút</td>
                              <td className="pe-3 py-2 text-end fw-semibold text-dark">{Number(bookingDetail.mainService.price).toLocaleString()}đ</td>
                            </tr>
                          ) : (
                            <tr>
                              <td colSpan="3" className="ps-3 py-2 text-secondary text-center">Không có dịch vụ chính</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Payment Calculations */}
                    <div className="px-1 py-1">
                      <div className="d-flex justify-content-between align-items-center mb-1.5 small text-secondary" style={{ fontSize: "0.78rem" }}>
                        <span>Tổng tiền dịch vụ:</span>
                        <span>{Number(bookingDetail.basePrice).toLocaleString()}đ</span>
                      </div>
                      {bookingDetail.voucher && (
                        <div className="border-top pt-1.5 mt-1.5 mb-1.5">
                          <div className="d-flex justify-content-between align-items-start mb-1 small text-danger" style={{ fontSize: "0.78rem" }}>
                            <div>
                              <strong className="text-danger">
                                <i className="fas fa-ticket-alt me-1.5"></i>
                                {bookingDetail.voucher.rewardName}
                              </strong>
                              {bookingDetail.voucher.description && (
                                <small className="text-muted d-block" style={{ fontSize: "0.62rem" }}>{bookingDetail.voucher.description}</small>
                              )}
                            </div>
                            <span className="fw-bold text-danger">
                              -{Number(bookingDetail.voucher.discountValue || bookingDetail.promoDiscount).toLocaleString()}đ
                            </span>
                          </div>
                        </div>
                      )}
                      <div className="d-flex justify-content-between align-items-center border-top pt-1.5 fw-bold" style={{ fontSize: "0.88rem" }}>
                        <span className="text-dark">Số tiền cần trả:</span>
                        <span className="text-cyan" style={{ fontSize: "1rem" }}>{Number(bookingDetail.finalPrice).toLocaleString()}đ</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center mt-1.5 mb-1.5 small text-success" style={{ fontSize: "0.75rem" }}>
                        <span>Tích lũy Loyalty:</span>
                        <span>+{bookingDetail.pointsEarned}đ</span>
                      </div>

                      {/* Payment Details Card */}
                      {bookingDetail.status === "Completed" || bookingDetail.paymentStatus === "Paid" ? (
                        <div className="border-top pt-2 mt-2" style={{ fontSize: "0.75rem", borderStyle: "dashed" }}>
                          <div className="d-flex align-items-center justify-content-between mb-1.5">
                            <span className="text-secondary">Trạng thái thanh toán:</span>
                            <span className="badge bg-success bg-opacity-10 text-success fw-bold" style={{ fontSize: "0.65rem", padding: "3px 8px" }}>ĐÃ THANH TOÁN</span>
                          </div>
                          <div className="d-flex align-items-center justify-content-between mb-1.5">
                            <span className="text-secondary">Thời gian thanh toán:</span>
                            <strong className="text-dark">{bookingDetail.paidAt ? new Date(bookingDetail.paidAt).toLocaleString("vi-VN") : "Đã thanh toán"}</strong>
                          </div>
                          {bookingDetail.paymentMethod && (
                            <div className="d-flex align-items-center justify-content-between mb-1.5">
                              <span className="text-secondary">Phương thức:</span>
                              <strong className="text-dark">{bookingDetail.paymentMethod === "PayOS" ? "Thanh toán trực tuyến (PayOS)" : bookingDetail.paymentMethod}</strong>
                            </div>
                          )}
                          {bookingDetail.transactionNo && (
                            <div className="d-flex align-items-center justify-content-between mb-1.5">
                              <span className="text-secondary">Mã giao dịch:</span>
                              <div className="d-flex align-items-center gap-1.5">
                                <strong className="font-monospace text-dark">{bookingDetail.transactionNo}</strong>
                                <button onClick={() => handleCopy(bookingDetail.transactionNo, "mã giao dịch")} className="btn btn-link p-0 text-cyan text-decoration-none" style={{ fontSize: "0.7rem" }} title="Sao chép">
                                  <i className="far fa-copy"></i>
                                </button>
                              </div>
                            </div>
                          )}
                          {bookingDetail.invoice && (
                            <div className="d-flex align-items-center justify-content-between mb-0">
                              <span className="text-secondary">Số hóa đơn:</span>
                              <div className="d-flex align-items-center gap-1.5">
                                <strong className="font-monospace text-dark">{bookingDetail.invoice.invoiceNumber}</strong>
                                <button onClick={() => handleCopy(bookingDetail.invoice.invoiceNumber, "số hóa đơn")} className="btn btn-link p-0 text-cyan text-decoration-none" style={{ fontSize: "0.7rem" }} title="Sao chép">
                                  <i className="far fa-copy"></i>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="border-top pt-2 mt-2" style={{ fontSize: "0.75rem", borderStyle: "dashed" }}>
                          <div className="d-flex align-items-center justify-content-between mb-0">
                            <span className="text-secondary">Trạng thái thanh toán:</span>
                            <span className="badge bg-warning bg-opacity-10 text-warning fw-bold" style={{ fontSize: "0.65rem", padding: "3px 8px" }}>CHƯA THANH TOÁN</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Section 5: Timeline & Reschedule History */}
              <div className="booking-drawer-section mb-0">
                <div className="booking-drawer-section-title" onClick={() => toggleSection("history")}>
                  <span>5. Dòng thời gian & Lịch sử đặt lịch</span>
                  <i className={`fas fa-chevron-${expandedSections.history ? "up" : "down"} text-muted`} style={{ fontSize: "0.65rem" }}></i>
                </div>
                {expandedSections.history && (
                  <div className="bg-light p-2 rounded-3 border d-flex flex-column gap-2">
                    {/* Timeline Audit Logs */}
                    <div>
                      <small className="text-muted d-block fw-bold mb-1.5" style={{ fontSize: "0.65rem", letterSpacing: "0.5px" }}>DÒNG THỜI GIAN ĐƠN ĐẶT</small>
                      {bookingDetail.timeline && bookingDetail.timeline.length > 0 ? (
                        <div className="booking-timeline ps-2 border-start py-1" style={{ fontSize: "0.75rem" }}>
                          {bookingDetail.timeline.map((log) => (
                            <div key={log.id} className="timeline-item mb-2 position-relative">
                              <div className="timeline-marker" style={{ left: "-12.5px", top: "4px", width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--cyan-electric)", position: "absolute" }}></div>
                              <div className="d-flex justify-content-between align-items-start ms-2">
                                <div>
                                  <strong className="text-dark">
                                    {log.action === "Created" ? "Khởi tạo"
                                      : log.action === "Confirmed" ? "Đã duyệt"
                                      : log.action === "CheckedIn" ? "Đã check-in"
                                      : log.action === "WashingStarted" ? "Đang rửa"
                                      : log.action === "Completed" ? "Hoàn thành"
                                      : log.action === "Cancelled" ? "Đã hủy"
                                      : log.action === "NoShow" ? "Khách không đến"
                                      : log.action === "Rescheduled" ? "Đổi lịch"
                                      : log.action}
                                  </strong>
                                  <span className="text-secondary d-block mt-0.5" style={{ fontSize: "0.72rem" }}>{log.description}</span>
                                </div>
                                <div className="text-end text-muted font-monospace" style={{ fontSize: "0.68rem", minWidth: "100px" }}>
                                  {new Date(log.createdAt).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                                  <span className="badge bg-secondary-subtle text-secondary ms-1" style={{ fontSize: "0.55rem" }}>{log.performedBy}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="small text-secondary text-center py-1">Không có nhật ký dòng thời gian</div>
                      )}
                    </div>

                    {/* Reschedule History */}
                    {bookingDetail.reschedules && bookingDetail.reschedules.length > 0 && (
                      <div className="border-top pt-2.5">
                        <small className="text-muted d-block fw-bold mb-2" style={{ fontSize: "0.65rem", letterSpacing: "0.5px" }}>LỊCH SỬ ĐỔI LỊCH HẸN</small>
                        <div className="d-flex flex-column gap-2" style={{ fontSize: "0.75rem" }}>
                          {bookingDetail.reschedules.map((resch) => (
                            <div key={resch.id} className="bg-white p-2 rounded border border-info-subtle">
                              <div className="d-flex justify-content-between align-items-center mb-1">
                                <strong className="text-info"><i className="fas fa-calendar-alt me-1"></i>Thay đổi lịch hẹn</strong>
                                <span className="text-muted font-monospace" style={{ fontSize: "0.65rem" }}>{new Date(resch.createdAt).toLocaleDateString("vi-VN")}</span>
                              </div>
                              <div className="text-dark mb-1">
                                <span>Từ: </span>
                                <span className="text-muted">{new Date(resch.oldScheduledAt).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}</span>
                                <span className="mx-1.5"><i className="fas fa-long-arrow-alt-right"></i></span>
                                <span>Sang: </span>
                                <strong className="text-dark">{new Date(resch.newScheduledAt).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}</strong>
                              </div>
                              <div className="text-secondary" style={{ fontSize: "0.7rem" }}>
                                <strong>Lý do:</strong> {resch.reason}{" "}
                                <span className="badge bg-light text-secondary border float-end">{resch.changedBy}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {bookingDetail.notes && (
                <div className="mt-2.5">
                  <small className="text-muted d-block fw-bold mb-1" style={{ fontSize: "0.62rem", letterSpacing: "0.5px" }}>GHI CHÚ / YÊU CẦU ĐẶC BIỆT</small>
                  <div className="p-2 border rounded text-secondary bg-white small" style={{ fontSize: "0.75rem" }}>{bookingDetail.notes}</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingDetailDrawer;
