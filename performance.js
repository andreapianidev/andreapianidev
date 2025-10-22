/* ============================================
   PERFORMANCE OPTIMIZATION
   ============================================ */

// ===== PRECONNECT TO EXTERNAL RESOURCES =====
(function() {
  const resources = [
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com',
    'https://www.google-analytics.com',
    'https://www.googletagmanager.com'
  ];

  resources.forEach(url => {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = url;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });
})();

// ===== LAZY LOAD IMAGES =====
if ('IntersectionObserver' in window) {
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;

        // Load src
        if (img.dataset.src) {
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
        }

        // Load srcset
        if (img.dataset.srcset) {
          img.srcset = img.dataset.srcset;
          img.removeAttribute('data-srcset');
        }

        // Add loaded class for fade-in effect
        img.classList.add('loaded');
        img.style.opacity = '0';
        img.style.transition = 'opacity 0.3s';
        setTimeout(() => img.style.opacity = '1', 10);

        observer.unobserve(img);
      }
    });
  }, {
    rootMargin: '50px 0px',
    threshold: 0.01
  });

  // Observe all images with data-src
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('img[data-src], img[data-srcset]').forEach(img => {
      imageObserver.observe(img);
    });
  });
}

// ===== DEFER NON-CRITICAL CSS =====
function loadCSS(href) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.media = 'print';
  link.onload = function() {
    this.media = 'all';
  };
  document.head.appendChild(link);
}

// ===== RESOURCE HINTS =====
function addResourceHint(rel, href, as) {
  const link = document.createElement('link');
  link.rel = rel;
  link.href = href;
  if (as) link.as = as;
  document.head.appendChild(link);
}

// ===== FONT LOADING OPTIMIZATION =====
if ('fonts' in document) {
  // Load critical fonts
  const criticalFonts = [
    new FontFace('Jost', 'url(https://fonts.gstatic.com/s/jost/v14/92zPtBhPNqw79Ij1E865zBUv7myjJTVFNI8un_HAgQ.woff2)', {
      weight: '400',
      style: 'normal',
      display: 'swap'
    }),
    new FontFace('Jost', 'url(https://fonts.gstatic.com/s/jost/v14/92zPtBhPNqw79Ij1E865zBUv7mwRJTVFNI8un_HAgQ.woff2)', {
      weight: '600',
      style: 'normal',
      display: 'swap'
    })
  ];

  Promise.all(criticalFonts.map(font => font.load())).then(fonts => {
    fonts.forEach(font => document.fonts.add(font));
  });
}

// ===== REMOVE UNUSED CSS (Critical CSS Strategy) =====
// This would require a build process, but we can hint the browser
document.addEventListener('DOMContentLoaded', () => {
  // Remove loading class
  document.body.classList.remove('loading');
});

// ===== MEASURE WEB VITALS =====
function measureWebVitals() {
  // First Contentful Paint (FCP)
  const paintEntries = performance.getEntriesByType('paint');
  const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
  if (fcp) {
    console.log('FCP:', fcp.startTime.toFixed(2), 'ms');
  }

  // Largest Contentful Paint (LCP) - needs web-vitals library or manual observation
  if ('PerformanceObserver' in window) {
    try {
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        console.log('LCP:', lastEntry.renderTime || lastEntry.loadTime, 'ms');
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch(e) {
      // LCP not supported
    }
  }

  // First Input Delay (FID)
  if ('PerformanceObserver' in window) {
    try {
      const fidObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach(entry => {
          console.log('FID:', entry.processingStart - entry.startTime, 'ms');
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch(e) {
      // FID not supported
    }
  }

  // Cumulative Layout Shift (CLS)
  let clsScore = 0;
  if ('PerformanceObserver' in window) {
    try {
      const clsObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (!entry.hadRecentInput) {
            clsScore += entry.value;
          }
        }
        console.log('CLS:', clsScore.toFixed(4));
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch(e) {
      // CLS not supported
    }
  }

  // Time to Interactive (TTI) approximation
  window.addEventListener('load', () => {
    setTimeout(() => {
      const tti = performance.now();
      console.log('Approx TTI:', tti.toFixed(2), 'ms');
    }, 0);
  });
}

// Run measurements in development
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  measureWebVitals();
}

// ===== SERVICE WORKER REGISTRATION (PWA) =====
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Only register if sw.js exists
    fetch('/sw.js', { method: 'HEAD' })
      .then(response => {
        if (response.ok) {
          navigator.serviceWorker.register('/sw.js')
            .then(registration => {
              console.log('✅ Service Worker registered:', registration.scope);
            })
            .catch(error => {
              console.log('❌ Service Worker registration failed:', error);
            });
        }
      })
      .catch(() => {
        // Service worker file not found, skip registration
      });
  });
}

