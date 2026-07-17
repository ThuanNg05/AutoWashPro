import { useCallback, useEffect, useRef, useState } from "react";
import Modal from "../Modal";

// Bước "Tự động chụp ảnh" của quy trình rửa xe. Camera phần cứng chưa có nên
// demo lấy hình từ webcam laptop; chụp xong là tự gửi mail kèm ảnh cho khách.
// Lưu ý: getUserMedia chỉ chạy trên localhost hoặc HTTPS.
export const WebcamCaptureModal = ({
  isOpen,
  onClose,
  onCapture,
  licensePlate,
  busy = false,
}) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null); // { url, file }

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;

    let cancelled = false;
    setError("");
    setPreview(null);

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 } },
          audio: false,
        });
        // Modal đã đóng trong lúc chờ cấp quyền — tắt luôn kẻo đèn webcam sáng mãi.
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) {
        if (cancelled) return;
        if (err.name === "NotAllowedError")
          setError("Bạn đã từ chối quyền camera. Hãy cấp quyền trong trình duyệt rồi thử lại.");
        else if (err.name === "NotFoundError")
          setError("Không tìm thấy webcam trên máy này.");
        else setError("Không mở được camera: " + (err.message || err.name));
      }
    })();

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [isOpen, stopStream]);

  // Thu hồi object URL của preview cũ để không rò bộ nhớ.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview.url);
    };
  }, [preview]);

  const handleClose = () => {
    if (busy) return;
    stopStream();
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
    onClose();
  };

  const handleShoot = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("Chụp ảnh thất bại, vui lòng thử lại!");
          return;
        }
        const file = new File([blob], "wash-capture-1.jpg", { type: "image/jpeg" });
        setPreview({ url: URL.createObjectURL(blob), file });
        stopStream(); // Đã có ảnh, tắt camera ngay.
      },
      "image/jpeg",
      0.9,
    );
  };

  const handleRetake = () => {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
    // Effect ở trên chỉ chạy theo isOpen nên phải tự mở lại stream.
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 } }, audio: false })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch((err) => setError("Không mở lại được camera: " + (err.message || err.name)));
  };

  const frameStyle = {
    width: "100%",
    aspectRatio: "4 / 3",
    objectFit: "cover",
    borderRadius: "12px",
    background: "#0f172a",
    display: "block",
  };

  const footer = preview ? (
    <div className="d-flex gap-2 w-100">
      <button
        className="btn btn-outline-secondary flex-fill fw-bold"
        style={{ fontSize: "0.8rem" }}
        disabled={busy}
        onClick={handleRetake}
      >
        <i className="bi bi-arrow-counterclockwise me-1"></i>
        CHỤP LẠI
      </button>
      <button
        className="btn flex-fill fw-bold text-white"
        style={{ fontSize: "0.8rem", background: "#f59e0b", border: "none" }}
        disabled={busy}
        onClick={() => onCapture(preview.file)}
      >
        {busy ? (
          <>
            <span
              className="spinner-border spinner-border-sm me-1"
              style={{ width: "12px", height: "12px" }}
            ></span>
            ĐANG GỬI MAIL...
          </>
        ) : (
          <>
            <i className="bi bi-send-fill me-1"></i>
            GỬI CHO KHÁCH
          </>
        )}
      </button>
    </div>
  ) : (
    <button
      className="btn w-100 fw-bold text-white"
      style={{ fontSize: "0.85rem", background: "#f59e0b", border: "none" }}
      disabled={!!error}
      onClick={handleShoot}
    >
      <i className="bi bi-camera-fill me-1"></i>
      CHỤP
    </button>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Tự động chụp ảnh — ${licensePlate || ""}`}
      maxWidth="560px"
      footer={footer}
    >
      {error ? (
        <div className="alert alert-warning mb-0" style={{ fontSize: "0.82rem" }}>
          <i className="bi bi-exclamation-triangle-fill me-1"></i>
          {error}
          <div className="mt-1 text-secondary" style={{ fontSize: "0.75rem" }}>
            Bạn có thể đóng cửa sổ này và dùng nút "TẢI ẢNH LÊN" để chọn ảnh có sẵn.
          </div>
        </div>
      ) : (
        <>
          <p className="text-secondary mb-2" style={{ fontSize: "0.78rem" }}>
            {preview
              ? "Kiểm tra ảnh rồi gửi — hệ thống sẽ tự gửi mail kèm ảnh cho khách."
              : "Đưa xe vào khung hình rồi bấm CHỤP."}
          </p>
          {preview ? (
            <img src={preview.url} alt="Ảnh xe vừa chụp" style={frameStyle} />
          ) : (
            <video ref={videoRef} autoPlay playsInline muted style={frameStyle} />
          )}
        </>
      )}
    </Modal>
  );
};

export default WebcamCaptureModal;
