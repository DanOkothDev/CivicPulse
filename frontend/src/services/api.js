import {
  INITIAL_CATEGORIES,
  INITIAL_AREAS,
  DEMO_USERS,
  INITIAL_REPORTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_HOTSPOTS,
} from './mockData';

const BASE_URL = '/api/v1';

// Helper to manage persistent mock database in localStorage
function getStorage(key, initialValue) {
  try {
    const item = localStorage.getItem(`civicpulse_${key}`);
    return item ? JSON.parse(item) : initialValue;
  } catch {
    return initialValue;
  }
}

function setStorage(key, value) {
  try {
    localStorage.setItem(`civicpulse_${key}`, JSON.stringify(value));
  } catch (e) {
    console.error('Storage write error', e);
  }
}

// Initialize mock tables if not set
if (!localStorage.getItem('civicpulse_initialized')) {
  setStorage('categories', INITIAL_CATEGORIES);
  setStorage('areas', INITIAL_AREAS);
  setStorage('users', DEMO_USERS);
  setStorage('reports', INITIAL_REPORTS);
  setStorage('notifications', INITIAL_NOTIFICATIONS);
  setStorage('hotspots', INITIAL_HOTSPOTS);
  setStorage('history_events', {
    9421: [
      { id: 101, status: 'reported', changed_by: 1, changer_name: 'Sarah Jenkins', note: 'Resident initial report via Mobile Intake', created_at: '2026-09-24T08:30:00Z' },
      { id: 102, status: 'verified', changed_by: 2, changer_name: 'J. Ramirez (Verifier)', note: 'Field severity confirmed. High pedestrian hazard.', created_at: '2026-09-25T10:15:00Z' },
      { id: 103, status: 'assigned', changed_by: 2, changer_name: 'J. Ramirez (Verifier)', note: 'Dispatched to Public Works asphalt crew.', created_at: '2026-09-26T14:00:00Z' },
      { id: 104, status: 'in_progress', changed_by: 3, changer_name: 'Alex Chen (Crew 4B)', note: 'Crews en route. Safety cones and barrier deployed.', created_at: '2026-10-02T11:15:00Z' },
    ],
    8902: [
      { id: 201, status: 'reported', changed_by: 1, changer_name: 'Sarah Jenkins', note: 'Burst hydrant leaking into roadway.', created_at: '2026-09-18T14:20:00Z' },
      { id: 202, status: 'verified', changed_by: 2, changer_name: 'J. Ramirez', note: 'Emergency water pressure hazard verified.', created_at: '2026-09-18T14:45:00Z' },
      { id: 203, status: 'assigned', changed_by: 2, changer_name: 'J. Ramirez', note: 'Assigned to Water Utility Rapid Unit.', created_at: '2026-09-18T15:00:00Z' },
      { id: 204, status: 'in_progress', changed_by: 3, changer_name: 'Alex Chen', note: 'Mainline pressure isolated.', created_at: '2026-09-18T16:00:00Z' },
      { id: 205, status: 'resolved', changed_by: 3, changer_name: 'Alex Chen', note: 'Hydrant flange replaced. Water pressure normal.', created_at: '2026-09-19T10:45:00Z' },
    ],
    7739: [
      { id: 301, status: 'reported', changed_by: 1, changer_name: 'Sarah Jenkins', note: 'Stormwater culvert blocked by plastic waste.', created_at: '2026-10-08T09:14:00Z' },
    ],
  });
  localStorage.setItem('civicpulse_initialized', 'true');
}

// Request helper with JWT
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('civicpulse_token');
  const headers = { ...options.headers };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

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
  } catch (error) {
    // If backend isn't reachable or 404, throw for mock fallback
    throw error;
  }
}

