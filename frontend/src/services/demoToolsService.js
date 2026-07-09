import api from './api';

// Demo-only service: browse/edit raw database tables from the admin UI
export const demoToolsService = {
  getTables: async () => {
    const response = await api.get('/api/admin/demo-tools/tables');
    return response.data;
  },

  getRows: async (table, { page = 1, pageSize = 20, search = '', sortBy = '', sortDir = '' } = {}) => {
    const params = { page, pageSize };
    if (search) params.search = search;
    if (sortBy) {
      params.sortBy = sortBy;
      params.sortDir = sortDir;
    }
    const response = await api.get(`/api/admin/demo-tools/tables/${table}/rows`, { params });
    return response.data;
  },

  updateRow: async (table, pk, values) => {
    const response = await api.put(`/api/admin/demo-tools/tables/${table}/rows`, { pk, values });
    return response.data;
  },

  insertRow: async (table, values) => {
    const response = await api.post(`/api/admin/demo-tools/tables/${table}/rows`, { values });
    return response.data;
  },

  deleteRow: async (table, pk) => {
    const response = await api.delete(`/api/admin/demo-tools/tables/${table}/rows`, { data: { pk } });
    return response.data;
  },

  shiftBookingTime: async (bookingId, minutes) => {
    const response = await api.post(`/api/admin/demo-tools/bookings/${bookingId}/shift-time?minutes=${minutes}`);
    return response.data;
  }
};
