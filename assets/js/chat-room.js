import { GATEWAY_URL, ROUTES } from './config.js';
import { apiClient, hasAccessToken } from './auth-api.js';
import { createButton, formatLocaleDateTime } from './utils.js';

const categoryInput = document.getElementById('categoryInput');
const list = document.getElementById('list');
const moreBtn = document.getElementById('moreBtn');
const limit = 2;
let isLoadingPrev = false;

const mk = (label, value) => {
  const div = document.createElement('div');
  div.textContent = `${label}: ${value}`;
  return div;
};

function appendRoom(room) {
  list.insertAdjacentElement('beforeend', createRoomArticle(room));
}

function createEnterBtn(roomId) {
  return createButton({
    text: '입장하기',
    onClick: function (event) {
      event.preventDefault();

      const enterBtn = this;

      if (enterBtn.disabled) return;

      enterBtn.disabled = true;
      enterBtn.setAttribute('aria-busy', 'true');
      enterBtn.textContent = '입장중...';

      join(roomId).then(() => {
        enterBtn.disabled = false;
        enterBtn.removeAttribute('aria-busy');
        window.location.href = `${ROUTES.stompChat}?roomId=${roomId}`;
      });
    },
  });
}

function createRoomArticle({ id, title, description, popularity, memberCnt, hostId, createdAt }) {
  const article = document.createElement('article');
  article.className = 'card';
  article.dataset.id = id;
  article.dataset.popularity = popularity;

  const h2 = document.createElement('h2');
  h2.className = 'title';
  h2.textContent = title;

  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.append(
    mk('ID', id),
    mk('Host', hostId),
    mk('Description', description),
    mk('Popularity', popularity),
    mk('Members', memberCnt),
    mk('CreatedAt', formatLocaleDateTime(new Date(createdAt).getTime())),
  );

  article.append(h2, meta);

  if (hasAccessToken()) {
    const actions = document.createElement('div');
    actions.className = 'room-actions';
    actions.append(createEnterBtn(id));
    article.append(actions);
  }

  return article;
}

function loadPopularChatRooms(category, lastId, lastPopularity) {
  return apiClient
    .get(`${GATEWAY_URL}/chat/rooms/popular`, {
      params: { limit, category, lastId, lastPopularity },
      validateStatus: (s) => s >= 200 && s < 300,
    })
    .then((res) => res.data)
    .then(({ items, hasNext }) => {
      if (!hasNext) moreBtn.style.display = 'none';
      return items;
    });
}

function loadMostPopularChatRooms() {
  return loadPopularChatRooms(categoryInput.value);
}

function loadNextPopularChatRooms() {
  if (isLoadingPrev) return;

  isLoadingPrev = true;

  const last = list.lastElementChild;
  const lastId = last?.dataset.id;
  const lastPopularity = last?.dataset.popularity;

  loadPopularChatRooms(categoryInput.value, lastId, lastPopularity)
    .then((items) => items.forEach(appendRoom))
    .catch((err) => console.error('init chain failed:', err))
    .finally(() => { isLoadingPrev = false; });
}

function join(roomId) {
  return apiClient
    .post(`${GATEWAY_URL}/chat/room/${roomId}/members`, null, { validateStatus: (s) => s === 201 || s === 204 })
    .then((res) => res.data);
}

loadMostPopularChatRooms()
  .then((items) => items?.forEach(appendRoom))
  .catch((err) => console.error('init chain failed:', err));

moreBtn.addEventListener('click', loadNextPopularChatRooms);
