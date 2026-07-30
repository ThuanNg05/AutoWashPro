import { useState, useEffect, useCallback, useRef } from 'react';
import { adminService } from '../services/adminService';
import { useBookingHub } from './useBookingHub';

// Watermark lưu bookingId lớn nhất mà staff đã xem, để tính số booking "chưa xem".
const WATERMARK_KEY = 'staffBookingSeenWatermark';

const getWatermark = () => Number(localStorage.getItem(WATERMARK_KEY)) || 0;
const setWatermark = (v) => localStorage.setItem(WATERMARK_KEY, String(v));

/**
 * Global staff notifications (mounted once in AdminLayout):
 *  - unreadBookings: số booking mới chưa xem (reset khi staff mở tab Đặt lịch).
 *  - queueInService: số xe đã check-in thành công và đang trong hàng đợi xử lý (real-time).
 *  - popup: thông tin booking mới để hiện modal (chỉ khi staff KHÔNG ở tab Đặt lịch).
 *
 * @param {{ isOnBookings: boolean }} opts - staff có đang ở trang Quản lý đặt lịch không.
 */
export const useStaffNotifications = ({ isOnBookings }) => {
  const [unreadBookings, setUnreadBookings] = useState(0);
  const [queueInService, setQueueInService] = useState(0);
  const [popup, setPopup] = useState(null);

  const bookingsRef = useRef([]);
  const isOnBookingsRef = useRef(isOnBookings);
  useEffect(() => {
    isOnBookingsRef.current = isOnBookings;
  }, [isOnBookings]);

  // Tính lại số booking chưa xem dựa trên watermark. Nếu staff đang ở tab Đặt lịch
  // thì coi như đã xem hết và tự nâng watermark.
  const recompute = useCallback((bookings) => {
    bookingsRef.current = bookings;
    const maxId = bookings.length ? Math.max(...bookings.map((b) => b.bookingId)) : 0;
    const wm = getWatermark();

    // Lần đầu tiên (chưa có watermark): seed để không tính các booking cũ là "mới".
    if (wm === 0 && bookings.length) {
      setWatermark(maxId);
      setUnreadBookings(0);
      return;
    }
    if (isOnBookingsRef.current) {
      if (maxId > wm) setWatermark(maxId);
      setUnreadBookings(0);
      return;
    }
    setUnreadBookings(bookings.filter((b) => b.bookingId > wm).length);
  }, []);

  const markBookingsSeen = useCallback(() => {
    const bookings = bookingsRef.current;
    if (bookings.length) setWatermark(Math.max(...bookings.map((b) => b.bookingId)));
    setUnreadBookings(0);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [bRes, qRes] = await Promise.all([
        adminService.getBookings({ skipGlobalLoader: true }),
        adminService.getQueue({ skipGlobalLoader: true }),
      ]);
      if (bRes && bRes.success) recompute(bRes.bookings || []);
      // Chỉ đếm xe đã check-in thành công và đang trong hàng đợi xử lý.
      if (qRes) setQueueInService((qRes.currentlyProcessing || []).length);
    } catch (err) {
      console.error('Lỗi tải số liệu thông báo staff:', err);
    }
  }, [recompute]);

  // Khi staff mở tab Đặt lịch: coi như đã xem hết booking.
  useEffect(() => {
    if (isOnBookings) markBookingsSeen();
  }, [isOnBookings, markBookingsSeen]);

  // Real-time: booking mới -> hiện pop-up (nếu không ở tab Đặt lịch) + làm mới số liệu.
  useBookingHub((payload) => {
    if (!isOnBookingsRef.current) {
      setPopup({ bookingId: payload.bookingId, licensePlate: payload.licensePlate });
    }
    refresh();
  });

  // Poll dự phòng khi socket down (giống các trang admin khác).
  useEffect(() => {
    refresh();
    const id = setInterval(() => {
      if (!document.hidden) refresh();
    }, 30000);
    return () => clearInterval(id);
  }, [refresh]);

  return {
    unreadBookings,
    queueInService,
    popup,
    dismissPopup: () => setPopup(null),
    markBookingsSeen,
  };
};

export default useStaffNotifications;
