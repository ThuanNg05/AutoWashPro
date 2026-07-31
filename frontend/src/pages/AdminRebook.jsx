import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { customerService } from "../services/customerService";
import { adminService } from "../services/adminService";
import "../styles/shared.css";
import "../styles/customer/booking.css";

const DEFAULT_TIME_SLOTS = [
  "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00",
  "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00",
];

const iconForService = (name) => {
  const n = (name || "").toLowerCase();
  if (n.includes("sấy") || n.includes("khô")) return "fa-wind";
  if (n.includes("hút bụi") || n.includes("vệ sinh")) return "fa-broom";
  if (n.includes("phủ") || n.includes("ceramic")) return "fa-gem";
  if (n.includes("premium") || n.includes("cao cấp")) return "fa-sparkles";
  if (n.includes("đặc biệt") || n.includes("deluxe")) return "fa-crown";
  return "fa-soap";
};

// Trang staff đặt lại lịch hộ khách, mở qua tab mới sau khi mô phỏng "Hệ thống lỗi".
// Prefill khách + xe; staff chọn lại dịch vụ + slot hợp lệ tiếp theo. Tái dùng đúng
// logic kiểm tra slot của CustomerBooking (occupied slots, ngày sớm nhất, khung ngày theo hạng).
export const AdminRebook = () => {
  const [searchParams] = useSearchParams();
  const customerId = searchParams.get("customerId");
  const plate = searchParams.get("plate");

  const [context, setContext] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  const [mainServices, setMainServices] = useState([]);
  const [addonServices, setAddonServices] = useState([]);
  const [selectedMain, setSelectedMain] = useState(null);
  const [selectedAddons, setSelectedAddons] = useState([]);

  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [minDateStr, setMinDateStr] = useState("");
  const [maxDateStr, setMaxDateStr] = useState("");
  const [bookingDaysWindow, setBookingDaysWindow] = useState(7);

  const [timeSlots, setTimeSlots] = useState(DEFAULT_TIME_SLOTS);
  const [slotsStatus, setSlotsStatus] = useState({});
  const [occupiedSlots, setOccupiedSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [earliestAvailableDate, setEarliestAvailableDate] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(null);

  // Load booking config (dynamic slots)
  useEffect(() => {
    customerService
      .getBookingConfig()
      .then((res) => {
        if (res.success && res.slots) setTimeSlots(res.slots);
      })
      .catch((err) => console.error("Error loading booking config:", err));

    // Default date = today
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    setMinDateStr(todayStr);
    setBookingDate(todayStr);
  }, []);

  // Load rebook context (customer + tier window + vehicles) and services
  useEffect(() => {
    if (!customerId) {
      setLoadError("Thiếu thông tin khách hàng (customerId).");
      return;
    }

    const loadContext = async () => {
      try {
        const res = await adminService.getRebookContext(customerId);
        if (res.success && res.context) {
          setContext(res.context);
          const days = res.context.bookingWindowDays || 7;
          setBookingDaysWindow(days);

          const today = new Date();
          const maxDate = new Date();
          maxDate.setDate(today.getDate() + days);
          setMaxDateStr(
            `${maxDate.getFullYear()}-${String(maxDate.getMonth() + 1).padStart(2, "0")}-${String(maxDate.getDate()).padStart(2, "0")}`,
          );

          const vehicles = res.context.vehicles || [];
          const preselect =
            vehicles.find((v) => v.licensePlate === plate) || vehicles[0] || null;
          setSelectedVehicle(preselect);
        } else {
          setLoadError(res.message || "Không tải được thông tin khách hàng.");
        }
      } catch (err) {
        console.error(err);
        setLoadError(
          err.response?.data?.message || "Lỗi tải thông tin khách hàng.",
        );
      }
    };

    const loadServices = async () => {
      try {
        const res = await customerService.getServices();
        if (res.success && res.services?.length) {
          const all = res.services.map((s) => ({
            id: s.id,
            name: s.name,
            desc: s.desc,
            price: s.price,
            estimatedMinutes: s.estimatedMinutes,
            time: s.estimatedMinutes + " phút",
            isAddOn: s.isAddOn,
            icon: iconForService(s.name),
          }));
          const mains = all.filter((s) => !s.isAddOn);
          const addons = all.filter((s) => s.isAddOn);
          setMainServices(mains);
          setAddonServices(addons);
          if (mains.length > 0) {
            const standard = mains.find(
              (s) => s.name === "Standard Car Wash" || s.id === "999",
            );
            setSelectedMain(standard || mains[0]);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };

    loadContext();
    loadServices();
  }, [customerId, plate]);

  // Load occupied slots for selected date
  const fetchSlots = useCallback(async () => {
    if (!bookingDate) return;
    setLoadingSlots(true);
    setEarliestAvailableDate(null);
    try {
      const res = await customerService.getOccupiedSlots(bookingDate);
      if (res.success) {
        setSlotsStatus(res.slotsStatus || {});
        setOccupiedSlots(res.occupiedSlots || []);
      }
    } catch (err) {
      console.error("Error fetching slots status:", err);
    } finally {
      setLoadingSlots(false);
    }
  }, [bookingDate]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  const availableTimeSlots = useMemo(() => {
    const today = new Date();
    const todayStr =
      today.getFullYear() +
      "-" +
      String(today.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(today.getDate()).padStart(2, "0");

    let slots = timeSlots;
    if (bookingDate === todayStr) {
      const minAllowedTime = new Date(today.getTime() + 15 * 60 * 1000);
      slots = timeSlots.filter((t) => {
        const [hours, minutes] = t.split(":").map(Number);
        const slotDate = new Date();
        slotDate.setHours(hours, minutes, 0, 0);
        return slotDate > minAllowedTime;
      });
    }
    return slots.filter((t) => !occupiedSlots.includes(t));
  }, [bookingDate, occupiedSlots, timeSlots]);

  // Find earliest available date if this date has no slots
  useEffect(() => {
    if (!loadingSlots && bookingDate && availableTimeSlots.length === 0) {
      customerService
        .getEarliestAvailableDate(bookingDate, bookingDaysWindow)
        .then((res) => {
          if (res.success && res.earliestDate)
            setEarliestAvailableDate(res.earliestDate);
        })
        .catch((err) =>
          console.error("Error fetching earliest available date:", err),
        );
    }
  }, [bookingDate, availableTimeSlots, loadingSlots, bookingDaysWindow]);

  useEffect(() => {
    if (bookingTime && bookingDate && !availableTimeSlots.includes(bookingTime)) {
      setBookingTime("");
    }
  }, [availableTimeSlots, bookingDate, bookingTime]);

  // Pricing
  const mainPrice = selectedMain ? Number(selectedMain.price) : 0;
  const addonsPrice = selectedAddons.reduce((sum, name) => {
    const a = addonServices.find((x) => x.name === name);
    return sum + (a ? Number(a.price) : 0);
  }, 0);
  const baseTotal = mainPrice + addonsPrice;
  const totalDurationMinutes =
    (selectedMain ? selectedMain.estimatedMinutes : 50) +
    selectedAddons.reduce((sum, name) => {
      const a = addonServices.find((x) => x.name === name);
      return sum + (a ? a.estimatedMinutes : 0);
    }, 0);

  const handleConfirm = useCallback(async () => {
    if (isSubmitting) return;

    if (!selectedVehicle) {
      if (window.showToast) window.showToast("Không có phương tiện!", "warning");
      return;
    }
    if (!selectedMain) {
      if (window.showToast)
        window.showToast("Vui lòng chọn gói dịch vụ chính!", "warning");
      return;
    }
    if (!bookingDate || !bookingTime) {
      if (window.showToast)
        window.showToast("Vui lòng chọn ngày và khung giờ!", "warning");
      return;
    }

    const selDate = new Date(bookingDate + "T00:00:00");
    const minD = new Date(minDateStr + "T00:00:00");
    const maxD = new Date(maxDateStr + "T00:00:00");
    if (selDate < minD || selDate > maxD) {
      if (window.showToast)
        window.showToast(
          `Ngày chọn không hợp lệ. Hạng thành viên của khách chỉ được đặt lịch từ ${minD.toLocaleDateString("vi-VN")} đến ${maxD.toLocaleDateString("vi-VN")}.`,
          "warning",
        );
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await adminService.createBookingForCustomer({
        CustomerId: Number(customerId),
        LicensePlate: selectedVehicle.licensePlate,
        MainServiceName: selectedMain.name,
        AddOnServiceNames: selectedAddons,
        BookingDate: bookingDate,
        BookingTime: bookingTime,
        Notes: "Đặt lại lịch cho khách sau sự cố hệ thống.",
      });

      if (result.success) {
        if (window.showToast)
          window.showToast("Đặt lại lịch thành công cho khách!", "success");
        setDone({
          plate: selectedVehicle.licensePlate,
          date: bookingDate.split("-").reverse().join("/"),
          time: bookingTime,
          service: selectedMain.name,
        });
      } else {
        if (window.showToast)
          window.showToast(result.message || "Đặt lịch thất bại!", "warning");
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error(err);
      const errMsg =
        err.response?.data?.message || "Đặt lịch thất bại. Vui lòng thử lại!";
      if (window.showToast) window.showToast(errMsg, "warning");
      setIsSubmitting(false);
    }
  }, [
    isSubmitting,
    selectedVehicle,
    selectedMain,
    selectedAddons,
    bookingDate,
    bookingTime,
    minDateStr,
    maxDateStr,
    customerId,
  ]);

  if (loadError) {
    return (
      <div className="container-fluid py-5 text-center">
        <div className="alert alert-danger d-inline-block px-4 py-3 fw-semibold">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {loadError}
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="container-fluid py-5 text-center">
        <div
          className="app-card border-0 shadow-sm p-5 bg-white rounded-4 mx-auto"
          style={{ maxWidth: "480px" }}
        >
          <i
            className="fas fa-circle-check text-success mb-3"
            style={{ fontSize: "3rem" }}
          ></i>
          <h4 className="fw-bold text-dark mb-3">Đã đặt lại lịch thành công</h4>
          <div className="text-start bg-light rounded-3 p-3 mb-3">
            <div className="d-flex justify-content-between mb-1">
              <span className="text-muted small">Xe:</span>
              <strong className="font-monospace">{done.plate}</strong>
            </div>
            <div className="d-flex justify-content-between mb-1">
              <span className="text-muted small">Dịch vụ:</span>
              <strong>{done.service}</strong>
            </div>
            <div className="d-flex justify-content-between mb-1">
              <span className="text-muted small">Ngày:</span>
              <strong>{done.date}</strong>
            </div>
            <div className="d-flex justify-content-between">
              <span className="text-muted small">Khung giờ:</span>
              <strong>{done.time}</strong>
            </div>
          </div>
          <button
            className="app-btn-primary px-4 py-2 border-0 text-dark fw-bold"
            style={{ borderRadius: "10px" }}
            onClick={() => window.close()}
          >
            Đóng tab
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4 text-start">
      {/* Banner ngữ cảnh */}
      <div className="alert alert-warning d-flex align-items-center gap-2 mb-4">
        <i className="fas fa-triangle-exclamation"></i>
        <div className="small">
          <strong>Đặt lại lịch sau sự cố hệ thống</strong> — khách{" "}
          <strong>{context?.customerName || "..."}</strong>
          {context?.tierName ? ` (hạng ${context.tierName})` : ""}. Lịch cũ đã bị
          hủy và không thu phí. Vui lòng chọn slot hợp lệ tiếp theo.
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-8">
          {/* Xe (prefill, khóa) */}
          <div className="app-card border-0 shadow-sm p-3 bg-white rounded-4 mb-3">
            <h6
              className="fw-bold mb-3"
              style={{ color: "var(--navy-dark)", fontSize: "0.92rem" }}
            >
              <span
                className="step-num-badge"
                style={{ width: "22px", height: "22px", fontSize: "0.75rem", marginRight: "6px" }}
              >
                1
              </span>{" "}
              Phương tiện của khách
            </h6>
            {selectedVehicle ? (
              <div className="selectable-card selected p-3 rounded-4 border">
                <div className="d-flex align-items-start gap-3">
                  <div
                    className="rounded-3 d-flex align-items-center justify-content-center bg-white border shadow-sm"
                    style={{ width: "44px", height: "44px", flexShrink: 0 }}
                  >
                    <i className="fas fa-car-side text-muted"></i>
                  </div>
                  <div className="flex-grow-1">
                    <div
                      className="fw-bold"
                      style={{ color: "var(--navy-dark)", fontSize: "0.9rem" }}
                    >
                      {selectedVehicle.licensePlate}
                    </div>
                    <small className="text-muted d-block">
                      {selectedVehicle.brand} {selectedVehicle.model} (
                      {selectedVehicle.vehicleClass})
                    </small>
                  </div>
                </div>
              </div>
            ) : (
              <div className="alert alert-warning py-2 mb-0 small">
                Khách chưa có phương tiện nào.
              </div>
            )}
          </div>

          {/* Dịch vụ */}
          <div className="app-card border-0 shadow-sm p-3 bg-white rounded-4 mb-3">
            <h6
              className="fw-bold mb-2.5"
              style={{ color: "var(--navy-dark)", fontSize: "0.92rem" }}
            >
              <span
                className="step-num-badge"
                style={{ width: "22px", height: "22px", fontSize: "0.75rem", marginRight: "6px" }}
              >
                2
              </span>{" "}
              Chọn gói dịch vụ
            </h6>
            <div className="row g-2 mb-3">
              {mainServices.map((svc) => {
                const isSelected = selectedMain && selectedMain.id === svc.id;
                return (
                  <div key={svc.id} className="col-12 col-sm-6">
                    <div
                      className={`p-3 rounded-3 border h-100 ${
                        isSelected
                          ? "border-info bg-info bg-opacity-10 shadow-sm"
                          : "border-light bg-white hover-shadow"
                      }`}
                      style={{ cursor: "pointer" }}
                      onClick={() => setSelectedMain(svc)}
                    >
                      <div className="d-flex justify-content-between align-items-start mb-1.5">
                        <strong
                          className={`fw-bold d-block ${isSelected ? "text-info" : "text-dark"}`}
                          style={{ fontSize: "0.88rem" }}
                        >
                          <i className={`fas ${svc.icon} me-1.5`}></i>
                          {svc.name}
                        </strong>
                        <span
                          className="badge bg-light text-dark border small fw-bold"
                          style={{ fontSize: "0.72rem" }}
                        >
                          {Number(svc.price).toLocaleString()}đ
                        </span>
                      </div>
                      <p
                        className="mb-0 text-muted"
                        style={{ fontSize: "0.72rem", lineHeight: "1.4", minHeight: "34px" }}
                      >
                        {svc.desc}
                      </p>
                      <div className="mt-1.5">
                        <small className="text-secondary" style={{ fontSize: "0.68rem" }}>
                          <i className="far fa-clock me-1"></i>Thời gian: {svc.time}
                        </small>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {addonServices.length > 0 && (
              <div className="mt-3 border-top pt-3">
                <h6
                  className="fw-bold mb-2.5"
                  style={{ color: "var(--navy-dark)", fontSize: "0.85rem" }}
                >
                  <i className="fas fa-plus-circle text-info me-1.5"></i>Dịch vụ đi
                  kèm tùy chọn
                </h6>
                <div className="row g-2">
                  {addonServices.map((addon) => {
                    const isChecked = selectedAddons.includes(addon.name);
                    return (
                      <div key={addon.id} className="col-12 col-sm-6">
                        <div
                          className={`p-2.5 rounded-3 border h-100 ${
                            isChecked
                              ? "border-info bg-info bg-opacity-10 shadow-sm"
                              : "border-light bg-white hover-shadow"
                          }`}
                          style={{ cursor: "pointer" }}
                          onClick={() => {
                            if (isChecked) {
                              setSelectedAddons(
                                selectedAddons.filter((n) => n !== addon.name),
                              );
                            } else {
                              setSelectedAddons([...selectedAddons, addon.name]);
                            }
                          }}
                        >
                          <div className="d-flex justify-content-between align-items-center">
                            <strong
                              className={isChecked ? "text-info" : "text-dark"}
                              style={{ fontSize: "0.78rem" }}
                            >
                              {addon.name}
                            </strong>
                            <span
                              className="text-cyan fw-bold"
                              style={{ fontSize: "0.75rem" }}
                            >
                              +{Number(addon.price).toLocaleString()}đ
                            </span>
                          </div>
                          <p
                            className="mb-0 text-muted mt-0.5"
                            style={{ fontSize: "0.68rem", lineHeight: "1.3" }}
                          >
                            {addon.desc}
                          </p>
                          <div className="mt-1">
                            <small className="text-secondary" style={{ fontSize: "0.65rem" }}>
                              <i className="far fa-clock me-1"></i>+{addon.time}
                            </small>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Ngày & giờ */}
          <div className="app-card border-0 shadow-sm p-3 bg-white rounded-4 mb-3">
            <h6
              className="fw-bold mb-3"
              style={{ color: "var(--navy-dark)", fontSize: "0.92rem" }}
            >
              <span
                className="step-num-badge"
                style={{ width: "22px", height: "22px", fontSize: "0.75rem", marginRight: "6px" }}
              >
                3
              </span>{" "}
              Chọn ngày & khung giờ
            </h6>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label small fw-bold text-secondary">
                  NGÀY HẸN RỬA
                </label>
                <input
                  type="date"
                  className="form-control bg-light border-0 py-2.5 rounded-3 fw-semibold text-dark"
                  min={minDateStr}
                  max={maxDateStr}
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                />
                <small className="text-muted d-block mt-2">
                  Hạng {context?.tierName || "thành viên"}: đặt trước tối đa{" "}
                  {bookingDaysWindow} ngày
                </small>
              </div>
              <div className="col-md-6">
                <label className="form-label small fw-bold text-secondary mb-2">
                  KHUNG GIỜ
                </label>
                <div className="row g-2">
                  {loadingSlots ? (
                    <div className="col-12 text-center py-4 small text-secondary">
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                      ></span>
                      Đang tải danh sách slot...
                    </div>
                  ) : availableTimeSlots.length === 0 ? (
                    <div className="col-12">
                      <div className="text-danger py-3 px-3 bg-danger bg-opacity-10 border border-danger border-opacity-20 rounded-3 small fw-bold mb-2">
                        <i className="fas fa-exclamation-triangle me-1.5"></i>
                        {bookingDate === minDateStr
                          ? "Hôm nay đã hết slot. Vui lòng chọn ngày khác."
                          : "Tất cả khung giờ ngày này đã được đặt. Vui lòng chọn ngày khác."}
                      </div>
                      {earliestAvailableDate && (
                        <div className="p-3 bg-info bg-opacity-10 border border-info border-opacity-20 rounded-3 small text-secondary">
                          <i className="fas fa-info-circle text-info me-1.5"></i>
                          Ngày sớm nhất có slot trống:{" "}
                          <strong className="text-dark">
                            {earliestAvailableDate.split("-").reverse().join("/")}
                          </strong>
                          .
                          <button
                            type="button"
                            className="btn btn-link p-0 ms-2 text-cyan fw-bold text-decoration-none small align-baseline"
                            style={{ fontSize: "0.78rem" }}
                            onClick={() => setBookingDate(earliestAvailableDate)}
                          >
                            [Chọn ngày này]
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    availableTimeSlots.map((t) => {
                      const remaining = slotsStatus[t] ?? 3;
                      return (
                        <div key={t} className="col-4">
                          <div
                            className={`text-center py-2 rounded-3 border fw-bold selectable-card ${
                              bookingTime === t
                                ? "selected"
                                : "bg-light border-light text-muted"
                            }`}
                            style={{
                              cursor: "pointer",
                              display: "flex",
                              flexDirection: "column",
                              gap: "2px",
                            }}
                            onClick={() => setBookingTime(t)}
                          >
                            <span style={{ fontSize: "0.82rem" }}>{t}</span>
                            <span
                              style={{ fontSize: "0.62rem", fontWeight: "normal", opacity: 0.75 }}
                            >
                              {remaining > 0 ? `Còn ${remaining} slot` : "Hết slot"}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tóm tắt */}
        <div className="col-lg-4">
          <div className="app-card border-0 shadow-sm p-4 bg-white rounded-4 booking-summary-fixed">
            <h5
              className="fw-bold mb-3 border-bottom pb-2.5"
              style={{ color: "var(--navy-dark)", fontSize: "0.95rem" }}
            >
              <i className="fas fa-receipt text-cyan me-2"></i> TÓM TẮT ĐƠN HÀNG
            </h5>

            <div className="d-flex flex-column gap-3 mb-4">
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted small">Khách:</span>
                <span className="fw-bold text-dark" style={{ fontSize: "0.85rem" }}>
                  {context?.customerName || "—"}
                </span>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted small">Xe:</span>
                <span
                  className="fw-bold text-dark font-monospace"
                  style={{ fontSize: "0.88rem" }}
                >
                  {selectedVehicle?.licensePlate || "—"}
                </span>
              </div>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <span className="text-muted small d-block">Gói chính:</span>
                  <strong className="small text-dark">
                    {selectedMain ? selectedMain.name : "Chưa chọn"}
                  </strong>
                </div>
                <span className="fw-bold text-cyan" style={{ fontSize: "0.85rem" }}>
                  {selectedMain
                    ? `${Number(selectedMain.price).toLocaleString()}đ`
                    : "0đ"}
                </span>
              </div>

              {selectedAddons.length > 0 && (
                <div className="d-flex flex-column gap-1.5 border-top pt-2">
                  <span className="text-muted small">Dịch vụ đi kèm:</span>
                  {selectedAddons.map((name) => {
                    const a = addonServices.find((x) => x.name === name);
                    return (
                      <div
                        key={name}
                        className="d-flex justify-content-between align-items-center"
                      >
                        <span className="small text-secondary ps-2">+ {name}</span>
                        <span
                          className="small text-dark fw-semibold"
                          style={{ fontSize: "0.78rem" }}
                        >
                          {a ? `${Number(a.price).toLocaleString()}đ` : "0đ"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <hr className="my-0 opacity-5" />
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted small">Ngày đặt:</span>
                <span className="fw-bold text-dark" style={{ fontSize: "0.8rem" }}>
                  {bookingDate ? bookingDate.split("-").reverse().join("/") : "—"}
                </span>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted small">Khung giờ:</span>
                <span className="fw-bold text-dark" style={{ fontSize: "0.8rem" }}>
                  {bookingTime || "—"}
                </span>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted small">Tổng thời lượng:</span>
                <span className="fw-bold text-cyan" style={{ fontSize: "0.8rem" }}>
                  {totalDurationMinutes} phút ({Math.ceil(totalDurationMinutes / 60)}{" "}
                  khung giờ)
                </span>
              </div>
            </div>

            <div className="d-flex justify-content-between align-items-center border-top pt-4 mb-4">
              <span className="text-muted small d-block">TỔNG CỘNG</span>
              <h3 className="fw-bold text-dark mb-0">
                {Number(baseTotal).toLocaleString()}đ
              </h3>
            </div>

            <button
              onClick={handleConfirm}
              disabled={!selectedVehicle || isSubmitting}
              className="app-btn-primary w-100 border-0 fw-bold text-dark"
              style={{
                borderRadius: "12px",
                padding: "14px",
                fontSize: "0.88rem",
                letterSpacing: "0.5px",
                opacity: !selectedVehicle || isSubmitting ? 0.45 : 1,
                cursor: !selectedVehicle || isSubmitting ? "not-allowed" : "pointer",
                boxShadow: "0 6px 20px rgba(14,165,233,0.28)",
              }}
            >
              {isSubmitting ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  ĐANG TẠO LỊCH...
                </>
              ) : (
                <>
                  ĐẶT LẠI LỊCH CHO KHÁCH <i className="fas fa-arrow-right ms-2"></i>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminRebook;
