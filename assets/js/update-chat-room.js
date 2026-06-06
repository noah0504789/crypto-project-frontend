import { GATEWAY_URL, ROUTES } from './config.js';
import { apiClient } from './auth-api.js';
import { bindFieldErrors } from './room-form.js';

const form = document.getElementById('createForm');
const submitBtn = form.querySelector('button[type="submit"]');
const titleInput = form.elements.namedItem('title');
const descriptionInput = form.elements.namedItem('description');
const categoryInput = form.elements.namedItem('category');
const { clearFieldErrors, showFieldErrors, focusFirstError } = bindFieldErrors(form);

const params = new URLSearchParams(window.location.search);
const roomId = params.get('roomId');
const initialValues = {
  title: params.get('title') ?? '',
  description: params.get('description') ?? '',
  category: params.get('category') ?? '',
};

titleInput.value = initialValues.title;
descriptionInput.value = initialValues.description;
categoryInput.value = initialValues.category;

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const title = titleInput.value?.trim();
  const description = descriptionInput.value?.trim();
  const category = categoryInput.value;

  const payload = {};
  if (title !== initialValues.title) payload.title = title;
  if (description !== initialValues.description) payload.description = description;
  if (category !== initialValues.category) payload.category = category;

  if (Object.keys(payload).length === 0) {
    alert('⚠️ 변경된 내용이 없습니다.');
    return;
  }

  clearFieldErrors();
  submitBtn.disabled = true;
  submitBtn.textContent = '수정 중...';

  apiClient
    .patch(`${GATEWAY_URL}/chat/room/${roomId}`, payload, {
      headers: { 'Content-Type': 'application/json' },
      validateStatus: (s) => s === 204,
    })
    .then(() => {
      alert('✅ 방 수정 완료');
      window.location.href = ROUTES.myChatRooms;
    })
    .catch((err) => {
      const errors = err.response?.data?.errors;
      if (errors) {
        showFieldErrors(errors);
        focusFirstError(errors);
        return;
      }

      console.error('submit failed: ', err)
      alert('요청 처리 중 문제가 발생했습니다.')
    })
    .finally(() => {
      submitBtn.disabled = false;
      submitBtn.textContent = '수정';
    });
});
