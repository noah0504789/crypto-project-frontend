import { escapeCss } from './utils.js';

export function bindFieldErrors(form) {
  function clearFieldErrors() {
    form.querySelectorAll('.field-error-badge').forEach((el) => el.remove());
    form.querySelectorAll('.is-invalid').forEach((el) => {
      el.classList.remove('is-invalid');
      el.removeAttribute('aria-invalid');
      el.removeAttribute('aria-describedby');
    });
  }

  function showFieldErrors(errors = []) {
    errors.forEach(({ field, message }) => {
      const control = form.querySelector(`[name="${escapeCss(field)}"]`);
      if (!control) return;

      const wrapper = control.closest('div') ?? form;
      const label = wrapper.querySelector('label');
      if (label) {
        let badge = label.querySelector('.field-error-badge');
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'field-error-badge';
          label.appendChild(badge);
        }
        badge.textContent = message;
      }

      control.classList.add('is-invalid');
      control.setAttribute('aria-invalid', 'true');
    });
  }

  function focusFirstError(errors = []) {
    const first = errors[0]?.field;
    if (first && first !== '_') form.querySelector(`[name=${escapeCss(first)}]`)?.focus();
  }

  return { clearFieldErrors, showFieldErrors, focusFirstError };
}
