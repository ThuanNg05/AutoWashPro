import api from './api';

export const adminService = {
  getDashboardStats: async (filters = {}, config = {}) => {
    const params = {};
    if (filters.fromDate) params.fromDate = filters.fromDate;
    if (filters.toDate) params.toDate = filters.toDate;
    if (filters.groupBy) params.groupBy = filters.groupBy;
    const response = await api.get('/api/Admin/DashboardStats', { params, ...config });
    return response.data;
  },

  getLoyaltyConfig: async () => {
    const response = await api.get('/api/Admin/GetLoyaltyConfig');
    return response.data;
  },

  saveLoyaltyConfig: async (config) => {
    const response = await api.post('/api/Admin/SaveLoyaltyConfig', config);
    return response.data;
  },

  tierReview: async () => {
    const response = await api.get('/api/Admin/TierReview');
    return response.data;
  },

  runTierReview: async () => {
    const response = await api.post('/api/Admin/RunTierReview');
    return response.data;
  },

  getQueue: async (config = {}) => {
    const response = await api.get('/api/AdminQueue/GetQueue', config);
    return response.data;
  },

  advanceQueue: async (id) => {
    const response = await api.post(`/api/AdminQueue/AdvanceQueue?id=${id}`);
    return response.data;
  },

  updateQueue: async (id, status, staffNote) => {
    const response = await api.post(`/api/AdminQueue/UpdateQueue?id=${id}`, {
      Status: status,
      StaffNote: staffNote
    });
    return response.data;
  },

  checkoutQueue: async (id) => {
    const response = await api.post(`/api/AdminQueue/CheckoutQueue?id=${id}`);
    return response.data;
  },

  // Gửi ảnh xe rửa xong cho khách qua email
  sendCompletionPhotos: async (id, files) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('photos', file));
    const response = await api.post(`/api/AdminQueue/SendCompletionPhotos?id=${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  cancelQueue: async (id) => {
    const response = await api.post(`/api/AdminQueue/CancelQueue?id=${id}`);
    return response.data;
  },

  // DEMO: mô phỏng sự cố hệ thống rửa xe -> dừng tiến trình, hủy lịch (không thu phí), gửi email
  simulateSystemError: async (queueId) => {
    const response = await api.post(`/api/AdminQueue/SimulateSystemError?id=${queueId}`);
    return response.data;
  },

  // Ngữ cảnh cho trang staff đặt lại lịch hộ khách
  getRebookContext: async (customerId) => {
    const response = await api.get('/api/admin/bookings/rebook-context', { params: { customerId } });
    return response.data;
  },

  // Staff đặt lịch hộ một khách hàng cụ thể
  createBookingForCustomer: async (payload) => {
    const response = await api.post('/api/admin/bookings/create-for-customer', payload);
    return response.data;
  },

  addWalkIn: async (licensePlate, customerName) => {
    const response = await api.post('/api/AdminQueue/AddWalkIn', {
      LicensePlate: licensePlate,
      CustomerName: customerName
    });
    return response.data;
  },

  getServices: async () => {
    const response = await api.get('/api/Admin/GetServices');
    return response.data;
  },

  saveService: async (service) => {
    const response = await api.post('/api/Admin/SaveService', service);
    return response.data;
  },

  toggleService: async (id) => {
    const response = await api.post(`/api/Admin/ToggleService?id=${id}`);
    return response.data;
  },

  deleteService: async (id) => {
    const response = await api.post(`/api/Admin/DeleteService?id=${id}`);
    return response.data;
  },

  getCustomers: async (search) => {
    const response = await api.get('/api/Admin/GetCustomers', { params: { search } });
    return response.data;
  },

  getCustomerDetail: async (id) => {
    const response = await api.get(`/api/Admin/GetCustomerDetail?id=${id}`);
    return response.data;
  },

  adjustCustomerPoints: async (customerId, pointsChange, reason) => {
    const response = await api.post('/api/Admin/AdjustCustomerPoints', {
      CustomerId: customerId,
      PointsChange: pointsChange,
      Reason: reason
    });
    return response.data;
  },

  getAvailableVouchers: async () => {
    const response = await api.get('/api/Admin/GetAvailableVouchers');
    return response.data;
  },

  assignVoucher: async (customerId, rewardId) => {
    const response = await api.post('/api/Admin/AssignVoucher', {
      CustomerId: customerId,
      RewardId: rewardId
    });
    return response.data;
  },

  getBookings: async (config = {}) => {
    const response = await api.get('/api/admin/bookings', config);
    return response.data;
  },

  getBookingDetail: async (id) => {
    const response = await api.get(`/api/admin/bookings/${id}`);
    return response.data;
  },

  confirmBooking: async (id) => {
    const response = await api.put(`/api/admin/bookings/${id}/confirm`);
    return response.data;
  },    

 cancelBooking: async (id, reason) => {
  console.log("Cancel Booking", {
    id,
    reason
  });

  const response = await api.put(
    `/api/admin/bookings/${id}/cancel`,
    JSON.stringify({
      reason: reason
    }),
    {
      headers: {
        "Content-Type": "application/json"
      }
    }
  );

  return response.data;
},

  checkinBooking: async (id) => {
    const response = await api.put(`/api/admin/bookings/${id}/checkin`);
    return response.data;
  },

  demoShiftBookingTime: async (id, minutes) => {
    const response = await api.post(`/api/admin/demo-tools/bookings/${id}/shift-time`, null, {
      params: { minutes }
    });
    return response.data;
  },

  demoForceCheckIn: async (id) => {
    const response = await api.post(`/api/admin/demo-tools/bookings/${id}/force-checkin`);
    return response.data;
  },

  rescheduleBooking: async (id, scheduledAt, reason) => {
    const response = await api.put(`/api/admin/bookings/${id}/reschedule`, {
      ScheduledAt: scheduledAt,
      Reason: reason
    });
    return response.data;
  },

  getAdminReviews: async () => {
    const response = await api.get('/api/reviews/admin');
    return response.data;
  },

  createPayment: async (bookingId) => {
    const response = await api.post('/api/payment/create', { BookingId: bookingId });
    return response.data;
  },

  getTransactions: async (filters = {}) => {
    const params = {};
    if (filters.status != null && filters.status !== '') params.status = filters.status;
    if (filters.method != null && filters.method !== '') params.method = filters.method;
    if (filters.fromDate) params.fromDate = filters.fromDate;
    if (filters.toDate) params.toDate = filters.toDate;
    const response = await api.get('/api/payment/history', { params });
    return response.data;
  },

  // Revenue statistics with discounts / vouchers / free washes broken out (issue #51)
  getRevenueStats: async (filters = {}) => {
    const params = {};
    if (filters.fromDate) params.fromDate = filters.fromDate;
    if (filters.toDate) params.toDate = filters.toDate;
    const response = await api.get('/api/payment/revenue-stats', { params });
    return response.data;
  },

  // Voucher & Reward Management APIs
  getAdminRewards: async (filters = {}) => {
    const params = {};
    if (filters.search) params.search = filters.search;
    if (filters.type) params.type = filters.type;
    if (filters.status) params.status = filters.status;
    const response = await api.get('/api/Admin/GetAdminRewards', { params });
    return response.data;
  },

  createReward: async (rewardData) => {
    const response = await api.post('/api/Admin/CreateReward', rewardData);
    return response.data;
  },

  updateReward: async (id, rewardData) => {
    const response = await api.post(`/api/Admin/UpdateReward?id=${id}`, rewardData);
    return response.data;
  },

  toggleRewardStatus: async (id) => {
    const response = await api.post(`/api/Admin/ToggleRewardStatus?id=${id}`);
    return response.data;
  },

  getRewardRedemptions: async (filters = {}) => {
    const params = {};
    if (filters.search) params.search = filters.search;
    if (filters.status) params.status = filters.status;
    if (filters.type) params.type = filters.type;
    const response = await api.get('/api/Admin/GetRewardRedemptions', { params });
    return response.data;
  },

  confirmGift: async (voucherCode, staffNotes) => {
    const response = await api.post('/api/Admin/ClaimGift', {
      VoucherCode: voucherCode,
      StaffNotes: staffNotes
    });
    return response.data;
  },

  getRewardStats: async () => {
    const response = await api.get('/api/Admin/GetRewardStats');
    return response.data;
  }
};
