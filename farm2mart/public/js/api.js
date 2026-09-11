// Farm2Mart Unified API & Client State Manager
const API_BASE = window.location.origin + '/api/v1';

const API = {
  getToken() {
    return localStorage.getItem('f2m_token');
  },

  setToken(token) {
    localStorage.setItem('f2m_token', token);
  },

  getFarmer() {
    try {
      return JSON.parse(localStorage.getItem('f2m_farmer') || 'null');
    } catch {
      return null;
    }
  },

  setFarmer(farmer) {
    localStorage.setItem('f2m_farmer', JSON.stringify(farmer));
  },

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    const token = this.getToken();
    if (token && !headers['Authorization']) {
      headers['Authorization'] = 'Bearer ' + token;
    }

    try {
      const res = await fetch(API_BASE + endpoint, {
        ...options,
        headers
      });

      if (res.status === 204) return null;

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || data.message || 'Server error (' + res.status + ')');
      }
      return data;
    } catch (err) {
      console.error('[API Error]', endpoint, err);
      throw err;
    }
  },

  // Auto-init demo session if not logged in
  async ensureFarmerSession() {
    let token = this.getToken();
    if (token) return token;

    try {
      console.log('[API] Auto-authenticating prototype farmer (+919876543210)...');
      const otpRes = await this.request('/auth/otp/request', {
        method: 'POST',
        body: JSON.stringify({ phone: '+919876543210' })
      });

      const devCode = otpRes.developmentCode || '123456';
      const verifyRes = await this.request('/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ phone: '+919876543210', code: devCode })
      });

      this.setToken(verifyRes.token);
      this.setFarmer(verifyRes.farmer);
      return verifyRes.token;
    } catch (err) {
      console.warn('[API] Could not auto-authenticate:', err.message);
      return null;
    }
  },

  async getCenters(crop, district) {
    let q = [];
    if (crop) q.push('crop=' + encodeURIComponent(crop));
    if (district) q.push('district=' + encodeURIComponent(district));
    return this.request('/centers' + (q.length ? '?' + q.join('&') : ''));
  },

  async getSlots(centerId, date) {
    const d = date || new Date().toISOString().slice(0, 10);
    return this.request('/centers/' + centerId + '/slots?date=' + d);
  },

  async getRecommendations(centerId, date) {
    const d = date || new Date().toISOString().slice(0, 10);
    return this.request('/forecast/centers/' + centerId + '/recommendations?date=' + d);
  },

  async createBooking(payload) {
    return this.request('/bookings', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async getBooking(bookingId) {
    return this.request('/bookings/' + bookingId);
  },

  async getActiveBooking() {
    return this.request('/bookings/active/current');
  },

  async cancelBooking(bookingId) {
    return this.request('/bookings/' + bookingId + '/cancel', { method: 'POST' });
  },

  async advanceProduceStage(bookingId) {
    return this.request('/produce/' + bookingId + '/advance', { method: 'POST' });
  },

  async createGrievance(payload) {
    return this.request('/grievances', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async getGrievances() {
    return this.request('/grievances');
  },

  showToast(message, type = 'success') {
    const old = document.getElementById('f2m-toast');
    if (old) old.remove();

    const toast = document.createElement('div');
    toast.id = 'f2m-toast';
    const isSuccess = type === 'success';
    toast.className = 'fixed top-24 left-1/2 -translate-x-1/2 z-[100] px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-semibold max-w-sm w-[90%] transition-all transform duration-300 ' +
      (isSuccess ? 'bg-primary text-on-primary' : 'bg-error text-on-error');

    toast.innerHTML = '<span class=\"material-symbols-outlined text-xl\">' +
      (isSuccess ? 'check_circle' : 'error') + '</span><span class=\"flex-1\">' + message + '</span>';

    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 400);
    }, 3500);
  }
};

// Global init
window.API = API;
document.addEventListener('DOMContentLoaded', () => {
  API.ensureFarmerSession();
});
