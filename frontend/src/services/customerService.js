import api from './api';

export const customerService = {
  updateProfile: async (fullName, phone) => {
    const response = await api.post('/api/Customer/UpdateProfile', {
      FullName: fullName,
      Phone: phone
    });
    return response.data;
  },

  sendEmailOtp: async (email) => {
    const response = await api.post('/api/Customer/SendEmailOtp', {
      Email: email
    });
    return response.data;
  },

  verifyEmailAndChangePassword: async (email, otpCode, newPassword) => {
    const response = await api.post('/api/Customer/VerifyEmailAndChangePassword', {
      Email: email,
      OtpCode: otpCode,
      NewPassword: newPassword
    });
    return response.data;
  },

  getVehicles: async (config = {}) => {
    const response = await api.get('/api/Vehicle/GetVehicles', config);
    return response.data;
  },

  sendVehicleOtp: async (licensePlate, brand, model, vehicleClass) => {
    const response = await api.post('/api/vehicle/send-otp', {
      LicensePlate: licensePlate,
      Brand: brand,
      Model: model,
      VehicleClass: vehicleClass
    });
    return response.data;
  },

  verifyVehicleOtpAndSave: async (licensePlate, brand, model, vehicleClass, otpCode) => {
    const response = await api.post('/api/vehicle/verify-otp', {
      LicensePlate: licensePlate,
      Brand: brand,
      Model: model,
      VehicleClass: vehicleClass,
      OtpCode: otpCode
    });
    return response.data;
  },

  editVehicle: async (vehicleId, brand, model, vehicleClass) => {
    const response = await api.put(`/api/vehicle/${vehicleId}`, {
      Brand: brand,
      Model: model,
      VehicleClass: vehicleClass
    });
    return response.data;
  },

  deleteVehicle: async (vehicleId) => {
    const response = await api.delete(`/api/vehicle/${vehicleId}`);
    return response.data;
  },

  getServices: async () => {
    const response = await api.get('/api/Booking/GetServices');
    return response.data;
  },

  createBooking: async (bookingData) => {
    const response = await api.post('/api/Booking/CreateBooking', bookingData);
    return response.data;
  },

  getBookingDetail: async (id, config = {}) => {
    const response = await api.get(`/api/Booking/GetBookingDetail/${id}`, config);
    return response.data;
  },

  cancelBooking: async (id, reason) => {
    const response = await api.post(`/api/Booking/CancelBooking/${id}`, {
      Reason: reason
    });
    return response.data;
  },

 

  createReview: async (bookingId, rating, comment) => {
    const response = await api.post('/api/reviews', {
      bookingId,
      rating,
      comment
    });
    return response.data;
  },

  getCustomerReviews: async () => {
    const response = await api.get('/api/reviews/customer');
    return response.data;
  },

  getPendingReviews: async (config = {}) => {
    const response = await api.get('/api/reviews/pending', config);
    return response.data;
  },

  getBookingConfig: async () => {
    const response = await api.get('/api/Booking/GetBookingConfig');
    return response.data;
  },

  getOccupiedSlots: async (date, config = {}) => {
    const response = await api.get(`/api/Booking/GetOccupiedSlots?date=${date}`, config);
    return response.data;
  },

  getEarliestAvailableDate: async (startDate, windowDays) => {
    const response = await api.get(`/api/Booking/GetEarliestAvailableDate?startDate=${startDate}&windowDays=${windowDays}`);
    return response.data;
  },

  getWashHistory: async (config = {}) => {
    const response = await api.get('/api/Booking/GetWashHistory', config);
    return response.data;
  },

  getMyTransactions: async (config = {}) => {
    const response = await api.get('/api/payment/history/me', config);
    return response.data;
  },

  // Current payment status for a booking. The backend reconciles against PayOS
  // on read, so this doubles as the checkout page's "has it been paid?" poll.
  getPaymentStatus: async (bookingId, config = {}) => {
    const response = await api.get(`/api/payment/${bookingId}`, config);
    return response.data;
  },

  getActiveBooking: async (config = {}) => {
    const response = await api.get('/api/Booking/GetActiveBooking', config);
    return response.data;
  },

  getVouchers: async () => {
    const response = await api.get('/api/Customer/GetVouchers');
    return response.data;
  },

  getNotifications: async (config = {}) => {
    const response = await api.get('/api/Customer/GetNotifications', config);
    return response.data;
  },

  markNotificationAsRead: async (id) => {
    const response = await api.post('/api/Customer/MarkNotificationRead', {
      Id: id
    });
    return response.data;
  },

  getRewards: async () => {
    const response = await api.get('/api/Customer/GetRewards');
    return response.data;
  },

  getLoyaltyStatus: async () => {
    const response = await api.get('/api/Customer/GetLoyaltyStatus');
    return response.data;
  },

  redeemReward: async (rewardId) => {
    const response = await api.post('/api/Customer/RedeemReward', {
      RewardId: rewardId
    });
    return response.data;
  },

  // Ownership Transfer APIs
  checkLicensePlate: async (plate) => {
    const response = await api.get(`/api/ownership-transfer/check-plate?licensePlate=${encodeURIComponent(plate)}`);
    return response.data;
  },

  submitTransferRequest: async (formData, config = {}) => {
    const response = await api.post('/api/ownership-transfers', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      ...config
    });
    return response.data;
  },

  getMyTransferRequests: async (config = {}) => {
    const response = await api.get('/api/ownership-transfers/my-requests', config);
    return response.data;
  },

  cancelTransferRequest: async (id) => {
    const response = await api.post(`/api/ownership-transfers/${id}/cancel`);
    return response.data;
  },

  uploadAdditionalDocuments: async (id, formData, config = {}) => {
    const response = await api.post(`/api/ownership-transfers/${id}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      ...config
    });
    return response.data;
  },

  getOwnershipTransferDetail: async (id) => {
    const response = await api.get(`/api/admin/ownership-transfers/${id}`);
    return response.data;
  },

  getRewardsCatalog: async (category) => {
    const params = {};
    if (category) params.category = category;
    const response = await api.get('/api/Customer/GetRewardsCatalog', { params });
    return response.data;
  },

  getMyRewards: async (status, type) => {
    const params = {};
    if (status) params.status = status;
    if (type) params.type = type;
    const response = await api.get('/api/Customer/GetMyRewards', { params });
    return response.data;
  },

  getRewardHistory: async () => {
    const response = await api.get('/api/Customer/GetMyRewards');
    return response.data;
  }
};



