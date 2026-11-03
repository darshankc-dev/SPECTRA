/* SPECTRΛ — Client-Side CSRF, API Fetch, and Toast Notification Utilities */

window.Spectra = {
  getCsrfToken() {
    const meta = document.querySelector('meta[name="csrf-token"]');
    if (meta && meta.getAttribute('content')) {
      return meta.getAttribute('content');
    }
    const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : '';
  },

  async apiFetch(url, options = {}) {
    const headers = Object.assign(
      {
        'X-CSRFToken': this.getCsrfToken(),
        'Accept': 'application/json',
      },
      options.headers || {}
    );

    if (options.body && !(options.body instanceof FormData) && typeof options.body === 'object') {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, Object.assign({}, options, {
      headers,
      credentials: 'same-origin',
    }));

    let data = {};
    try {
      data = await response.json();
    } catch (_) {
      data = {};
    }

    return { ok: response.ok, status: response.status, data };
  },

  toast(message, type = 'info') {
    let container = document.getElementById('spectra-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'spectra-toast-container';
      container.className = 'spectra-toast-container';
      document.body.appendChild(container);
    }

    const item = document.createElement('div');
    item.className = 'spectra-toast';
    const colorMap = {
      success: '#22C55E',
      error: '#EF4444',
      warning: '#F59E0B',
      info: '#22DDF2',
    };
    item.style.borderColor = colorMap[type] || '#334155';
    item.textContent = message;
    container.appendChild(item);

    setTimeout(() => {
      item.style.opacity = '0';
      item.style.transition = 'opacity 180ms ease';
      setTimeout(() => item.remove(), 200);
    }, 4000);
  },

  formatBytes(bytes) {
    const n = Number(bytes || 0);
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KiB`;
    return `${(n / (1024 * 1024)).toFixed(2)} MiB`;
  },

  formatTimestamp(isoStr) {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      return d.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
    } catch (_) {
      return isoStr;
    }
  },
};
