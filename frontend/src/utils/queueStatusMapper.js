export const queueStatusMapper = {
  getLabel: (status) => {
    switch (status) {
      case 'Waiting':
      case 'WaitingCheckIn':
        return 'Chờ check-in';
      case 'CheckedIn':
      case 'CheckIn':
        return 'Đã check-in';
      case 'Washing':
        return 'Đang rửa xe';
      case 'Drying':
        return 'Đang sấy khô';
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

  getBadgeClass: (status) => {
    switch (status) {
      case 'Waiting':
      case 'WaitingCheckIn':
        return 'bg-warning bg-opacity-10 text-warning';
      case 'CheckedIn':
      case 'CheckIn':
      case 'Washing':
      case 'Drying':
        return 'bg-primary bg-opacity-10 text-primary';
      case 'Completed':
      case 'Archived':
      case 'Checkout':
        return 'bg-success bg-opacity-10 text-success';
      case 'Cancelled':
      case 'NoShow':
        return 'bg-danger text-white';
      default:
        return 'bg-secondary bg-opacity-10 text-muted';
    }
  },

  getIcon: (status) => {
    switch (status) {
      case 'Waiting':
      case 'WaitingCheckIn':
        return 'fa-clock';
      case 'CheckedIn':
      case 'CheckIn':
        return 'fa-qrcode';
      case 'Completed':
      case 'Archived':
      case 'Checkout':
        return 'fa-check-circle';
      default:
        return 'fa-soap';
    }
  },

  getTimelineSteps: (bookingStatus, queueStatus, currentStage, progressTracking) => {
    if (progressTracking && progressTracking.stages && progressTracking.stages.length > 0) {
      return progressTracking.stages.map((stage) => ({
        id: stage.stageKey,
        name: stage.displayName,
        isCompleted: stage.isCompleted,
        isActive: stage.isActive
      }));
    }
    return [
      { name: currentStage || 'Đã check-in', isCompleted: false, isActive: true }
    ];
  }
};