export const api = {
  // Authentication
  auth: {
    async login(email, password) {
      try {
        const res = await request('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        localStorage.setItem('civicpulse_token', res.token);
        localStorage.setItem('civicpulse_current_user', JSON.stringify(res.user));
        return res;
      } catch (err) {
        // Mock fallback
        console.warn('Backend login unavailable, using mock user authentication:', err.message);
        const users = getStorage('users', DEMO_USERS);
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase()) || {
          id: 99,
          name: email.split('@')[0],
          email,
          role: 'resident',
          area_id: 1,
          trustScore: 95.0,
          tier: 'Civic Member',
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=256',
        };
        const mockToken = `mock-jwt-token-${user.id}-${Date.now()}`;
        localStorage.setItem('civicpulse_token', mockToken);
        localStorage.setItem('civicpulse_current_user', JSON.stringify(user));
        return { token: mockToken, user };
      }
    },

    async register(data) {
      try {
        const res = await request('/auth/register', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        localStorage.setItem('civicpulse_token', res.token);
        localStorage.setItem('civicpulse_current_user', JSON.stringify(res.user));
        return res;
      } catch (err) {
        console.warn('Backend register unavailable, creating mock user:', err.message);
        const users = getStorage('users', DEMO_USERS);
        const newUser = {
          id: users.length + 1,
          name: data.name,
          email: data.email,
          role: 'resident',
          area_id: data.area_id || 1,
          phone: data.phone || '',
          trustScore: 92.0,
          tier: 'Tier I - New Contributor',
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=256',
          memberSince: 'Just now',
          civicXP: 100,
        };
        users.push(newUser);
        setStorage('users', users);
        const mockToken = `mock-jwt-token-${newUser.id}-${Date.now()}`;
        localStorage.setItem('civicpulse_token', mockToken);
        localStorage.setItem('civicpulse_current_user', JSON.stringify(newUser));
        return { token: mockToken, user: newUser };
      }
    },

    async getCurrentUser() {
      try {
        return await request('/auth/me');
      } catch {
        const stored = localStorage.getItem('civicpulse_current_user');
        return stored ? JSON.parse(stored) : DEMO_USERS[0];
      }
    },

    logout() {
      localStorage.removeItem('civicpulse_token');
      localStorage.removeItem('civicpulse_current_user');
    },
  },

  // Reference tables
  reference: {
    async getCategories() {
      try {
        return await request('/categories');
      } catch {
        return getStorage('categories', INITIAL_CATEGORIES);
      }
    },

    async getAreas() {
      try {
        return await request('/areas');
      } catch {
        return getStorage('areas', INITIAL_AREAS);
      }
    },
  },

  // Reports
  reports: {
    async list(params = {}) {
      try {
        const query = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== '') query.append(k, v);
        });
        return await request(`/reports?${query.toString()}`);
      } catch {
        // Mock filter
        let items = getStorage('reports', INITIAL_REPORTS);
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
          const user = JSON.parse(localStorage.getItem('civicpulse_current_user') || '{}');
          items = items.filter(r => r.created_by === user.id);
        }
        if (params.following) {
          items = items.filter(r => r.is_following);
        }
        if (params.search) {
          const s = params.search.toLowerCase();
          items = items.filter(r =>
            r.description.toLowerCase().includes(s) ||
            r.address?.toLowerCase().includes(s) ||
            r.category.name.toLowerCase().includes(s) ||
            `#rpt-${r.id}`.includes(s)
          );
        }
        return {
          items,
          page: 1,
          per_page: items.length,
          total: items.length,
        };
      }
    },

    async get(id) {
      try {
        return await request(`/reports/${id}`);
      } catch {
        const items = getStorage('reports', INITIAL_REPORTS);
        const report = items.find(r => r.id === Number(id));
        if (!report) throw new Error('Report not found');
        return report;
      }
    },

    async create(formData) {
      try {
        return await request('/reports', {
          method: 'POST',
          body: formData,
        });
      } catch (err) {
        console.warn('Real report creation failed, persisting to mock store:', err);
        const items = getStorage('reports', INITIAL_REPORTS);
        const categories = getStorage('categories', INITIAL_CATEGORIES);
        const user = JSON.parse(localStorage.getItem('civicpulse_current_user') || JSON.stringify(DEMO_USERS[0]));

        let categoryId = Number(formData.get('category_id'));
        let category = categories.find(c => c.id === categoryId) || categories[0];
        let lat = Number(formData.get('lat') || -1.2629);
        let lon = Number(formData.get('lon') || 36.8355);
        let description = formData.get('description') || 'Reported incident';
        let address = formData.get('address') || 'Community Site, Ward 4';
        let landmark = formData.get('landmark') || '';
        let photoUrl = formData.get('photo_preview') || 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=800';

        const newReport = {
          id: Math.floor(1000 + Math.random() * 9000),
          category,
          description,
          status: 'reported',
          location: { lat, lon },
          address,
          landmark,
          area_id: 1,
          photo_url: photoUrl,
          created_by: user.id,
          creator_name: user.name,
          assigned_to: null,
          assigned_name: null,
          due_date: null,
          report_count: 1,
          duplicate_of: null,
          ai_suggested_category: { category_id: category.id, confidence: 0.92 },
          is_following: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        items.unshift(newReport);
        setStorage('reports', items);

        // Add history event
        const historyEvents = getStorage('history_events', {});
        historyEvents[newReport.id] = [
          {
            id: Date.now(),
            status: 'reported',
            changed_by: user.id,
            changer_name: user.name,
            note: 'Initial resident submission via Mobile Intake',
            created_at: newReport.created_at,
          },
        ];
        setStorage('history_events', historyEvents);

        // Trigger in-app notification
        const notifications = getStorage('notifications', INITIAL_NOTIFICATIONS);
        notifications.unshift({
          id: Date.now(),
          report_id: newReport.id,
          type: 'report_created',
          badge: 'Report Filed',
          ref: `#CP-${newReport.id}`,
          title: `Report #${newReport.id} Submitted`,
          message: `Your report on "${category.name}" has been received and queued for verifier triage.`,
          read: false,
          created_at: new Date().toISOString(),
          assigned: 'Triage Desk',
          priority: 'Normal',
          estTime: '4 hours',
          group: category.name,
        });
        setStorage('notifications', notifications);

        return newReport;
      }
    },

    async updateStatus(id, { status, note }) {
      try {
        return await request(`/reports/${id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status, note }),
        });
      } catch (err) {
        console.warn('Status patch fallback:', err);
        const items = getStorage('reports', INITIAL_REPORTS);
        const report = items.find(r => r.id === Number(id));
        if (!report) throw new Error('Report not found');
        const user = JSON.parse(localStorage.getItem('civicpulse_current_user') || JSON.stringify(DEMO_USERS[1]));

        report.status = status;
        report.updated_at = new Date().toISOString();
        setStorage('reports', items);

        // Append to history
        const historyEvents = getStorage('history_events', {});
        if (!historyEvents[id]) historyEvents[id] = [];
        historyEvents[id].push({
          id: Date.now(),
          status,
          changed_by: user.id,
          changer_name: user.name,
          note: note || `Status transitioned to ${status}`,
          created_at: new Date().toISOString(),
        });
        setStorage('history_events', historyEvents);

        // Trigger notification
        const notifications = getStorage('notifications', INITIAL_NOTIFICATIONS);
        notifications.unshift({
          id: Date.now(),
          report_id: report.id,
          type: status,
          badge: `Status: ${status.replace('_', ' ').toUpperCase()}`,
          ref: `#CP-${report.id}`,
          title: `Report #${report.id} updated`,
          message: note || `Incident status has been transitioned to ${status}.`,
          read: false,
          created_at: new Date().toISOString(),
          assigned: report.assigned_name || 'Municipal Team',
          priority: 'Updated',
          estTime: 'Active',
          group: report.category.name,
        });
        setStorage('notifications', notifications);

        return report;
      }
    },

    async assign(id, { assignee_id, due_date }) {
      try {
        return await request(`/reports/${id}/assign`, {
          method: 'POST',
          body: JSON.stringify({ assignee_id, due_date }),
        });
      } catch {
        const items = getStorage('reports', INITIAL_REPORTS);
        const users = getStorage('users', DEMO_USERS);
        const report = items.find(r => r.id === Number(id));
        const assignee = users.find(u => u.id === Number(assignee_id)) || users[2];

        if (report) {
          report.status = 'assigned';
          report.assigned_to = assignee.id;
          report.assigned_name = assignee.name;
          report.due_date = due_date;
          report.updated_at = new Date().toISOString();
          setStorage('reports', items);

          const historyEvents = getStorage('history_events', {});
          if (!historyEvents[id]) historyEvents[id] = [];
          historyEvents[id].push({
            id: Date.now(),
            status: 'assigned',
            changed_by: 2,
            changer_name: 'J. Ramirez (Verifier)',
            note: `Work order assigned to ${assignee.name}. Due: ${due_date || 'Standard SLA'}`,
            created_at: new Date().toISOString(),
          });
          setStorage('history_events', historyEvents);
        }
        return report;
      }
    },

    async toggleFollow(id) {
      const items = getStorage('reports', INITIAL_REPORTS);
      const report = items.find(r => r.id === Number(id));
      if (report) {
        report.is_following = !report.is_following;
        setStorage('reports', items);
      }
      return report;
    },

    async getHistory(id) {
      try {
        return await request(`/reports/${id}/history`);
      } catch {
        const historyEvents = getStorage('history_events', {});
        return historyEvents[id] || [
          {
            id: 1,
            status: 'reported',
            changed_by: 1,
            changer_name: 'Sarah Jenkins',
            note: 'Resident report received.',
            created_at: '2026-09-24T08:30:00Z',
          },
        ];
      }
    },

    async getDuplicates(id) {
      try {
        return await request(`/reports/${id}/duplicates`);
      } catch {
        // Calculate mock suggestions based on distance and category
        const items = getStorage('reports', INITIAL_REPORTS);
        const target = items.find(r => r.id === Number(id));
        if (!target) return [];

        return items
          .filter(r => r.id !== target.id)
          .map(r => {
            const sameCat = r.category.id === target.category.id ? 0.95 : 0.2;
            const score = sameCat > 0.5 ? 0.88 : 0.35;
            return {
              report_id: r.id,
              report: r,
              score,
              reasons: {
                location: 0.91,
                category: sameCat,
                time: 0.84,
                photo: 0.76,
              },
            };
          })
          .sort((a, b) => b.score - a.score)
          .slice(0, 3);
      }
    },

    async merge(childId, parentId) {
      try {
        return await request(`/reports/${childId}/merge`, {
          method: 'POST',
          body: JSON.stringify({ parent_id: parentId }),
        });
      } catch {
        const items = getStorage('reports', INITIAL_REPORTS);
        const child = items.find(r => r.id === Number(childId));
        const parent = items.find(r => r.id === Number(parentId));
        if (child && parent) {
          child.duplicate_of = parent.id;
          parent.report_count = (parent.report_count || 1) + 1;
          setStorage('reports', items);
        }
        return parent;
      }
    },

    async unmerge(childId) {
      try {
        return await request(`/reports/${childId}/unmerge`, { method: 'POST' });
      } catch {
        const items = getStorage('reports', INITIAL_REPORTS);
        const child = items.find(r => r.id === Number(childId));
        if (child && child.duplicate_of) {
          const parent = items.find(r => r.id === child.duplicate_of);
          if (parent && parent.report_count > 1) parent.report_count -= 1;
          child.duplicate_of = null;
          setStorage('reports', items);
        }
        return child;
      }
    },
  },

  // Notifications
  notifications: {
    async list(params = {}) {
      try {
        const q = params.unread ? '?unread=true' : '';
        return await request(`/notifications${q}`);
      } catch {
        let list = getStorage('notifications', INITIAL_NOTIFICATIONS);
        if (params.unread) list = list.filter(n => !n.read);
        return list;
      }
    },

    async markRead(id) {
      try {
        return await request(`/notifications/${id}/read`, { method: 'POST' });
      } catch {
        const list = getStorage('notifications', INITIAL_NOTIFICATIONS);
        const item = list.find(n => n.id === Number(id));
        if (item) {
          item.read = true;
          setStorage('notifications', list);
        }
        return item;
      }
    },

    async markAllRead() {
      const list = getStorage('notifications', INITIAL_NOTIFICATIONS);
      list.forEach(n => { n.read = true; });
      setStorage('notifications', list);
      return list;
    },
  },

  // Analytics
  analytics: {
    async getSummary(areaId) {
      try {
        const q = areaId ? `?area_id=${areaId}` : '';
        return await request(`/analytics/summary${q}`);
      } catch {
        const reports = getStorage('reports', INITIAL_REPORTS);
        const by_status = {};
        const by_category = {};
        reports.forEach(r => {
          by_status[r.status] = (by_status[r.status] || 0) + 1;
          by_category[r.category.name] = (by_category[r.category.name] || 0) + 1;
        });

        return {
          total_reports: reports.length,
          by_status,
          by_category,
          open_by_area: [
            { area_id: 1, name: 'Ward 4 - Metro East', open: 18 },
            { area_id: 2, name: 'Ward 2 - Westlands', open: 12 },
            { area_id: 3, name: 'Ward 5 - Kilimani', open: 9 },
            { area_id: 4, name: 'Ward 1 - Central CBD', open: 24 },
          ],
          avg_days_to_resolve: 3.8,
          precision_rate: 96.4,
          first_hour_triage: 88.2,
        };
      }
    },

    async getHotspots() {
      try {
        return await request('/analytics/hotspots');
      } catch {
        return getStorage('hotspots', INITIAL_HOTSPOTS);
      }
    },
  },

  // Admin
  admin: {
    async listUsers(params = {}) {
      try {
        const q = params.role ? `?role=${params.role}` : '';
        return await request(`/users${q}`);
      } catch {
        let users = getStorage('users', DEMO_USERS);
        if (params.role) users = users.filter(u => u.role === params.role);
        return users;
      }
    },

    async updateUserRole(id, role) {
      try {
        return await request(`/users/${id}/role`, {
          method: 'PATCH',
          body: JSON.stringify({ role }),
        });
      } catch {
        const users = getStorage('users', DEMO_USERS);
        const user = users.find(u => u.id === Number(id));
        if (user) {
          user.role = role;
          setStorage('users', users);
        }
        return user;
      }
    },

    async addCategory(cat) {
      const cats = getStorage('categories', INITIAL_CATEGORIES);
      const newCat = { ...cat, id: cats.length + 1 };
      cats.push(newCat);
      setStorage('categories', cats);
      return newCat;
    },

    async addArea(area) {
      const areas = getStorage('areas', INITIAL_AREAS);
      const newArea = { ...area, id: areas.length + 1 };
      areas.push(newArea);
      setStorage('areas', areas);
      return newArea;
    },
  },
};
