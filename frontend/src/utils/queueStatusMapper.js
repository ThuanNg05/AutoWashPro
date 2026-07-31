export const queueStatusMapper = {
  getLabel: (itemOrStatus) => {
    if (!itemOrStatus) return 'Chờ check-in';
    if (typeof itemOrStatus === 'object') {
      if (itemOrStatus.progressTracking?.currentStage) {
        return itemOrStatus.progressTracking.currentStage;
      }
      if (itemOrStatus.bookingStatus === 'WaitingCheckout' || itemOrStatus.currentStage === 'WaitingCheckout') {
        return 'Chờ thanh toán';
      }
      if (itemOrStatus.bookingStatus === 'Completed' || itemOrStatus.status === 'Archived') {
        return 'Hoàn tất';
      }
    }
    const status = typeof itemOrStatus === 'string' ? itemOrStatus : itemOrStatus.status;
    switch (status) {
      case 'Waiting':
      case 'WaitingCheckIn':
        return 'Chờ check-in';
      case 'CheckedIn':
      case 'CheckIn':
        return 'Đã check-in';
      case 'Washing':
        return 'Đang rửa xe';
      case 'WaitingCheckout':
        return 'Chờ thanh toán';
      case 'Completed':
      case 'Archived':
      case 'Checkout':
        return 'Hoàn tất';
      case 'Cancelled':
        return 'Đã hủy';
      case 'NoShow':
        return 'Khách không đến';
      default:
        return status || 'Chờ check-in';
    }
  },

  getBadgeClass: (itemOrStatus) => {
    const statusStr = typeof itemOrStatus === 'object' ? itemOrStatus.currentStage || itemOrStatus.bookingStatus || itemOrStatus.status : itemOrStatus;
    switch (statusStr) {
      case 'Waiting':
      case 'WaitingCheckIn':
      case 'CheckIn':
        return 'bg-warning bg-opacity-10 text-warning';
      case 'Washing':
      case 'AddonProcessing':
      case 'AutoCapture':
        return 'bg-primary bg-opacity-10 text-primary';
      case 'AutoSendMail':
      case 'WaitingCheckout':
        return 'bg-warning bg-opacity-10 text-warning fw-bold';
      case 'Completed':
      case 'Archived':
      case 'Checkout':
      case 'Hoàn tất':
        return 'bg-success bg-opacity-10 text-success';
      case 'Cancelled':
      case 'NoShow':
      case 'Đã hủy':
      case 'Khách không đến':
        return 'bg-danger text-white';
      default:
        return 'bg-secondary bg-opacity-10 text-muted';
    }
  },

  getIcon: (itemOrStatus) => {
    const statusStr = typeof itemOrStatus === 'object' ? itemOrStatus.currentStage || itemOrStatus.bookingStatus || itemOrStatus.status : itemOrStatus;
    switch (statusStr) {
      case 'Waiting':
      case 'WaitingCheckIn':
      case 'CheckIn':
        return 'fa-clock';
      case 'Washing':
      case 'AddonProcessing':
        return 'fa-soap';
      case 'AutoCapture':
        return 'fa-camera';
      case 'AutoSendMail':
        return 'fa-envelope';
      case 'WaitingCheckout':
        return 'fa-file-invoice-dollar';
      case 'Completed':
      case 'Archived':
      case 'Checkout':
      case 'Hoàn tất':
        return 'fa-check-circle';
      default:
        return 'fa-car';
    }
  },

  getTimelineSteps: (booking) => {
    if (!booking) return [];

    // Derive strictly from progressTracking.stages if available
    if (booking.progressTracking?.stages && booking.progressTracking.stages.length > 0) {
      return booking.progressTracking.stages.map((s) => ({
        name: s.displayName || s.stageKey,
        isCompleted: s.isCompleted,
        isActive: s.isActive
      }));
    }

    // Default fallback based on BookingTask structure
    const defaultSteps = [
      { key: 'CheckIn', name: 'Đã check-in' },
      { key: 'Washing', name: 'Đang rửa' },
      { key: 'AutoCapture', name: 'Tự động chụp ảnh' },
      { key: 'WaitingCheckout', name: 'Chờ thanh toán' },
      { key: 'Completed', name: 'Hoàn tất' }
    ];

    const currentStage = booking.currentStage || booking.bookingStatus || '';
    let activeIdx = -1;
    if (booking.bookingStatus === 'Completed' || booking.status === 'Archived') {
      activeIdx = 4;
    } else if (booking.bookingStatus === 'WaitingCheckout' || currentStage === 'WaitingCheckout') {
      activeIdx = 3;
    } else if (currentStage === 'AutoCapture') {
      activeIdx = 2;
    } else if (currentStage === 'Washing') {
      activeIdx = 1;
    } else if (currentStage === 'CheckIn' || booking.status === 'CheckedIn') {
      activeIdx = 0;
    }

    return defaultSteps.map((step, idx) => ({
      name: step.name,
      isCompleted: activeIdx !== -1 && idx < activeIdx,
      isActive: activeIdx !== -1 && idx === activeIdx
    }));
  }
};
