/**
 * main.js
 * Comportamiento compartido por todas las páginas: menú móvil, año en el footer, etc.
 */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.querySelector('.navbar__menu-toggle');
    const menu = document.querySelector('.mobile-menu');
    const closeBtn = document.querySelector('.mobile-menu__close');

    if (toggle && menu) {
      toggle.addEventListener('click', () => {
        menu.classList.add('is-open');
        menu.querySelector('a')?.focus();
        document.body.style.overflow = 'hidden';
      });
    }

    function cerrarMenu() {
      menu?.classList.remove('is-open');
      document.body.style.overflow = '';
    }

    closeBtn?.addEventListener('click', cerrarMenu);
    menu?.querySelectorAll('a').forEach((a) => a.addEventListener('click', cerrarMenu));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') cerrarMenu();
    });

    document.querySelectorAll('[data-current-year]').forEach((el) => {
      el.textContent = new Date().getFullYear();
    });
  });
})();
