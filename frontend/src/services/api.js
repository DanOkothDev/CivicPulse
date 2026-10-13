const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');

async function request(endpoint, options = {}) {
  const headers = new Headers(options.headers);
  const token = localStorage.getItem('civicpulse_token');

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData) && options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response;
  try {
    response = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
  } catch (cause) {
    const error = new Error(
      `Cannot connect to the CivicPulse API at ${BASE_URL}. Check that the backend is running.`
    );
    error.code = 'backend_offline';
    error.cause = cause;
    throw error;
  }

  if (response.status === 204) return null;

  let data;
  try {
    data = await response.json();
  } catch (cause) {
    if (response.ok) {
      const error = new Error(`The API returned an invalid JSON response (${response.status}).`);
      error.status = response.status;
      error.cause = cause;
      throw error;
    }
    data = null;
  }

  if (!response.ok) {
    const error = new Error(data?.error?.message || `API request failed (${response.status}).`);
    error.status = response.status;
    error.code = data?.error?.code || 'server_error';
    error.details = data?.error?.details || {};
    throw error;
  }

  return data;
}

function queryString(params) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, String(value));
    }
  });
  const value = query.toString();
  return value ? `?${value}` : '';
}

export const api = {
  auth: {
    async login(email, password) {
      const response = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (response?.token) {
        localStorage.setItem('civicpulse_token', response.token);
      }
      return response;
    },

    async register(data) {
      const response = await request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (response?.token) {
        localStorage.setItem('civicpulse_token', response.token);
      }
      return response;
    },

    getCurrentUser() {
      return request('/auth/me');
    },

    logout() {
      localStorage.removeItem('civicpulse_token');
      localStorage.removeItem('civicpulse_current_user');
    },
  },

  reference: {
    getCategories() {
      return request('/categories');
    },

    getAreas() {
      return request('/areas');
    },
  },

  reports: {
    list(params = {}) {
      return request(`/reports${queryString(params)}`);
    },

    get(id) {
      return request(`/reports/${id}`);
    },

    create(formData) {
      return request('/reports', {
        method: 'POST',
        body: formData,
      });
    },

    updateStatus(id, { status, note }) {
      return request(`/reports/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, note }),
      });
    },

    assign(id, { assignee_id, due_date }) {
      return request(`/reports/${id}/assign`, {
        method: 'POST',
        body: JSON.stringify({ assignee_id, due_date }),
      });
    },

    follow(id) {
      return request(`/reports/${id}/follow`, { method: 'POST' });
    },

    unfollow(id) {
      return request(`/reports/${id}/follow`, { method: 'DELETE' });
    },

    async toggleFollow(id, currentFollowing) {
      if (currentFollowing) {
        await this.unfollow(id);
        return false;
      }
      await this.follow(id);
      return true;
    },

    getHistory(id) {
      return request(`/reports/${id}/history`);
    },

    async getDuplicates(id) {
      const suggestions = await request(`/reports/${id}/duplicates`);
      return Promise.all(
        suggestions.map(async (suggestion) => {
          if (suggestion.report) return suggestion;
          const report = await request(`/reports/${suggestion.report_id}`);
          return { ...suggestion, report };
        })
      );
    },

    merge(childId, parentId) {
      return request(`/reports/${childId}/merge`, {
        method: 'POST',
        body: JSON.stringify({ parent_id: Number(parentId) }),
      });
    },

    unmerge(childId) {
      return request(`/reports/${childId}/unmerge`, { method: 'POST' });
    },
  },

  notifications: {
    list(params = {}) {
      return request(`/notifications${queryString(params)}`);
    },

    getUnreadCount() {
      return request('/notifications/unread-count');
    },

    markRead(id) {
      return request(`/notifications/${id}/read`, { method: 'POST' });
    },

    markAllRead() {
      return request('/notifications/read-all', { method: 'POST' });
    },
  },

  analytics: {
    getSummary(areaId) {
      return request(`/analytics/summary${queryString({ area_id: areaId })}`);
    },

    getHotspots() {
      return request('/analytics/hotspots');
    },

    recomputeHotspots(params = {}) {
      return request('/analytics/hotspots/recompute', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },

    getTrends(days = 30) {
      return request(`/analytics/trends${queryString({ days })}`);
    },

    getCategories(areaId) {
      return request(`/analytics/categories${queryString({ area_id: areaId })}`);
    },

    getStatuses(areaId) {
      return request(`/analytics/statuses${queryString({ area_id: areaId })}`);
    },
  },

  admin: {
    listUsers(params = {}) {
      return request(`/users${queryString(params)}`);
    },

    updateUserRole(id, role) {
      return request(`/users/${id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
    },

    addCategory(data) {
      return request('/categories', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    addArea(data) {
      return request('/areas', {
        method: 'POST',
        body: JSON.stringify({ name: data.name }),
      });
    },
  },

  health: {
    check() {
      return request('/health');
    },
  },
};
