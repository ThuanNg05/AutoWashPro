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
  }
};
