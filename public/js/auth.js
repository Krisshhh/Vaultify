// Authentication utility for frontend security
class AuthManager {
  static getToken() {
    return sessionStorage.getItem('token');
  }

  static getUserRole() {
    return sessionStorage.getItem('userRole');
  }

  static isAuthenticated() {
    const token = this.getToken();
    if (!token) return false;
    
    try {
      // Basic token validation (check if it's not expired)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp > currentTime;
    } catch (error) {
      // Invalid token format
      this.clearAuth();
      return false;
    }
  }

  static clearAuth() {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('userRole');
  }

  static requireAuth(requiredRole = null) {
    if (!this.isAuthenticated()) {
      this.showAlert('Authentication required. Please login to continue.');
      window.location.href = '/index.html';
      return false;
    }

    if (requiredRole) {
      const userRole = this.getUserRole();
      if (userRole !== requiredRole) {
        this.showAlert(`Access denied. ${requiredRole} privileges required.`);
        window.location.href = '/index.html';
        return false;
      }
    }

    return true;
  }

  static requireAdminAuth() {
    return this.requireAuth('admin');
  }

  static requireUserAuth() {
    if (!this.isAuthenticated()) {
      this.showAlert('Authentication required. Please login to continue.');
      window.location.href = '/index.html';
      return false;
    }
    return true;
  }

  static showAlert(message) {
    // Use a custom alert or notification system
    alert(message);
  }

  static async validateTokenWithServer() {
    const token = this.getToken();
    if (!token) return false;

    try {
      const response = await fetch('/api/auth/validate-token', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        this.clearAuth();
        return false;
      }

      const data = await response.json();
      // Update user role if provided
      if (data.role) {
        sessionStorage.setItem('userRole', data.role);
      }
      return true;
    } catch (error) {
      this.clearAuth();
      return false;
    }
  }

  static setupAuthHeaders() {
    const token = this.getToken();
    if (!token) return {};
    
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }
}

// Disable console in production-like environment
if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
  // Override console methods to prevent data leaks
  const noop = () => {};
  console.log = noop;
  console.warn = noop;
  console.error = noop;
  console.info = noop;
  console.debug = noop;
  console.trace = noop;
  console.dir = noop;
  console.dirxml = noop;
  console.group = noop;
  console.groupEnd = noop;
  console.time = noop;
  console.timeEnd = noop;
  console.assert = noop;
  console.profile = noop;
  console.profileEnd = noop;
  console.count = noop;
  console.exception = noop;
  console.table = noop;
  console.clear = noop;
}

// Prevent right-click context menu and dev tools shortcuts
document.addEventListener('contextmenu', (e) => {
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    e.preventDefault();
  }
});

document.addEventListener('keydown', (e) => {
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    // Prevent F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
    if (e.keyCode === 123 || 
        (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74)) ||
        (e.ctrlKey && e.keyCode === 85)) {
      e.preventDefault();
      return false;
    }
  }
});

// Export for use in other scripts
window.AuthManager = AuthManager;
