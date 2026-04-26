/* ============================================
   UTILITIES.JS - Advanced Features
   ============================================ */

// ===== TOAST NOTIFICATION SYSTEM =====
const ToastManager = {
  container: null,

  init() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },

  show(message, title = '', type = 'info', duration = 5000) {
    this.init();

    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div class="toast-icon">${icons[type] || icons.info}</div>
      <div class="toast-content">
        ${title ? `<div class="toast-title">${title}</div>` : ''}
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;

    this.container.appendChild(toast);

    // Auto remove after duration
    if (duration > 0) {
      setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
      }, duration);
    }

    return toast;
  },

  success(message, title = 'Successo!') {
    return this.show(message, title, 'success');
  },

  error(message, title = 'Errore!') {
    return this.show(message, title, 'error');
  },

  warning(message, title = 'Attenzione!') {
    return this.show(message, title, 'warning');
  },

  info(message, title = '') {
    return this.show(message, title, 'info');
  }
};

// Make it globally available
window.Toast = ToastManager;

// ===== SMOOTH SCROLL TO SECTION =====
function smoothScrollTo(targetId) {
  const element = document.getElementById(targetId) || document.querySelector(targetId);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// Handle anchor links
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href !== '#' && href.length > 1) {
        e.preventDefault();
        smoothScrollTo(href);
      }
    });
  });
});

// ===== LOADING STATE FOR BUTTONS =====
function setButtonLoading(button, loading = true) {
  if (loading) {
    button.classList.add('btn-loading');
    button.disabled = true;
    button.dataset.originalText = button.innerHTML;
  } else {
    button.classList.remove('btn-loading');
    button.disabled = false;
    if (button.dataset.originalText) {
      button.innerHTML = button.dataset.originalText;
    }
  }
}

// ===== RIPPLE EFFECT =====
function addRippleEffect(element) {
  element.classList.add('ripple-container');

  element.addEventListener('click', function(e) {
    const ripple = document.createElement('span');
    ripple.classList.add('ripple');

    const rect = this.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';

    this.appendChild(ripple);

    setTimeout(() => ripple.remove(), 600);
  });
}

// Auto-apply to all buttons with .ripple class
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.btn:not(.no-ripple), .ripple').forEach(btn => {
    addRippleEffect(btn);
  });
});

// ===== ANDREA AI CHAT WIDGET =====
// Loaded directly via <script src="assets/js/chat-widget.js" defer data-aai-js="1">
// in each page. Replaces the legacy floating WhatsApp button and scroll-to-top.

// ===== FORM VALIDATION & LOADING =====
function validateForm(formElement) {
  let isValid = true;
  const inputs = formElement.querySelectorAll('input[required], textarea[required], select[required]');

  inputs.forEach(input => {
    input.classList.remove('error');
    const errorMsg = input.nextElementSibling;
    if (errorMsg && errorMsg.classList.contains('form-error')) {
      errorMsg.style.display = 'none';
    }

    if (!input.value.trim()) {
      input.classList.add('error');
      if (errorMsg && errorMsg.classList.contains('form-error')) {
        errorMsg.style.display = 'block';
      }
      isValid = false;
    }

    // Email validation
    if (input.type === 'email' && input.value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(input.value)) {
        input.classList.add('error');
        if (errorMsg && errorMsg.classList.contains('form-error')) {
          errorMsg.textContent = 'Email non valida';
          errorMsg.style.display = 'block';
        }
        isValid = false;
      }
    }
  });

  return isValid;
}

// ===== MODAL SYSTEM =====
const ModalManager = {
  create(content, options = {}) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'modal-content';
    modal.innerHTML = `
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
      ${content}
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Show modal
    setTimeout(() => overlay.classList.add('active'), 10);

    // Close on overlay click
    if (options.closeOnOverlay !== false) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.close(overlay);
        }
      });
    }

    // Close on ESC key
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        this.close(overlay);
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    return overlay;
  },

  close(overlay) {
    overlay.classList.remove('active');
    setTimeout(() => overlay.remove(), 300);
  }
};

window.Modal = ModalManager;

// ===== COPY TO CLIPBOARD =====
function copyToClipboard(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      Toast.success('Copiato negli appunti!');
    }).catch(() => {
      Toast.error('Errore durante la copia');
    });
  } else {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      Toast.success('Copiato negli appunti!');
    } catch (err) {
      Toast.error('Errore durante la copia');
    }
    document.body.removeChild(textarea);
  }
}

// ===== LAZY LOAD IMAGES =====
(function() {
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
          }
          if (img.dataset.srcset) {
            img.srcset = img.dataset.srcset;
            img.removeAttribute('data-srcset');
          }
          img.classList.add('loaded');
          observer.unobserve(img);
        }
      });
    }, {
      rootMargin: '50px'
    });

    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });
  }
})();

// ===== ANALYTICS EVENT TRACKING =====
function trackEvent(category, action, label = '', value = 0) {
  // Google Analytics
  if (typeof gtag !== 'undefined') {
    gtag('event', action, {
      'event_category': category,
      'event_label': label,
      'value': value
    });
  }

  // Facebook Pixel
  if (typeof fbq !== 'undefined') {
    fbq('trackCustom', action, {
      category: category,
      label: label
    });
  }

  console.log('Event tracked:', category, action, label);
}

// Auto-track CTA clicks
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('[data-track]').forEach(element => {
    element.addEventListener('click', function() {
      const data = this.dataset;
      trackEvent(
        data.trackCategory || 'CTA',
        data.trackAction || 'click',
        data.trackLabel || this.textContent.trim()
      );
    });
  });
});

// ===== EXPORT UTILITIES =====
window.AppUtils = {
  smoothScrollTo,
  setButtonLoading,
  addRippleEffect,
  validateForm,
  copyToClipboard,
  trackEvent
};

console.log('✅ Utilities.js loaded successfully');
