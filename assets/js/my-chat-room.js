import { GATEWAY_URL, ROUTES } from './config.js';
import { apiClient } from './auth-api.js';
import { stompClient } from './stomp-client.js';
import { createButton, escapeCss, formatLocaleDateTime, toQueryString } from './utils.js';

const list = document.getElementById('list');
const moreBtn = document.getElementById('moreBtn');
const limit = 1;

let myId;
let isLoadingPrev = false;

const getMetaField = (root, label) => root?.querySelector(`.meta > .${label}`);
const setMetaField = (root, label, value) => { getMetaField(root, label).textContent = `${label}: ${value}`; };

function createMetaFieldDiv(label, value) {
  const div = document.createElement('div');
  div.className = label;
  div.textContent = `${label}: ${value}`;

  if (label === 'unreadMsgCnt' && Number(value) > 0) div.classList.add('has-unread');
  return div;
}

function appendRoom(room) {
  list.insertAdjacentElement('beforeend', createMyChatRoomArticle(room));
}

function createMyChatRoomArticle({ id, hostId, title, category, description, lastMsgContent, lastMsgCreatedAt, unreadMsgCnt, memberCnt }) {
  const article = document.createElement('article');
  article.className = 'card';
  article.dataset.id = id;
  article.dataset.lastMsgCreatedAt = lastMsgCreatedAt || 0;
  article.dataset.unreadMsgCnt = unreadMsgCnt;

  const h2 = document.createElement('h2');
  h2.className = 'title';
  h2.textContent = title;

  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.append(
    createMetaFieldDiv('id', id),
    createMetaFieldDiv('hostId', hostId),
    createMetaFieldDiv('category', category),
    createMetaFieldDiv('description', description),
    createMetaFieldDiv('memberCnt', memberCnt),
    createMetaFieldDiv('lastMsgContent', lastMsgContent || 'X'),
    createMetaFieldDiv('lastMsgCreatedAt', lastMsgCreatedAt ? formatLocaleDateTime(new Date(lastMsgCreatedAt).getTime()) : 'X'),
    createMetaFieldDiv('unreadMsgCnt', unreadMsgCnt),
  );

  const actions = document.createElement('div');
  actions.className = 'room-actions';
  actions.append(createEnterBtn(id));
  if (hostId == myId) actions.append(createUpdateBtn(id, title, description, category));
  actions.append(createLeaveBtn(id));

  article.append(h2, meta, actions);
  return article;
}

function createEnterBtn(roomId) {
  return createButton({
    text: '입장하기',
    onClick: () => { window.location.href = `${ROUTES.stompChat}?roomId=${roomId}`; },
  });
}

function createUpdateBtn(roomId, title, description, category) {
  return createButton({
    text: '수정하기',
    className: 'btn btn-update',
    onClick: () => {
      const params = toQueryString({ roomId, title, description, category });
      window.location.href = `${ROUTES.updateChatRoom}?${params}`;
    },
  });
}

function createLeaveBtn(roomId) {
  return createButton({
    text: '나가기',
    className: 'btn btn--danger',
    onClick: (event) => {
      event.preventDefault();
      const leaveBtn = event.currentTarget;

      if (leaveBtn.disabled) return;

      leaveBtn.disabled = true;
      leaveBtn.setAttribute('aria-busy', 'true');
      leaveBtn.textContent = '나가는 중...';

      leave(roomId)
        .then(() => setTimeout(() => {
          alert('방 나가기 완료');
          window.location.reload();
        }, 3500))
        .catch(() => {
          leaveBtn.disabled = false;
          leaveBtn.removeAttribute('aria-busy');
          leaveBtn.textContent = '나가기';
          alert('방 나가기 실패');
        });
    },
  });
}

function leave(roomId) {
  return apiClient
    .delete(`${GATEWAY_URL}/chat/room/${roomId}/members`, { validateStatus: (s) => s === 204 })
    .then((res) => res.data);
}

function loadMyProfile() {
  return apiClient
    .get(`${GATEWAY_URL}/user/me`, { validateStatus: (s) => s === 304 || (s >= 200 && s < 300) })
    .then((res) => res.data);
}

function loadMyActiveChatRooms(lastUnreadFlag, lastMsgCreatedAt, lastId) {
  return apiClient
    .get(`${GATEWAY_URL}/chat/rooms/me`, {
      params: { limit, lastUnreadFlag, lastMsgCreatedAt, lastId },
      validateStatus: (s) => s >= 200 && s < 300,
    })
    .then((res) => res.data)
    .then(({ items, hasNext }) => {
      if (!hasNext) moreBtn.style.display = 'none';
      return items;
    });
}

function loadMyActiveChatRoomsBefore() {
  if (isLoadingPrev) return;

  isLoadingPrev = true;

  const last = list.lastElementChild;
  const lastId = last?.dataset.id;
  const lastMsgCreatedAt = last?.dataset.lastMsgCreatedAt;
  const lastUnreadFlag = Number(last?.dataset.unreadMsgCnt) > 0;

  loadMyActiveChatRooms(lastUnreadFlag, lastMsgCreatedAt, lastId)
    .then((items) => items?.forEach(appendRoom))
    .catch((err) => console.error('init chain failed:', err))
    .finally(() => { isLoadingPrev = false; });
}

async function loadMyActiveChatRoom(roomId) {
  const res = await apiClient.get(`${GATEWAY_URL}/chat/room/${roomId}/me`, { validateStatus: (s) => s >= 200 && s < 300 });
  return res.data;
}

async function ensureActiveArticle(roomId) {
  const active = list.querySelector(`:scope > article[data-id=${escapeCss(roomId)}]`);
  if (active) return active;

  const room = await loadMyActiveChatRoom(roomId);
  return createMyChatRoomArticle(room);
}

async function onBadge({ id, lastMsgContent, lastMsgCreatedAt }) {
  const active = await ensureActiveArticle(id);
  list.prepend(active);

  if (active.dataset.lastMsgCreatedAt == lastMsgCreatedAt) return;

  setMetaField(active, 'lastMsgContent', lastMsgContent);
  setMetaField(active, 'lastMsgCreatedAt', formatLocaleDateTime(new Date(lastMsgCreatedAt).getTime()));

  const unreadDiv = getMetaField(active, 'unreadMsgCnt');
  const [, right] = unreadDiv.textContent.split(':', 2);
  const next = Number(right.trim()) + 1;

  unreadDiv.textContent = `unreadMsgCnt: ${next}`;
  unreadDiv.classList.toggle('has-unread', next > 0);
  active.dataset.unreadMsgCnt = next;
}

stompClient.activate();
stompClient.subscribe('/user/queue/chat/badge', onBadge);

loadMyProfile()
  .then((profile) => {
    myId = profile?.id;
    return loadMyActiveChatRooms();
  })
  .then((items) => items?.forEach(appendRoom))
  .catch((err) => console.error('init chain failed:', err));

moreBtn.addEventListener('click', loadMyActiveChatRoomsBefore);
