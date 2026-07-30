import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { adminService } from "../services/adminService";
import { useBookingHub } from "../hooks/useBookingHub";
import WebcamCaptureModal from "../components/admin/WebcamCaptureModal";
import "../styles/shared.css";
import "../styles/admin/bookings.css";
import "../styles/admin/queue.css";

export const AdminQueue = () => {
  const navigate = useNavigate();
  const getStageLabel = (stage) => stage || "Chờ check-in";

  const [queue, setQueue] = useState({
    waitingForCheckIn: [],
    currentlyProcessing: [],
    completedToday: [],
  });
  const [loading, setLoading] = useState(true);
  const [submittingIds, setSubmittingIds] = useState(new Set());
  const [statusFilter, setStatusFilter] = useState("PROCESSING");

  // Modals state
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  // Live per-second countdown for the "Chi tiết công đoạn" modal.
  const [liveRemaining, setLiveRemaining] = useState(0);

  // Chụp ảnh xe rửa xong, gửi email báo khách
  const photoInputRef = useRef(null);
  const photoTargetRef = useRef(null);
  const [sendingPhotoId, setSendingPhotoId] = useState(null);
  // Bước "Tự động chụp ảnh": item đang mở webcam (null = đóng modal)
  const [captureTarget, setCaptureTarget] = useState(null);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const queueRes = await adminService.getQueue();
      if (queueRes) {
        setQueue({
          waitingForCheckIn: queueRes.waitingForCheckIn || [],
          currentlyProcessing: queueRes.currentlyProcessing || [],
          completedToday: queueRes.completedToday || [],
        });

        // Sync selectedVehicle to avoid stale service data
        setSelectedVehicle((prev) => {
          if (!prev) return null;
          const allItems = [
            ...(queueRes.waitingForCheckIn || []),
            ...(queueRes.currentlyProcessing || []),
            ...(queueRes.completedToday || []),
          ];
          const updated = allItems.find(
            (item) => item.queueId === prev.queueId,
          );
          if (updated) {
            const statusGroup = (queueRes.waitingForCheckIn || []).some(
              (x) => x.queueId === updated.queueId,
            )
              ? "Waiting"
              : (queueRes.currentlyProcessing || []).some(
                    (x) => x.queueId === updated.queueId,
                  )
                ? "Processing"
                : "Completed";
            return {
              ...updated,
              statusGroup,
              mainService: updated.services?.[0]?.name || "Standard Car Wash",
            };
          }
          return prev;
        });
      }
    } catch (err) {
      console.error("Lỗi khi tải hàng đợi từ API:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    let intervalId = null;

    const startPolling = () => {
      if (intervalId) return;
      intervalId = setInterval(() => {
        if (document.hidden) return;

        adminService
          .getQueue({ skipGlobalLoader: true })
          .then((res) => {
            if (res) {
              setQueue({
                waitingForCheckIn: res.waitingForCheckIn || [],
                currentlyProcessing: res.currentlyProcessing || [],
                completedToday: res.completedToday || [],
              });

              // Sync selectedVehicle during polling
              setSelectedVehicle((prev) => {
                if (!prev) return null;
                const allItems = [
                  ...(res.waitingForCheckIn || []),
                  ...(res.currentlyProcessing || []),
                  ...(res.completedToday || []),
                ];
                const updated = allItems.find(
                  (item) => item.queueId === prev.queueId,
                );
                if (updated) {
                  const statusGroup = (res.waitingForCheckIn || []).some(
                    (x) => x.queueId === updated.queueId,
                  )
                    ? "Waiting"
                    : (res.currentlyProcessing || []).some(
                          (x) => x.queueId === updated.queueId,
                        )
                      ? "Processing"
                      : "Completed";
                  return {
                    ...updated,
                    statusGroup,
                    mainService:
                      updated.services?.[0]?.name || "Standard Car Wash",
                  };
                }
                return prev;
              });
            }
          })
          .catch((err) => console.error(err));
      }, 10000);
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    startPolling();

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        startPolling();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Real-time countdown for the open "Chi tiết công đoạn" modal. Seeded from the
  // server value (and re-synced on each 10s poll), it ticks down once per second
  // while a vehicle is actively being processed.
  useEffect(() => {
    if (!selectedVehicle) return;
    setLiveRemaining(
      Math.max(0, Number(selectedVehicle.remainingSeconds) || 0),
    );

    if (selectedVehicle.statusGroup !== "Processing") return;
    const id = setInterval(() => {
      setLiveRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [selectedVehicle]);

  // Real-time: a newly created booking enters the waiting-for-check-in list,
  // so refresh the queue immediately (10s poll above remains as fallback).
  // WashCompleted: nhắc staff chụp ảnh báo khách.
  useBookingHub(
    () => fetchQueue(),
    (payload) => {
      if (window.showToast)
        window.showToast(
          `Xe ${payload.licensePlate} đã rửa xong — đang chờ tự động chụp ảnh!`,
          "info",
        );
      fetchQueue();
    },
  );

  // Mở file picker (mobile: camera)
  const handleOpenPhotoPicker = (item) => {
    if (sendingPhotoId) return;
    photoTargetRef.current = item.queueId;
    if (photoInputRef.current) {
      photoInputRef.current.value = "";
      photoInputRef.current.click();
    }
  };

  const handlePhotosSelected = async (e) => {
    const files = Array.from(e.target.files || []);
    const queueId = photoTargetRef.current;
    if (!files.length || !queueId) return;

    // Validate phía client (backend kiểm tra lại)
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (files.length > 5) {
      if (window.showToast)
        window.showToast("Chỉ được gửi tối đa 5 ảnh!", "error");
      return;
    }
    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        if (window.showToast)
          window.showToast(
            `Ảnh "${file.name}" không đúng định dạng (JPG, PNG, WEBP)!`,
            "error",
          );
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        if (window.showToast)
          window.showToast(`Ảnh "${file.name}" vượt quá 5MB!`, "error");
        return;
      }
    }

    await sendPhotos(queueId, files);
    photoTargetRef.current = null;
  };

  // Upload + gửi mail. Dùng chung cho webcam (bước auto capture) và file picker.
  const sendPhotos = async (queueId, files) => {
    setSendingPhotoId(queueId);
    try {
      const response = await adminService.sendCompletionPhotos(queueId, files);
      if (response.success) {
        if (window.showToast)
          window.showToast("Đã gửi email kèm ảnh báo khách!", "success");
        fetchQueue();
        return true;
      }
      if (window.showToast)
        window.showToast(
          response.message || "Lỗi khi gửi ảnh báo khách!",
          "error",
        );
      return false;
    } catch (err) {
      if (window.showToast)
        window.showToast(
          err.response?.data?.message || "Lỗi kết nối khi gửi ảnh báo khách!",
          "error",
        );
      return false;
    } finally {
      setSendingPhotoId(null);
    }
  };

  // Chụp xong là gửi luôn — lỗi thì giữ modal để chụp lại.
  const handleWebcamCapture = async (file) => {
    if (!captureTarget) return;
    const ok = await sendPhotos(captureTarget.queueId, [file]);
    if (ok) setCaptureTarget(null);
  };

  // Move vehicle to next stage
  const handleAdvanceColumn = async (queueId) => {
    if (submittingIds.has(queueId)) return;
    setSubmittingIds((prev) => {
      const next = new Set(prev);
      next.add(queueId);
      return next;
    });
    try {
      const response = await adminService.advanceQueue(queueId);
      if (response.success) {
        if (window.showToast)
          window.showToast("Đã chuyển xe sang công đoạn tiếp theo!", "success");
        fetchQueue();
        if (selectedVehicle && selectedVehicle.queueId === queueId) {
          setSelectedVehicle(null);
        }
      } else {
        if (window.showToast)
          window.showToast(
            response.message || "Lỗi khi cập nhật hàng đợi!",
            "error",
          );
      }
    } catch (err) {
      console.error(err);
      const errMsg =
        err.response?.data?.message || "Lỗi kết nối khi cập nhật hàng đợi!";
      if (window.showToast) window.showToast(errMsg, "error");
    } finally {
      setSubmittingIds((prev) => {
        const next = new Set(prev);
        next.delete(queueId);
        return next;
      });
    }
  };

  // DEMO: bỏ qua thời gian chờ rửa/sấy, nhảy thẳng đến bước "Tự động chụp ảnh"
  // bằng cách lùi CheckInAt về quá khứ đủ xa cho tick nền (2s) xử lý ngay.
  const handleDemoSkipToCapture = (bookingId, plate) => {
    const performSkip = async () => {
      try {
        const res = await adminService.demoShiftBookingTime(bookingId, -2);
        if (res && res.success) {
          if (window.showToast)
            window.showToast(
              "DEMO: Đã bỏ qua thời gian chờ, xe sẽ chuyển sang bước chụp ảnh trong giây lát.",
              "success",
            );
          // Tiến trình chỉ thật sự chuyển trạng thái khi background service
          // (tick mỗi 2s) xử lý xong — refetch ngay sẽ vẫn thấy state cũ,
          // nên đợi qua ít nhất 1 tick rồi refetch lại (kèm 1 lần dự phòng).
          setTimeout(fetchQueue, 2500);
          setTimeout(fetchQueue, 5000);
        } else {
          if (window.showToast)
            window.showToast(res?.message || "Lỗi bỏ qua tiến trình (demo)", "error");
        }
      } catch (err) {
        console.error("Demo skip error", err);
        const errMsg =
          err.response?.data?.message || "Lỗi hệ thống khi bỏ qua tiến trình";
        if (window.showToast) window.showToast(errMsg, "error");
      }
    };

    const confirmMsg = `DEMO: Bỏ qua thời gian chờ rửa/sấy xe ${plate}, nhảy thẳng đến bước Tự động chụp ảnh?`;
    if (window.showConfirm) {
      window.showConfirm("Bỏ qua tiến trình", confirmMsg, performSkip);
    } else if (window.confirm(confirmMsg)) {
      performSkip();
    }
  };

  // Checkout and clean out queue
  const handleCheckoutVehicle = (queueId, plate) => {
    if (submittingIds.has(queueId)) return;
    const checkout = async () => {
      setSubmittingIds((prev) => {
        const next = new Set(prev);
        next.add(queueId);
        return next;
      });
      try {
        const response = await adminService.checkoutQueue(queueId);
        if (response.success) {
          if (window.showToast)
            window.showToast(
              `Check-out thành công cho xe ${plate}! Đã cộng +${response.pointsEarned} điểm Loyalty cho khách.`,
              "success",
            );
          setSelectedVehicle(null);
          fetchQueue();
        } else {
          if (window.showToast)
            window.showToast(response.message || "Lỗi khi checkout!", "error");
        }
      } catch (err) {
        console.error(err);
        const errMsg =
          err.response?.data?.message || "Lỗi kết nối khi checkout!";
        if (errMsg.includes("thanh toán và checkout trước đó")) {
          setSelectedVehicle(null);
          fetchQueue();
        } else {
          if (window.showToast) window.showToast(errMsg, "error");
        }
      } finally {
        setSubmittingIds((prev) => {
          const next = new Set(prev);
          next.delete(queueId);
          return next;
        });
      }
    };

    if (window.showConfirm) {
      window.showConfirm(
        "Thanh toán & Check-out",
        `Khách hàng đã hoàn thành toàn bộ dịch vụ. Xác nhận thanh toán và checkout xe ${plate}?`,
        checkout,
      );
    } else {
      if (window.confirm("Xác nhận checkout?")) checkout();
    }
  };

  const handleThanhToan = async (vehicle) => {
    if (!vehicle || !vehicle.bookingId) {
      if (window.showToast)
        window.showToast(
          "Không tìm thấy thông tin lịch đặt để thanh toán.",
          "error",
        );
      return;
    }

    setSubmittingIds((prev) => {
      const next = new Set(prev);
      next.add(vehicle.queueId);
      return next;
    });

    try {
      if (window.showToast)
        window.showToast("Đang tạo liên kết thanh toán PayOS...", "info");
      const res = await adminService.createPayment(vehicle.bookingId);
      if (res && res.success && res.payment) {
        // Free bookings (100% discount) skip the QR flow entirely.
        if (res.payment.isFree && res.payment.redirectUrl) {
          window.location.href = res.payment.redirectUrl;
        } else {
          // Open our in-app checkout page (QR + live countdown + return button),
          // passing the payment data so it renders without a second request.
          navigate(`/payment/checkout/${vehicle.bookingId}`, {
            state: { payment: res.payment },
          });
        }
      } else {
        if (window.showToast)
          window.showToast(
            res?.message || "Không thể tạo link thanh toán.",
            "error",
          );
      }
    } catch (err) {
      console.error("Lỗi khi tạo link thanh toán:", err);
      const errMsg =
        err.response?.data?.message || "Đã xảy ra lỗi khi tạo link thanh toán.";
      if (window.showToast) window.showToast(errMsg, "error");
    } finally {
      setSubmittingIds((prev) => {
        const next = new Set(prev);
        next.delete(vehicle.queueId);
        return next;
      });
    }
  };

  const handleSaveStaffNotes = (note) => {
    if (!selectedVehicle) return;
    const updatedItem = { ...selectedVehicle, staffNote: note };
    setSelectedVehicle(updatedItem);
    setQueue((prev) => ({
      ...prev,
      currentlyProcessing: prev.currentlyProcessing.map((q) =>
        q.queueId === selectedVehicle.queueId ? updatedItem : q,
      ),
    }));
  };

  const handleBlurStaffNotes = async () => {
    if (!selectedVehicle) return;
    try {
      await adminService.updateQueue(
        selectedVehicle.queueId,
        selectedVehicle.status,
        selectedVehicle.staffNote,
      );
      if (window.showToast)
        window.showToast("Đã lưu ghi chú dịch vụ!", "success");
      fetchQueue();
    } catch (err) {
      console.error(err);
    }
  };

  const getModalStages = (item) => {
    if (item?.progressTracking?.stages?.length) {
      return item.progressTracking.stages.map((stage) => ({
        stageKey: stage.stageKey,
        name: stage.displayName,
        isCompleted: stage.isCompleted,
        isActive: stage.isActive,
        completedAt: stage.completedAt || null,
        startedAt: stage.startedAt || null,
      }));
    }
    return [];
  };

  const getCurrentStageLabel = (item) => {
    return item.progressTracking?.currentStage || item.currentStage || "Đã check-in";
  };

  const waitingItems = useMemo(
    () =>
      (queue.waitingForCheckIn || []).map((item) => ({
        ...item,
        statusGroup: "Waiting",
        bookingId: Math.abs(item.bookingId || item.queueId),
        mainService: item.services?.[0]?.name || "Standard Car Wash",
      })),
    [queue.waitingForCheckIn],
  );

  const processingItems = useMemo(
    () =>
      (queue.currentlyProcessing || []).map((item) => ({
        ...item,
        statusGroup: "Processing",
        mainService: item.services?.[0]?.name || "Standard Car Wash",
      })),
    [queue.currentlyProcessing],
  );

  const completedItems = useMemo(
    () =>
      (queue.completedToday || []).map((item) => ({
        ...item,
        statusGroup: "Completed",
        mainService: item.services?.[0]?.name || "Standard Car Wash",
      })),
    [queue.completedToday],
  );

  const waitingCheckoutItems = useMemo(
    () =>
      completedItems.filter((item) => item.bookingStatus === "WaitingCheckout"),
    [completedItems],
  );
  const trueCompletedItems = useMemo(
    () =>
      completedItems.filter((item) => item.bookingStatus !== "WaitingCheckout"),
    [completedItems],
  );

  const stats = useMemo(() => {
    return {
      waitingCheckIn: waitingItems.length,
      processing: processingItems.length,
      waitingCheckout: waitingCheckoutItems.length,
      completedToday: trueCompletedItems.length,
    };
  }, [waitingItems, processingItems, waitingCheckoutItems, trueCompletedItems]);

  // Filtered sections
  const filteredWaiting = useMemo(() => {
    if (statusFilter === "WAITING_CHECKIN")
      return waitingItems;
    return [];
  }, [waitingItems, statusFilter]);

  const filteredProcessing = useMemo(() => {
    if (statusFilter === "ALL" || statusFilter === "PROCESSING")
      return processingItems;
    return [];
  }, [processingItems, statusFilter]);

  const filteredCompleted = useMemo(() => {
    if (statusFilter === "ALL") return completedItems;
    if (statusFilter === "COMPLETED_TODAY") return trueCompletedItems;
    if (statusFilter === "WAITING_CHECKOUT") return waitingCheckoutItems;
    return [];
  }, [completedItems, trueCompletedItems, waitingCheckoutItems, statusFilter]);

  const hasAnyItems =
    filteredWaiting.length > 0 ||
    filteredProcessing.length > 0 ||
    filteredCompleted.length > 0;

  // Get status class for card border
  const getStatusClass = (item) => {
    if (item.statusGroup === "Waiting") return "status-waiting";
    if (item.statusGroup === "NoShow") return "status-noshow";
    if (item.statusGroup === "Completed") return "status-completed";
    // Processing substates
    const s = item.status;
    if (s === "Cancelled") return "status-cancelled";
    return "status-processing";
  };

  // Get progress bar color
  const getProgressColor = (item) => {
    if (item.statusGroup === "Waiting") return "#f59e0b";
    if (item.statusGroup === "Completed") return "#22c55e";
    if (item.statusGroup === "NoShow") return "#ef4444";
    return "#3b82f6";
  };

  // Format remaining seconds to mm:ss
  const formatRemaining = (seconds) => {
    if (!seconds || seconds <= 0) return "—";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  // ── Compact Queue Card (Waiting / Processing / NoShow) ──
  const renderCompactCard = (item) => {
    const isNoShow = item.statusGroup === "NoShow";
    if (isNoShow) {
      return (
        <div key={item.queueId} className="queue-card-compact status-noshow">
          <div className="queue-card-header">
            <span className="queue-card-id">#BK-{item.bookingId}</span>
            <span
              className="queue-status-badge"
              style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}
            >
              NO SHOW
            </span>
          </div>
          <div className="queue-card-plate">{item.licensePlate}</div>
          <div
            className="stage-badge"
            style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}
          >
            <span
              className="stage-dot"
              style={{ background: "#ef4444" }}
            ></span>
            Khách không đến
          </div>
          <div className="mt-2 mb-1">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span
                className="small text-secondary"
                style={{ fontSize: "0.68rem" }}
              >
                Tiến độ
              </span>
              <span
                className="small fw-bold text-dark"
                style={{ fontSize: "0.68rem" }}
              >
                0%
              </span>
            </div>
            <div
              className="progress"
              style={{
                height: "4px",
                background: "#e2e8f0",
                borderRadius: "10px",
              }}
            >
              <div
                className="progress-bar"
                style={{
                  width: "0%",
                  background: "#ef4444",
                  borderRadius: "10px",
                }}
              ></div>
            </div>
          </div>
          <div className="queue-card-info-grid">
            <div className="queue-info-row">
              <span className="queue-info-label">ETA</span>
              <span className="queue-info-value font-monospace">N/A</span>
            </div>
          </div>
          <div className="queue-card-actions">
            <button
              className="queue-btn queue-btn-detail w-100"
              onClick={() => setSelectedVehicle(item)}
            >
              CHI TIẾT
            </button>
          </div>
        </div>
      );
    }

    const stageLabel = getCurrentStageLabel(item);
    const isWaiting = item.statusGroup === "Waiting";
    const isCompleted = item.statusGroup === "Completed";
    const stageColor = isWaiting ? "#f59e0b" : (isCompleted ? "#22c55e" : "#0ea5e9");
    const statusText = isWaiting ? "CHỜ" : (isCompleted ? "HOÀN TẤT" : "ĐANG XỬ LÝ");
    const statusColor = isWaiting ? "#f59e0b" : (isCompleted ? "#22c55e" : "#3b82f6");
    const statusBg = isWaiting
      ? "rgba(245,158,11,0.1)"
      : (isCompleted ? "rgba(34,197,94,0.1)" : "rgba(59,130,246,0.1)");

    return (
      <div
        key={item.queueId}
        className={`queue-card-compact ${getStatusClass(item)}`}
      >
        {/* Header row: ID + Status badge */}
        <div className="queue-card-header">
          <span className="queue-card-id">#BK-{item.bookingId}</span>
          <span
            className="queue-status-badge"
            style={{
              background: statusBg,
              color: statusColor,
            }}
          >
            {statusText}
          </span>
        </div>

        {/* License plate */}
        <div className="queue-card-plate">{item.licensePlate}</div>

        {/* Current stage badge */}
        <div
          className="stage-badge"
          style={{
            background: `${stageColor}15`,
            color: stageColor,
          }}
        >
          <span className="stage-dot" style={{ background: stageColor }}></span>
          {stageLabel}
        </div>

        {/* Progress % */}
        <div className="mt-2 mb-1">
          <div className="d-flex justify-content-between align-items-center mb-1">
            <span
              className="small text-secondary"
              style={{ fontSize: "0.68rem" }}
            >
              Tiến độ
            </span>
            <span
              className="small fw-bold text-dark"
              style={{ fontSize: "0.68rem" }}
            >
              {item.progress ?? 0}%
            </span>
          </div>
          <div
            className="progress"
            style={{
              height: "4px",
              background: "#e2e8f0",
              borderRadius: "10px",
            }}
          >
            <div
              className="progress-bar"
              style={{
                width: `${item.progress ?? 0}%`,
                background: statusColor,
                borderRadius: "10px",
              }}
            ></div>
          </div>
        </div>

        {/* Info rows */}
        <div className="queue-card-info-grid">
          <div className="queue-info-row">
            <span className="queue-info-label">ETA</span>
            <span className="queue-info-value font-monospace">
              {item.etaCompletion || "—"}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="queue-card-actions">
          <button
            className="queue-btn queue-btn-detail w-100"
            onClick={() => setSelectedVehicle(item)}
          >
            CHI TIẾT
          </button>
        </div>
      </div>
    );
  };

  // ── Completed Card (even more compact) ──
  const renderCompletedCard = (item) => {
    const isWaitingCheckout = item.bookingStatus === "WaitingCheckout";
    // Rửa xong nhưng chưa gửi ảnh => đang ở bước "Tự động chụp ảnh" (90%).
    const isCapturing = isWaitingCheckout && item.customerNotified === false;
    return (
      <div
        key={item.queueId}
        className={`queue-card-compact queue-card-completed ${isWaitingCheckout ? "status-waiting-checkout border border-warning" : "status-completed"}`}
      >
        <div className="queue-card-header">
          <span className="queue-card-id">#BK-{item.bookingId}</span>
          <span
            className="queue-status-badge"
            style={
              isWaitingCheckout
                ? { background: "rgba(245,158,11,0.1)", color: "#f59e0b" }
                : { background: "rgba(34,197,94,0.1)", color: "#22c55e" }
            }
          >
            {isWaitingCheckout ? "CHỜ THANH TOÁN" : "XONG"}
          </span>
        </div>
        <div className="queue-card-plate" style={{ fontSize: "0.95rem" }}>
          {item.licensePlate}
        </div>

        <div
          className="stage-badge"
          style={
            isWaitingCheckout
              ? {
                  background: "rgba(245,158,11,0.1)",
                  color: "#f59e0b",
                  fontSize: "0.65rem",
                  padding: "1px 6px",
                }
              : {
                  background: "rgba(34,197,94,0.1)",
                  color: "#22c55e",
                  fontSize: "0.65rem",
                  padding: "1px 6px",
                }
          }
        >
          <span
            className="stage-dot"
            style={{ background: isWaitingCheckout ? "#f59e0b" : "#22c55e" }}
          ></span>
          {isCapturing
            ? "Tự động chụp ảnh"
            : isWaitingCheckout
              ? "Chờ thanh toán"
              : "Hoàn tất"}
        </div>

        <div className="mt-2 mb-1">
          <div className="d-flex justify-content-between align-items-center mb-1">
            <span
              className="small text-secondary"
              style={{ fontSize: "0.68rem" }}
            >
              Tiến độ
            </span>
            <span
              className="small fw-bold text-dark"
              style={{ fontSize: "0.68rem" }}
            >
              {isCapturing ? "90%" : isWaitingCheckout ? "95%" : "100%"}
            </span>
          </div>
          <div
            className="progress"
            style={{
              height: "4px",
              background: "#e2e8f0",
              borderRadius: "10px",
            }}
          >
            <div
              className="progress-bar"
              style={{
                width: isCapturing ? "90%" : isWaitingCheckout ? "95%" : "100%",
                background: isWaitingCheckout ? "#f59e0b" : "#22c55e",
                borderRadius: "10px",
              }}
            ></div>
          </div>
        </div>

        <div className="queue-card-info-grid">
          <div className="queue-info-row">
            <span className="queue-info-label">Rửa xong lúc</span>
            <span
              className="queue-info-value font-monospace text-secondary"
              style={{ fontSize: "0.68rem" }}
            >
              {item.completedTime || "—"}
            </span>
          </div>
        </div>
        <div className="queue-card-actions" style={{ flexDirection: "column", gap: "4px" }}>
          {isCapturing && (
            <>
              <button
                className="queue-btn w-100"
                style={{
                  padding: "4px 10px",
                  fontSize: "0.62rem",
                  background: "#f59e0b",
                  color: "#fff",
                  border: "none",
                  fontWeight: 700,
                }}
                disabled={sendingPhotoId === item.queueId}
                onClick={() => setCaptureTarget(item)}
              >
                {sendingPhotoId === item.queueId ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-1"
                      style={{ width: "10px", height: "10px" }}
                    ></span>
                    ĐANG GỬI...
                  </>
                ) : (
                  <>
                    <i className="bi bi-camera-video-fill me-1"></i>
                    DEMO: MỞ CAMERA
                  </>
                )}
              </button>
              {/* Dự phòng khi máy demo không có webcam hoặc bị từ chối quyền */}
              <button
                className="queue-btn queue-btn-detail w-100"
                style={{ padding: "3px 10px", fontSize: "0.62rem" }}
                disabled={sendingPhotoId === item.queueId}
                onClick={() => handleOpenPhotoPicker(item)}
              >
                <i className="bi bi-upload me-1"></i>
                TẢI ẢNH LÊN
              </button>
            </>
          )}
          {isWaitingCheckout && item.customerNotified === true && (
            <span
              className="w-100 text-center"
              style={{ fontSize: "0.62rem", color: "#22c55e", fontWeight: 700 }}
            >
              <i className="bi bi-check-circle-fill me-1"></i>
              Đã báo khách
            </span>
          )}
          <button
            className="queue-btn queue-btn-detail w-100"
            style={{ padding: "3px 10px", fontSize: "0.62rem" }}
            onClick={() => setSelectedVehicle(item)}
          >
            CHI TIẾT
          </button>
        </div>
      </div>
    );
  };

  // ── Section header ──
  const renderSectionHeader = (icon, label, count, color) => (
    <div className="queue-section-header">
      <div className="queue-section-label">
        <i className={icon} style={{ color }}></i>
        <span>{label}</span>
      </div>
      <span
        className="queue-section-count"
        style={{ background: `${color}15`, color }}
      >
        {count}
      </span>
    </div>
  );

  return (
    <div className="container-fluid py-2 text-start d-flex flex-column h-100">
      {/* Hidden input chọn ảnh xe rửa xong */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        multiple
        style={{ display: "none" }}
        onChange={handlePhotosSelected}
      />

      {/* Bước "Tự động chụp ảnh": webcam laptop thay cho camera phần cứng.
          Wrapper nâng z-index để nổi trên modal "Chi tiết công đoạn" (1060),
          vì component Modal dùng chung cố định z-index 1050. */}
      <div style={{ position: "relative", zIndex: 1070 }}>
        <WebcamCaptureModal
          isOpen={!!captureTarget}
          onClose={() => setCaptureTarget(null)}
          onCapture={handleWebcamCapture}
          licensePlate={captureTarget?.licensePlate}
          busy={!!captureTarget && sendingPhotoId === captureTarget.queueId}
        />
      </div>

      {/* Page Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h2
            className="fw-black mb-1 text-dark fw-bold"
            style={{ letterSpacing: "-0.5px" }}
          >
            TIẾN ĐỘ DỊCH VỤ HÔM NAY
          </h2>
          <p className="text-secondary small mb-0">
            Theo dõi tiến độ xử lý xe trong ngày
          </p>
        </div>
      </div>

      {/* 2. SUMMARY DASHBOARD CARDS */}
      <div className="row g-3 mb-4 text-start">
        {/* Processing */}
        <div className="col-12 col-sm-6 col-lg">
          <div
            className={`app-card border-0 p-3.5 bg-white rounded-4 h-100 booking-stat-card hover-lift stat-checkedin ${statusFilter === "PROCESSING" ? "active" : ""}`}
            onClick={() =>
              setStatusFilter(
                statusFilter === "PROCESSING" ? "ALL" : "PROCESSING",
              )
            }
          >
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <h3
                  className="fw-black mb-0 font-monospace"
                  style={{ color: "#722ED1" }}
                >
                  {stats.processing}
                </h3>
                <small
                  className="text-muted d-block fw-bold mt-1"
                  style={{ fontSize: "0.62rem", letterSpacing: "0.5px" }}
                >
                  ĐANG THỰC HIỆN
                </small>
              </div>
              <div
                className="stat-icon-wrapper"
                style={{ background: "#F9F0FF", color: "#722ED1" }}
              >
                <i className="fas fa-sync-alt fa-lg"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Waiting Checkout */}
        <div className="col-12 col-sm-6 col-lg">
          <div
            className={`app-card border-0 p-3.5 bg-white rounded-4 h-100 booking-stat-card hover-lift stat-pending ${statusFilter === "WAITING_CHECKOUT" ? "active" : ""}`}
            onClick={() =>
              setStatusFilter(
                statusFilter === "WAITING_CHECKOUT"
                  ? "ALL"
                  : "WAITING_CHECKOUT",
              )
            }
            style={
              statusFilter === "WAITING_CHECKOUT"
                ? { borderLeft: "4px solid #FA8C16" }
                : {}
            }
          >
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <h3
                  className="fw-black mb-0 font-monospace"
                  style={{ color: "#FA8C16" }}
                >
                  {stats.waitingCheckout}
                </h3>
                <small
                  className="text-muted d-block fw-bold mt-1"
                  style={{ fontSize: "0.62rem", letterSpacing: "0.5px" }}
                >
                  CHỜ THANH TOÁN
                </small>
              </div>
              <div
                className="stat-icon-wrapper"
                style={{ background: "#FFF7E6", color: "#FA8C16" }}
              >
                <i className="fas fa-file-invoice-dollar fa-lg"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Completed Today */}
        <div className="col-12 col-sm-6 col-lg">
          <div
            className={`app-card border-0 p-3.5 bg-white rounded-4 h-100 booking-stat-card hover-lift stat-completed ${statusFilter === "COMPLETED_TODAY" ? "active" : ""}`}
            onClick={() =>
              setStatusFilter(
                statusFilter === "COMPLETED_TODAY" ? "ALL" : "COMPLETED_TODAY",
              )
            }
          >
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <h3
                  className="fw-black mb-0 font-monospace"
                  style={{ color: "#52C41A" }}
                >
                  {stats.completedToday}
                </h3>
                <small
                  className="text-muted d-block fw-bold mt-1"
                  style={{ fontSize: "0.62rem", letterSpacing: "0.5px" }}
                >
                  HOÀN TẤT DỊCH VỤ
                </small>
              </div>
              <div
                className="stat-icon-wrapper"
                style={{ background: "#F6FFED", color: "#52C41A" }}
              >
                <i className="fas fa-check-circle fa-lg"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-5"></div>
      ) : (
        <div className="flex-grow-1">
          {!hasAnyItems ? (
            <div className="text-center py-5 text-muted small bg-light bg-opacity-40 rounded-4 border border-dashed">
              Chưa có phương tiện nào trong danh sách hôm nay.
            </div>
          ) : (
            <div className="d-flex flex-column gap-4 mb-4">
              {/* Section: Chờ Check-in */}
              {filteredWaiting.length > 0 && (
                <div>
                  {renderSectionHeader(
                    "fas fa-clock",
                    "Chờ Check-in",
                    filteredWaiting.length,
                    "#f59e0b",
                  )}
                  <div className="queue-grid">
                    {filteredWaiting.map((item) => renderCompactCard(item))}
                  </div>
                </div>
              )}

              {/* Section: Đang xử lý */}
              {filteredProcessing.length > 0 && (
                <div>
                  {renderSectionHeader(
                    "fas fa-sync-alt",
                    "Đang xử lý",
                    filteredProcessing.length,
                    "#3b82f6",
                  )}
                  <div className="queue-grid">
                    {filteredProcessing.map((item) => renderCompactCard(item))}
                  </div>
                </div>
              )}

              {/* Section: Hoàn tất hôm nay */}
              {filteredCompleted.length > 0 && (
                <div>
                  {renderSectionHeader(
                    "fas fa-check-circle",
                    statusFilter === "WAITING_CHECKOUT"
                      ? "Chờ thanh toán"
                      : "Hoàn tất dịch vụ",
                    filteredCompleted.length,
                    statusFilter === "WAITING_CHECKOUT" ? "#FA8C16" : "#22c55e",
                  )}
                  <div className="queue-grid">
                    {filteredCompleted.map((item) => renderCompletedCard(item))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* DETAIL SERVICE WORKFLOW MODAL */}
      {selectedVehicle && (
        <div
          className="confirm-modal-backdrop show"
          style={{ display: "flex", zIndex: 1060 }}
        >
          <div
            className="confirm-modal-card animate-confirm-in"
            style={{ maxWidth: "480px", width: "100%", borderRadius: "24px" }}
          >
            <div className="confirm-modal-header border-bottom pb-2">
              <h5 className="confirm-modal-title text-dark fw-bold">
                Chi tiết công đoạn xe {selectedVehicle.licensePlate}
              </h5>
              <button
                type="button"
                className="confirm-modal-close-btn"
                onClick={() => setSelectedVehicle(null)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div
              className="confirm-modal-body text-start py-3"
              style={{ maxHeight: "420px", overflowY: "auto" }}
            >
              {selectedVehicle.statusGroup === "NoShow" ? (
                <div
                  className="bg-light p-3 rounded-4 mb-3"
                  style={{ border: "1px solid #e2e8f0" }}
                >
                  <div className="row g-3" style={{ fontSize: "0.85rem" }}>
                    <div className="col-12">
                      <span className="text-muted d-block small fw-bold">
                        MÃ ĐẶT LỊCH
                      </span>
                      <strong className="text-dark">
                        #BK-{selectedVehicle.bookingId}
                      </strong>
                    </div>
                    <div className="col-12">
                      <span className="text-muted d-block small fw-bold">
                        BIỂN SỐ XE
                      </span>
                      <strong className="text-dark font-monospace">
                        {selectedVehicle.licensePlate}
                      </strong>
                    </div>
                    <div className="col-12">
                      <span className="text-muted d-block small fw-bold">
                        TRẠNG THÁI
                      </span>
                      <div>
                        <span
                          className="badge bg-danger bg-opacity-10 text-danger fw-bold rounded-pill px-2.5 py-1"
                          style={{ fontSize: "0.75rem" }}
                        >
                          Khách không đến
                        </span>
                      </div>
                    </div>
                    <div className="col-12">
                      <span className="text-muted d-block small fw-bold">
                        THỜI GIAN QUÁ HẠN
                      </span>
                      <strong className="text-dark font-monospace">
                        {selectedVehicle.noShowTime || "—"}
                      </strong>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div
                    className="bg-light p-3 rounded-4 mb-3"
                    style={{ border: "1px solid #e2e8f0" }}
                  >
                    <div className="row g-2" style={{ fontSize: "0.78rem" }}>
                      <div className="col-6">
                        <span className="text-muted d-block small">
                          GÓI DỊCH VỤ
                        </span>
                        <strong className="text-dark">
                          {selectedVehicle.mainService}
                        </strong>
                      </div>
                      <div className="col-6 text-end">
                        <span className="text-muted d-block small">
                          ETA HOÀN THÀNH
                        </span>
                        <strong className="text-cyan">
                          {selectedVehicle.etaCompletion}
                        </strong>
                      </div>
                      <div className="col-6 mt-2">
                        <span className="text-muted d-block small">
                          TIẾN ĐỘ THỜI GIAN
                        </span>
                        <strong className="text-dark">
                          {selectedVehicle.progress}%
                        </strong>
                      </div>
                      <div className="col-6 text-end mt-2">
                        <span className="text-muted d-block small">
                          CÒN LẠI
                        </span>
                        <strong className="text-cyan">
                          {liveRemaining} giây
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <label className="form-label small fw-bold text-muted mb-0">
                      QUY TRÌNH THỰC HIỆN DỰ KIẾN
                    </label>
                    {selectedVehicle.statusGroup === "Processing" &&
                      ["CheckIn", "Washing", "Drying"].includes(
                        getModalStages(selectedVehicle).find((s) => s.isActive)
                          ?.stageKey,
                      ) && (
                        <button
                          className="btn btn-sm fw-bold"
                          style={{
                            fontSize: "0.62rem",
                            border: "1px solid #8b5cf6",
                            color: "#8b5cf6",
                            background: "transparent",
                            borderRadius: "8px",
                          }}
                          title="Demo: bỏ qua thời gian chờ, nhảy thẳng đến bước Tự động chụp ảnh"
                          onClick={() =>
                            handleDemoSkipToCapture(
                              selectedVehicle.bookingId,
                              selectedVehicle.licensePlate,
                            )
                          }
                        >
                          DEMO: BỎ QUA TIẾN TRÌNH
                        </button>
                      )}
                  </div>
                  <div className="d-flex flex-column gap-2 mb-3">
                    {getModalStages(selectedVehicle).map((step, idx) => {
                      // Bước chụp ảnh chờ người demo bấm chụp, nên thay badge
                      // "Đang chạy" bằng nút mở webcam ngay tại dòng này.
                      const isCaptureAction =
                        step.stageKey === "AutoCapture" &&
                        step.isActive &&
                        selectedVehicle.customerNotified === false;
                      const isSending =
                        sendingPhotoId === selectedVehicle.queueId;
                      return (
                        <div
                          key={idx}
                          className="d-flex align-items-center justify-content-between p-2.5 rounded-3 border bg-white"
                          style={{
                            borderColor: step.isActive
                              ? "rgba(14, 165, 233, 0.3)"
                              : "#e2e8f0",
                            background: step.isActive
                              ? "rgba(14, 165, 233, 0.02)"
                              : "none",
                          }}
                        >
                          <div className="d-flex align-items-center gap-2">
                            {step.isCompleted ? (
                              <i className="fas fa-check-circle text-success fs-6"></i>
                            ) : step.isActive ? (
                              <i className="fas fa-spinner fa-spin text-cyan fs-6"></i>
                            ) : (
                              <i className="far fa-circle text-muted fs-6"></i>
                            )}
                            <div className="d-flex flex-column">
                              <span
                                className={`small ${step.isCompleted ? "text-muted text-decoration-line-through" : "text-dark fw-bold"}`}
                                style={{ fontSize: "0.8rem" }}
                              >
                                {step.name}
                              </span>
                              {step.completedAt && (
                                <span
                                  className="text-muted"
                                  style={{ fontSize: "0.62rem" }}
                                >
                                  {new Date(
                                    step.completedAt,
                                  ).toLocaleTimeString("vi-VN", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              )}
                              {step.isActive && step.startedAt && (
                                <span
                                  className="text-cyan"
                                  style={{ fontSize: "0.62rem" }}
                                >
                                  Bắt đầu:{" "}
                                  {new Date(step.startedAt).toLocaleTimeString(
                                    "vi-VN",
                                    { hour: "2-digit", minute: "2-digit" },
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                          {step.isCompleted && (
                            <span
                              className="badge bg-success bg-opacity-10 text-success"
                              style={{ fontSize: "0.6rem" }}
                            >
                              Xong
                            </span>
                          )}
                          {isCaptureAction && (
                            <button
                              className="btn btn-sm fw-bold text-white"
                              style={{
                                fontSize: "0.62rem",
                                background: "#f59e0b",
                                border: "none",
                                whiteSpace: "nowrap",
                              }}
                              disabled={isSending}
                              onClick={() => setCaptureTarget(selectedVehicle)}
                            >
                              {isSending ? (
                                <>
                                  <span
                                    className="spinner-border spinner-border-sm me-1"
                                    style={{ width: "10px", height: "10px" }}
                                  ></span>
                                  ĐANG GỬI...
                                </>
                              ) : (
                                <>
                                  <i className="bi bi-camera-video-fill me-1"></i>
                                  MỞ CAMERA CHỤP
                                </>
                              )}
                            </button>
                          )}
                          {step.isActive && !isCaptureAction && (
                            <span
                              className="badge bg-info bg-opacity-10 text-cyan animate-pulse"
                              style={{ fontSize: "0.6rem" }}
                            >
                              Đang chạy
                            </span>
                          )}
                          {!step.isCompleted && !step.isActive && (
                            <span
                              className="badge bg-light text-muted"
                              style={{ fontSize: "0.6rem" }}
                            >
                              Chờ
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mb-0">
                    <label className="form-label small fw-bold text-muted mb-1">
                      GHI CHÚ DỊCH VỤ / TÌNH TRẠNG XE
                    </label>
                    <textarea
                      className="form-control bg-light border-0 py-2 rounded-3"
                      rows="3"
                      placeholder="Lưu ý vết xước của xe..."
                      value={selectedVehicle.staffNote || ""}
                      onChange={(e) => handleSaveStaffNotes(e.target.value)}
                      onBlur={handleBlurStaffNotes}
                    ></textarea>
                  </div>
                </>
              )}
            </div>
            <div className="confirm-modal-footer">
              {selectedVehicle.statusGroup === "NoShow" ? (
                <button
                  className="confirm-cancel-btn w-100 py-2.5 fw-bold"
                  style={{ borderRadius: "12px" }}
                  onClick={() => setSelectedVehicle(null)}
                >
                  ĐÓNG
                </button>
              ) : (
                <>
                  <button
                    className="confirm-cancel-btn w-50"
                    onClick={() => setSelectedVehicle(null)}
                  >
                    ĐÓNG
                  </button>
                  {selectedVehicle.status === "Completed" ||
                  selectedVehicle.progress >= 100 ||
                  selectedVehicle.statusGroup === "Completed" ||
                  selectedVehicle.status === "Archived" ? (
                    selectedVehicle.status === "Archived" ? (
                      <button
                        className="confirm-ok-btn w-50 fw-bold border-0 text-muted"
                        style={{ background: "#e2e8f0", cursor: "not-allowed" }}
                        disabled={true}
                      >
                        ĐÃ CHECKOUT
                      </button>
                    ) : (
                      <button
                        className="confirm-ok-btn confirm-btn-cyan w-50 fw-bold border-0 text-dark"
                        style={{ background: "var(--cyan-electric)" }}
                        disabled={submittingIds.has(selectedVehicle.queueId)}
                        onClick={() => handleThanhToan(selectedVehicle)}
                      >
                        THANH TOÁN
                      </button>
                    )
                  ) : selectedVehicle.statusGroup === "Processing" ? (
                    <button
                      className="confirm-ok-btn confirm-btn-cyan w-50 fw-bold border-0 text-muted"
                      style={{ background: "#e2e8f0", cursor: "not-allowed" }}
                      disabled={true}
                    >
                      TỰ ĐỘNG CHUYỂN TIẾP
                    </button>
                  ) : (
                    <button
                      className="confirm-ok-btn confirm-btn-cyan w-50 fw-bold border-0 text-dark"
                      style={{ background: "var(--cyan-electric)" }}
                      disabled={submittingIds.has(selectedVehicle.queueId)}
                      onClick={() =>
                        handleAdvanceColumn(selectedVehicle.queueId)
                      }
                    >
                      TIẾP TỤC VÀO LÀN RỬA
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminQueue;
