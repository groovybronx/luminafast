// Main JavaScript for LuminaFast GitHub Pages

// Dark mode functionality
function toggleDarkMode() {
  const html = document.documentElement;
  const icon = document.getElementById('darkModeIcon');
  
  if (html.classList.contains('dark')) {
    html.classList.remove('dark');
    icon.classList.remove('fa-sun');
    icon.classList.add('fa-moon');
    localStorage.setItem('theme', 'light');
  } else {
    html.classList.add('dark');
    icon.classList.remove('fa-moon');
    icon.classList.add('fa-sun');
    localStorage.setItem('theme', 'dark');
  }
}

// Initialize dark mode
function initDarkMode() {
  const theme = localStorage.getItem('theme');
  const icon = document.getElementById('darkModeIcon');
  
  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
    if (icon) {
      icon.classList.remove('fa-moon');
      icon.classList.add('fa-sun');
    }
  } else {
    document.documentElement.classList.remove('dark');
    if (icon) {
      icon.classList.remove('fa-sun');
      icon.classList.add('fa-moon');
    }
  }
}

// Mobile menu toggle
function toggleMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  if (menu) {
    menu.classList.toggle('hidden');
  }
}

// Smooth scrolling for anchor links
function initSmoothScrolling() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
}

// Animate stats on scroll
function animateStats() {
  const stats = document.querySelectorAll('.stat-number');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const target = entry.target;
        const finalValue = parseInt(target.textContent);
        let currentValue = 0;
        const increment = finalValue / 50;
        const timer = setInterval(() => {
          currentValue += increment;
          if (currentValue >= finalValue) {
            currentValue = finalValue;
            clearInterval(timer);
          }
          target.textContent = Math.floor(currentValue).toLocaleString();
        }, 30);
        
        observer.unobserve(target);
      }
    });
  }, { threshold: 0.5 });
  
  stats.forEach(stat => observer.observe(stat));
}

// Copy code blocks
function initCodeCopy() {
  document.querySelectorAll('pre code').forEach(block => {
    const button = document.createElement('button');
    button.className = 'absolute top-2 right-2 bg-gray-700 text-white px-2 py-1 rounded text-xs hover:bg-gray-600';
    button.textContent = 'Copier';
    button.style.cssText = 'position: absolute; top: 0.5rem; right: 0.5rem; background: #374151; color: white; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; cursor: pointer;';
    
    const pre = block.parentElement;
    pre.style.position = 'relative';
    pre.appendChild(button);
    
    button.addEventListener('click', () => {
      navigator.clipboard.writeText(block.textContent).then(() => {
        button.textContent = 'Copié!';
        setTimeout(() => {
          button.textContent = 'Copier';
        }, 2000);
      });
    });
  });
}

// Search functionality
function initSearch() {
  const searchInput = document.getElementById('searchInput');
  const searchResults = document.getElementById('searchResults');
  
  if (!searchInput || !searchResults) return;
  
  searchInput.addEventListener('input', debounce((e) => {
    const query = e.target.value.toLowerCase();
    
    if (query.length < 2) {
      searchResults.classList.add('hidden');
      return;
    }
    
    const pages = [
      { title: 'Documentation', url: '/documentation/', description: 'Documentation technique complète' },
      { title: 'Installation', url: '/installation/', description: 'Guides d\'installation' },
      { title: 'Fonctionnalités', url: '/features/', description: 'Détail des fonctionnalités' },
      { title: 'Statistiques', url: '/stats/', description: 'Statistiques du projet' },
    ];
    
    const results = pages.filter(page => 
      page.title.toLowerCase().includes(query) || 
      page.description.toLowerCase().includes(query)
    );
    
    displaySearchResults(results);
  }, 300));
}

function displaySearchResults(results) {
  const searchResults = document.getElementById('searchResults');
  
  if (results.length === 0) {
    searchResults.innerHTML = '<div class="p-4 text-gray-500">Aucun résultat trouvé</div>';
  } else {
    searchResults.innerHTML = results.map(result => `
      <a href="${result.url}" class="block p-4 hover:bg-gray-50 border-b">
        <div class="font-medium">${result.title}</div>
        <div class="text-sm text-gray-600">${result.description}</div>
      </a>
    `).join('');
  }
  
  searchResults.classList.remove('hidden');
}

// Utility functions
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Progress bars animation
function animateProgressBars() {
  const progressBars = document.querySelectorAll('.progress-bar');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const bar = entry.target;
        const width = bar.style.width;
        bar.style.width = '0%';
        setTimeout(() => {
          bar.style.width = width;
        }, 100);
        observer.unobserve(bar);
      }
    });
  }, { threshold: 0.5 });
  
  progressBars.forEach(bar => observer.observe(bar));
}

// Table of contents
function generateTableOfContents() {
  const toc = document.getElementById('tableOfContents');
  if (!toc) return;
  
  const headings = document.querySelectorAll('h2, h3, h4');
  const tocItems = Array.from(headings).map(heading => {
    const id = heading.textContent.toLowerCase().replace(/\s+/g, '-');
    heading.id = id;
    
    return `
      <li>
        <a href="#${id}" class="block py-1 text-sm hover:text-primary">
          ${heading.textContent}
        </a>
      </li>
    `;
  }).join('');
  
  toc.innerHTML = `<ul class="space-y-1">${tocItems}</ul>`;
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  initDarkMode();
  initSmoothScrolling();
  animateStats();
  initCodeCopy();
  initSearch();
  animateProgressBars();
  generateTableOfContents();
  
  // Add scroll effect to navigation
  const nav = document.querySelector('nav');
  if (nav) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 100) {
        nav.classList.add('shadow-lg');
      } else {
        nav.classList.remove('shadow-lg');
      }
    });
  }
  
  // Close mobile menu when clicking outside
  document.addEventListener('click', (e) => {
    const mobileMenu = document.getElementById('mobileMenu');
    const menuButton = e.target.closest('button[onclick*="toggleMobileMenu"]');
    
    if (!menuButton && mobileMenu && !mobileMenu.contains(e.target)) {
      mobileMenu.classList.add('hidden');
    }
  });
  
  // Close search results when clicking outside
  document.addEventListener('click', (e) => {
    const searchResults = document.getElementById('searchResults');
    const searchInput = document.getElementById('searchInput');
    
    if (searchResults && !searchResults.contains(e.target) && e.target !== searchInput) {
      searchResults.classList.add('hidden');
    }
  });
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + K for search
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.focus();
    }
  }
  
  // Escape to close modals/menus
  if (e.key === 'Escape') {
    const mobileMenu = document.getElementById('mobileMenu');
    const searchResults = document.getElementById('searchResults');
    
    if (mobileMenu) mobileMenu.classList.add('hidden');
    if (searchResults) searchResults.classList.add('hidden');
  }
});

// Performance monitoring
if (window.performance && window.performance.mark) {
  window.performance.mark('app-start');
  
  window.addEventListener('load', () => {
    window.performance.mark('app-loaded');
    window.performance.measure('app-load-time', 'app-start', 'app-loaded');
    
    const loadTime = window.performance.getEntriesByName('app-load-time')[0];
    console.log(`App loaded in ${loadTime.duration.toFixed(2)}ms`);
  });
}
