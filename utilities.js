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

// ===== SCROLL TO TOP BUTTON =====
(function() {
  const scrollBtn = document.createElement('div');
  scrollBtn.className = 'scroll-to-top';
  scrollBtn.innerHTML = '↑';
  scrollBtn.setAttribute('aria-label', 'Torna su');
  document.body.appendChild(scrollBtn);

  scrollBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  window.addEventListener('scroll', () => {
    if (window.pageYOffset > 300) {
      scrollBtn.classList.add('visible');
    } else {
      scrollBtn.classList.remove('visible');
    }
  });
})();

// ===== WHATSAPP FLOATING BUTTON =====
(function() {
  const whatsappBtn = document.createElement('a');
  whatsappBtn.href = 'https://wa.me/393516248936?text=Ciao%20Andrea%2C%20vorrei%20informazioni%20sui%20tuoi%20servizi';
  whatsappBtn.target = '_blank';
  whatsappBtn.className = 'whatsapp-float';
  whatsappBtn.setAttribute('aria-label', 'Contattami su WhatsApp');
  whatsappBtn.innerHTML = `
    <span class="whatsapp-tooltip">Scrivimi su WhatsApp</span>
    <svg viewBox="0 0 32 32">
      <path d="M16 0c-8.837 0-16 7.163-16 16 0 2.825 0.737 5.607 2.137 8.048l-2.137 7.952 7.933-2.127c2.42 1.396 5.175 2.127 8.067 2.127 8.837 0 16-7.163 16-16s-7.163-16-16-16zM16 29.467c-2.482 0-4.908-0.646-7.07-1.87l-0.507-0.292-4.713 1.262 1.262-4.669-0.292-0.508c-1.207-2.100-1.847-4.507-1.847-6.924 0-7.435 6.046-13.481 13.481-13.481s13.481 6.046 13.481 13.481c0 7.436-6.046 13.481-13.481 13.481zM21.729 18.526c-0.193-0.097-1.142-0.564-1.319-0.628s-0.305-0.097-0.434 0.097c-0.129 0.193-0.499 0.628-0.611 0.757s-0.225 0.145-0.418 0.048c-0.193-0.097-0.814-0.3-1.551-0.957-0.573-0.512-0.96-1.144-1.072-1.337s-0.012-0.298 0.085-0.394c0.087-0.086 0.193-0.225 0.289-0.337s0.129-0.193 0.193-0.321c0.064-0.129 0.032-0.241-0.016-0.337s-0.434-1.045-0.595-1.431c-0.157-0.375-0.316-0.324-0.434-0.33-0.112-0.006-0.241-0.007-0.37-0.007s-0.337 0.048-0.514 0.241c-0.177 0.193-0.675 0.66-0.675 1.609s0.691 1.866 0.787 1.995c0.097 0.129 1.359 2.075 3.293 2.911 0.46 0.199 0.819 0.318 1.099 0.407 0.462 0.147 0.883 0.126 1.216 0.076 0.371-0.055 1.142-0.467 1.303-0.918s0.161-0.837 0.113-0.918c-0.048-0.080-0.177-0.129-0.37-0.225z"/>
    </svg>
  `;
  document.body.appendChild(whatsappBtn);
})();

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