// ===== REDUCE MAIN THREAD WORK =====
// Defer non-critical scripts
function deferScript(src) {
  const script = document.createElement('script');
  script.src = src;
  script.defer = true;
  document.body.appendChild(script);
}

// ===== PREFETCH LIKELY NAVIGATION =====
function prefetchPage(url) {
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = url;
  document.head.appendChild(link);
}

// Prefetch likely next pages on hover
document.addEventListener('DOMContentLoaded', () => {
  const navLinks = document.querySelectorAll('a[href^="/"], a[href^="./"]');
  navLinks.forEach(link => {
    let timeout;
    link.addEventListener('mouseenter', function() {
      timeout = setTimeout(() => {
        const href = this.getAttribute('href');
        if (href && href.endsWith('.html')) {
          prefetchPage(href);
        }
      }, 200);
    });
    link.addEventListener('mouseleave', () => {
      clearTimeout(timeout);
    });
  });
});

// ===== ADAPTIVE LOADING (based on network speed) =====
if ('connection' in navigator) {
  const connection = navigator.connection;
  const effectiveType = connection.effectiveType;

  // Adjust features based on connection
  if (effectiveType === 'slow-2g' || effectiveType === '2g') {
    console.log('Slow connection detected, reducing quality');
    // Disable animations on slow connections
    document.documentElement.classList.add('reduce-motion');
  }

  // Monitor connection changes
  connection.addEventListener('change', () => {
    console.log('Connection changed:', connection.effectiveType);
  });
}

// ===== REDUCE ANIMATIONS ON LOW-END DEVICES =====
if ('deviceMemory' in navigator) {
  const memory = navigator.deviceMemory; // in GB
  if (memory < 4) {
    console.log('Low-end device detected, reducing animations');
    document.documentElement.classList.add('reduce-motion');
  }
}

// ===== CRITICAL CSS INLINE (already done in HTML) =====
// This should be done at build time

// ===== COMPRESSION HINTS =====
// Tell server we accept modern compression
const supportsWebP = () => {
  const canvas = document.createElement('canvas');
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
};

if (supportsWebP()) {
  document.documentElement.classList.add('webp');
}

// ===== PERFORMANCE MONITORING =====
window.addEventListener('load', () => {
  // Send performance data to analytics after page load
  setTimeout(() => {
    const perfData = performance.getEntriesByType('navigation')[0];
    if (perfData) {
      const metrics = {
        dns: (perfData.domainLookupEnd - perfData.domainLookupStart).toFixed(0),
        tcp: (perfData.connectEnd - perfData.connectStart).toFixed(0),
        ttfb: (perfData.responseStart - perfData.requestStart).toFixed(0),
        download: (perfData.responseEnd - perfData.responseStart).toFixed(0),
        dom: (perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart).toFixed(0),
        load: (perfData.loadEventEnd - perfData.loadEventStart).toFixed(0),
        total: (perfData.loadEventEnd - perfData.fetchStart).toFixed(0)
      };

      console.table(metrics);

      // Send to analytics if available
      if (window.AppUtils && window.AppUtils.trackEvent) {
        window.AppUtils.trackEvent('Performance', 'PageLoad', 'Total', parseInt(metrics.total));
      }
    }
  }, 0);
});

// ===== EXPORT =====
window.PerformanceUtils = {
  loadCSS,
  addResourceHint,
  prefetchPage,
  deferScript,
  measureWebVitals
};

console.log('✅ Performance optimizations loaded');
