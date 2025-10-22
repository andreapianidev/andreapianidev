/* ============================================
   DARK MODE MANAGER
   ============================================ */

const DarkModeManager = {
  storageKey: 'darkMode',
  toggleBtn: null,

  init() {
    // Check saved preference or system preference
    const savedMode = localStorage.getItem(this.storageKey);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedMode === 'enabled' || (!savedMode && prefersDark)) {
      this.enable(false);
    }

    // Create toggle button
    this.createToggle();

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem(this.storageKey)) {
        if (e.matches) {
          this.enable(false);
        } else {
          this.disable(false);
        }
      }
    });
  },

  createToggle() {
    // Find navbar
    const navbar = document.querySelector('.navbar-nav');
    if (!navbar) return;

    // Create toggle container
    const container = document.createElement('li');
    container.className = 'nav-item';
    container.style.display = 'flex';
    container.style.alignItems = 'center';

    // Create toggle button
    this.toggleBtn = document.createElement('div');
    this.toggleBtn.className = 'dark-mode-toggle';
    this.toggleBtn.setAttribute('role', 'button');
    this.toggleBtn.setAttribute('aria-label', 'Toggle dark mode');
    this.toggleBtn.setAttribute('tabindex', '0');

    this.toggleBtn.addEventListener('click', () => this.toggle());
    this.toggleBtn.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.toggle();
      }
    });

    container.appendChild(this.toggleBtn);
    navbar.appendChild(container);
  },

  enable(save = true) {
    document.body.classList.add('dark-mode');
    if (save) {
      localStorage.setItem(this.storageKey, 'enabled');
      this.showNotification('Modalità scura attivata');
    }
  },

  disable(save = true) {
    document.body.classList.remove('dark-mode');
    if (save) {
      localStorage.setItem(this.storageKey, 'disabled');
      this.showNotification('Modalità chiara attivata');
    }
  },

  toggle() {
    if (document.body.classList.contains('dark-mode')) {
      this.disable();
    } else {
      this.enable();
    }
  },

  showNotification(message) {
    if (window.Toast) {
      Toast.info(message);
    }
  }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => DarkModeManager.init());
} else {
  DarkModeManager.init();
}

// Export for programmatic control
window.DarkMode = DarkModeManager;

console.log('✅ Dark Mode loaded successfully');
