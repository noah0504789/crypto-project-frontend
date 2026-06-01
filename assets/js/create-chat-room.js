import { GATEWAY_URL, ROUTES } from './config.js';
import { apiClient } from './auth-api.js';
import { bindFieldErrors } from './room-form.js';

const form = document.getElementById('createForm');
const submitBtn = form.querySelector('button[type="submit"]');
const titleInput = form.elements.namedItem('title');
const descriptionInput = form.elements.namedItem('description');
const categoryInput = form.elements.namedItem('category');
const { clearFieldErrors, showFieldErrors, focusFirstError } = bindFieldErrors(form);

form.addEventListener('submit', (event) => {
  event.preventDefault();
  clearFieldErrors();

  const title = titleInput.value?.trim();
  const description = descriptionInput.value?.trim();
  const category = categoryInput.value;

  submitBtn.disabled = true;
  submitBtn.textContent = '생성 중...';

  apiClient
    .post(
      `${GATEWAY_URL}/chat/room`,
      { title, description, category },
      {
        headers: { 'Content-Type': 'application/json' },
        validateStatus: (s) => s === 201,
      },
    )
    .then(() => {
      alert('✅ 방 생성 완료');
      form.reset();
      window.location.href = ROUTES.myChatRooms;
    })
    .catch((err) => {
      const errors = err.response?.data?.errors;
      if (!errors) return;
      showFieldErrors(errors);
      focusFirstError(errors);
    })
    .finally(() => {
      submitBtn.disabled = false;
      submitBtn.textContent = '생성';
    });
});
