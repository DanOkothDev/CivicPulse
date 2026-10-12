import {
  INITIAL_CATEGORIES,
  INITIAL_AREAS,
  DEMO_USERS,
  INITIAL_REPORTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_HOTSPOTS,
} from './mockData';

const BASE_URL = '/api/v1';

// Helper to check if an error is a network connection failure (backend offline)
function isNetworkError(err) {
  return (
    err instanceof TypeError ||
    err.code === 'backend_offline' ||
    err.status === 503 ||
    (typeof err.message === 'string' && err.message.includes('Failed to fetch'))
  );
}

// Request helper with JWT authorization
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('civicpulse_token');
  const headers = { ...options.headers };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Do not set Content-Type if sending FormData (browser automatically sets boundary)
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  let res;
  try {
    res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (netErr) {
    throw {
      status: 503,
      code: 'backend_offline',
      message: 'Cannot connect to CivicPulse API server (localhost:5000).',
      details: { original: netErr.message },
    };
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw {
      status: res.status,
      code: errData.error?.code || 'server_error',
      message: errData.error?.message || `HTTP ${res.status}`,
      details: errData.error?.details || {},
    };
  }

  if (res.status === 204) return null;
  return await res.json();
}

export const api = {
  // 1. Authentication Endpoints
  auth: {
    async login(email, password) {
      try {
        const res = await request('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        if (res?.token) {
          localStorage.setItem('civicpulse_token', res.token);
          localStorage.setItem('civicpulse_current_user', JSON.stringify(res.user));
        }
        return res;
      } catch (err) {
        if (isNetworkError(err)) {
          const user = DEMO_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase()) || {
            id: Date.now(),
            name: email.split('@')[0],
            email,
            role: 'resident',
            area_id: 1,
            avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=256',
          };
          const mockToken = 'demo-jwt-token-' + Date.now();
          localStorage.setItem('civicpulse_token', mockToken);
          localStorage.setItem('civicpulse_current_user', JSON.stringify(user));
          return { token: mockToken, user };
        }
        throw err;
      }
    },

    async register(data) {
      try {
        const res = await request('/auth/register', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        if (res?.token) {
          localStorage.setItem('civicpulse_token', res.token);
          localStorage.setItem('civicpulse_current_user', JSON.stringify(res.user));
        }
        return res;
      } catch (err) {
        if (isNetworkError(err)) {
          const newUser = {
            id: Date.now(),
            name: data.name,
            email: data.email,
            phone: data.phone || '',
            role: 'resident',
            area_id: data.area_id || 1,
            avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=256',
          };
          DEMO_USERS.unshift(newUser);
          const mockToken = 'demo-jwt-token-' + Date.now();
          localStorage.setItem('civicpulse_token', mockToken);
          localStorage.setItem('civicpulse_current_user', JSON.stringify(newUser));
          return { token: mockToken, user: newUser };
        }
        throw err;
      }
    },

    async getCurrentUser() {
      return await request('/auth/me');
    },

    logout() {
      localStorage.removeItem('civicpulse_token');
      localStorage.removeItem('civicpulse_current_user');
    },
  },

  // 2. Reference Tables (Categories & Areas)
  reference: {
    async getCategories() {
      try {
        return await request('/categories');
      } catch (err) {
        if (isNetworkError(err)) {
          return INITIAL_CATEGORIES;
        }
        throw err;
      }
    },

    async getAreas() {
      try {
        return await request('/areas');
      } catch (err) {
        if (isNetworkError(err)) {
          return INITIAL_AREAS;
        }
        throw err;
      }
    },
  },

  // 3. Reports & Operational Workflow
  reports: {
    async list(params = {}) {
      try {
        const query = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== '') {
            query.append(k, v);
          }
        });
        const q = query.toString() ? `?${query.toString()}` : '';
        return await request(`/reports${q}`);
      } catch (err) {
        if (isNetworkError(err)) {
          // Fallback during offline development
          let items = INITIAL_REPORTS;
          if (params.category_id) {
            items = items.filter(r => r.category.id === Number(params.category_id));
          }
          if (params.status && params.status !== 'all') {
            items = items.filter(r => r.status === params.status);
          }
          if (params.area_id) {
            items = items.filter(r => r.area_id === Number(params.area_id));
          }
          if (params.mine) {
            items = items.filter(r => r.created_by === 1 || r.creator_name === 'Faith Wanjiku' || r.creator_name === 'Sarah Jenkins');
          }
          if (params.following) {
            items = items.filter(r => r.is_following);
          }
          if (params.search) {
            const s = params.search.toLowerCase();
            items = items.filter(r =>
              r.description.toLowerCase().includes(s) ||
              r.category?.name?.toLowerCase().includes(s) ||
              `#rpt-${r.id}`.includes(s) ||
              `#inc-${r.id}`.includes(s)
            );
          }
          return {
            items,
            page: 1,
            per_page: items.length,
            total: items.length,
          };
        }
        throw err;
      }
    },

    async get(id) {
      try {
        return await request(`/reports/${id}`);
      } catch (err) {
        if (isNetworkError(err)) {
          const found = INITIAL_REPORTS.find(r => r.id === Number(id));
          if (found) return found;
        }
        throw err;
      }
    },

    async create(formData) {
      try {
        return await request('/reports', {
          method: 'POST',
          body: formData,
        });
      } catch (err) {
        if (isNetworkError(err)) {
          const categoryId = Number(formData.get('category_id')) || 1;
          const lat = parseFloat(formData.get('lat')) || -1.2921;
          const lon = parseFloat(formData.get('lon')) || 36.8219;
          const desc = formData.get('description') || '';
          const photoFile = formData.get('photo');
          const photoUrl =
            photoFile && typeof photoFile !== 'string'
              ? URL.createObjectURL(photoFile)
              : 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=800';

          const catObj = INITIAL_CATEGORIES.find((c) => c.id === categoryId) || {
            id: categoryId,
            name: 'Pothole / Roadway',
            icon: 'pothole',
          };

          const newId = Math.max(...INITIAL_REPORTS.map((r) => r.id), 100) + 1;
          const newReport = {
            id: newId,
            category: catObj,
            description: desc,
            status: 'reported',
            location: { lat, lon },
            address: `Pinned near GPS ${lat.toFixed(4)}, ${lon.toFixed(4)}`,
            area_id: 1,
            photo_url: photoUrl,
            report_count: 1,
            duplicate_of: null,
            ai_suggested_category: null,
            is_following: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          INITIAL_REPORTS.unshift(newReport);
          return newReport;
        }
        throw err;
      }
    },

    async updateStatus(id, { status, note }) {
      try {
        return await request(`/reports/${id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status, note }),
        });
      } catch (err) {
        if (isNetworkError(err)) {
          const found = INITIAL_REPORTS.find(r => r.id === Number(id));
          if (found) {
            found.status = status;
          }
          return found;
        }
        throw err;
      }
    },

    async assign(id, { assignee_id, due_date }) {
      try {
        return await request(`/reports/${id}/assign`, {
          method: 'POST',
          body: JSON.stringify({
            assignee_id: Number(assignee_id),
            due_date: due_date || undefined,
          }),
        });
      } catch (err) {
        if (isNetworkError(err)) {
          const found = INITIAL_REPORTS.find(r => r.id === Number(id));
          if (found) {
            found.status = 'assigned';
            found.assigned_to = Number(assignee_id);
            found.due_date = due_date || null;
          }
          return found;
        }
        throw err;
      }
    },

    async follow(id) {
      return await request(`/reports/${id}/follow`, {
        method: 'POST',
      });
    },

    async unfollow(id) {
      return await request(`/reports/${id}/follow`, {
        method: 'DELETE',
      });
    },

    async toggleFollow(id, currentFollowing) {
      if (currentFollowing) {
        await this.unfollow(id);
        return false;
      } else {
        await this.follow(id);
        return true;
      }
    },

    async getHistory(id) {
      try {
        return await request(`/reports/${id}/history`);
      } catch (err) {
        if (isNetworkError(err)) {
          return [
            {
              id: 1,
              report_id: Number(id),
              status: 'reported',
              changed_by: 1,
              note: 'Initial resident intake submission',
              created_at: new Date(Date.now() - 3600000).toISOString(),
            },
          ];
        }
        throw err;
      }
    },

    async getDuplicates(id) {
      try {
        const suggestions = await request(`/reports/${id}/duplicates`);
        if (Array.isArray(suggestions)) {
          // Enrich suggestions with the actual report details for rich card preview
          const enriched = await Promise.all(
            suggestions.map(async (s) => {
              if (s.report) return s;
              try {
                const rep = await request(`/reports/${s.report_id}`);
                return { ...s, report: rep };
              } catch {
                return s;
              }
            })
          );
          return enriched;
        }
        return [];
      } catch (err) {
        if (isNetworkError(err)) {
          // Offline mock suggestions
          const target = INITIAL_REPORTS.find(r => r.id === Number(id));
          return INITIAL_REPORTS
            .filter(r => r.id !== Number(id))
            .slice(0, 3)
            .map(r => ({
              report_id: r.id,
              report: r,
              score: 0.88,
              reasons: {
                location: 0.92,
                category: 1.0,
                time: 0.85,
                photo: 0.74,
              },
            }));
        }
        throw err;
      }
    },

    async merge(childId, parentId) {
      return await request(`/reports/${childId}/merge`, {
        method: 'POST',
        body: JSON.stringify({ parent_id: Number(parentId) }),
      });
    },

    async unmerge(childId) {
      return await request(`/reports/${childId}/unmerge`, {
        method: 'POST',
      });
    },
  },

  // 4. Notifications
  notifications: {
    async list(params = {}) {
      try {
        const query = new URLSearchParams();
        if (params.unread) query.append('unread', 'true');
        if (params.page) query.append('page', params.page);
        if (params.per_page) query.append('per_page', params.per_page);
        const q = query.toString() ? `?${query.toString()}` : '';
        return await request(`/notifications${q}`);
      } catch (err) {
        if (isNetworkError(err)) {
          return INITIAL_NOTIFICATIONS;
        }
        throw err;
      }
    },

    async getUnreadCount() {
      try {
        return await request('/notifications/unread-count');
      } catch (err) {
        if (isNetworkError(err)) {
          return { count: INITIAL_NOTIFICATIONS.filter(n => !n.read).length };
        }
        throw err;
      }
    },

    async markRead(id) {
      return await request(`/notifications/${id}/read`, {
        method: 'POST',
      });
    },

    async markAllRead() {
      return await request('/notifications/read-all', {
        method: 'POST',
      });
    },
  },

  // 5. Analytics & DBSCAN Hotspots
  analytics: {
    async getSummary(areaId) {
      try {
        const q = areaId ? `?area_id=${areaId}` : '';
        return await request(`/analytics/summary${q}`);
      } catch (err) {
        if (isNetworkError(err)) {
          return {
            total_reports: INITIAL_REPORTS.length,
            open_reports: INITIAL_REPORTS.filter(r => r.status !== 'resolved' && r.status !== 'rejected').length,
            resolved_reports: INITIAL_REPORTS.filter(r => r.status === 'resolved').length,
            hotspot_count: INITIAL_HOTSPOTS.length,
            by_status: {
              reported: 1,
              verified: 2,
              assigned: 2,
              in_progress: 3,
              resolved: 14,
            },
            by_category: {
              Pothole: 6,
              'Water Leak': 4,
              Drainage: 3,
              Streetlight: 3,
              Garbage: 2,
            },
            open_by_area: [
              { area_id: 1, area: 'Ward 4 - Eastleigh North', open: 5 },
              { area_id: 2, area: 'Ward 2 - Westlands', open: 3 },
            ],
            avg_days_to_resolve: 3.4,
          };
        }
        throw err;
      }
    },

    async getHotspots() {
      try {
        return await request('/analytics/hotspots');
      } catch (err) {
        if (isNetworkError(err)) {
          return INITIAL_HOTSPOTS;
        }
        throw err;
      }
    },

    async recomputeHotspots(params = {}) {
      return await request('/analytics/hotspots/recompute', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },

    async getTrends(days = 30) {
      try {
        return await request(`/analytics/trends?days=${days}`);
      } catch (err) {
        if (isNetworkError(err)) {
          return {
            days,
            daily_reports: Array.from({ length: 14 }, (_, i) => ({
              date: new Date(Date.now() - (13 - i) * 86400000).toISOString().split('T')[0],
              count: Math.floor(Math.random() * 5) + 1,
            })),
          };
        }
        throw err;
      }
    },

    async getCategories(areaId) {
      const q = areaId ? `?area_id=${areaId}` : '';
      return await request(`/analytics/categories${q}`);
    },

    async getStatuses(areaId) {
      const q = areaId ? `?area_id=${areaId}` : '';
      return await request(`/analytics/statuses${q}`);
    },
  },

  // 6. Administrative Management
  admin: {
    async listUsers(params = {}) {
      try {
        const query = new URLSearchParams();
        if (params.role) query.append('role', params.role);
        if (params.page) query.append('page', params.page);
        const q = query.toString() ? `?${query.toString()}` : '';
        return await request(`/users${q}`);
      } catch (err) {
        if (isNetworkError(err)) {
          let users = DEMO_USERS;
          if (params.role) users = users.filter(u => u.role === params.role);
          return users;
        }
        throw err;
      }
    },

    async updateUserRole(id, role) {
      // Note: As specified in the API Guide, PATCH /api/v1/users/{id}/role is not registered in the running Flask app.
      // Staff roles are provisioned using the backend CLI: flask create-user.
      const u = DEMO_USERS.find((user) => user.id === id);
      if (u) u.role = role;
      return { id, role, message: 'Role provisioned via backend CLI' };
    },

    async addCategory(data) {
      try {
        return await request('/categories', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      } catch (err) {
        if (isNetworkError(err)) {
          const newCat = {
            id: Date.now(),
            name: data.name,
            department: data.department || 'Public Infrastructure',
            icon: data.icon || 'facility',
          };
          INITIAL_CATEGORIES.push(newCat);
          return newCat;
        }
        throw err;
      }
    },

    async addArea(data) {
      try {
        return await request('/areas', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      } catch (err) {
        if (isNetworkError(err)) {
          const newArea = {
            id: Date.now(),
            name: data.name,
            population: data.population || '75,000',
            openIssues: 0,
          };
          INITIAL_AREAS.push(newArea);
          return newArea;
        }
        throw err;
      }
    },
  },

  // 7. System Health Check
  health: {
    async check() {
      return await request('/health');
    },
  },
};
