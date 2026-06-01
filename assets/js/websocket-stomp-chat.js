import { GATEWAY_URL } from './config.js';
import { apiClient, getAccessToken } from './auth-api.js';
import { stompClient } from './stomp-client.js';
import { escapeCss, formatLocaleDateTime, uuidv4 } from './utils.js';

const toastContainer = document.getElementById("toastContainer");
const chatBox = document.getElementById("chatBox");
const input = document.getElementById("messageInput")
const sendBtn = document.getElementById("sendBtn")
const roomId = new URLSearchParams(window.location.search).get("roomId")
const limit = 10
const ACK_TIMEOUT_MS = 3000
const pending = new Map();
const mySent = new Set()
const profileCache = new Map();
const inFlight = new Map(); 

let isLoadingPrev = false;
let hasMorePrev = true;
let myId; // 로그인된 사용자 id
let lastMsgSeq;

function addSpacer() {
  if (document.getElementById('topSpacer')) return;

  const spacer = document.createElement('div')
  spacer.id = 'topSpacer'
  spacer.style.height = '1px'
  spacer.style.pointerEvents = 'none'
  spacer.style.opacity = '0'

  chatBox.prepend(spacer)
}

function removeSpacer() {
  const spacer = document.getElementById('topSpacer')
  if (!spacer) return;
  if (chatBox.scrollHeight <= chatBox.clientHeight + 1) return;
  
  spacer.remove();
}

function sendMessage() {
  const content = input.value;
  if (!content) return;

  const clientMessageId = uuidv4();
  const node = createMyPendingmessageEl(clientMessageId, content)
  chatBox.appendChild(node)
  chatBox.scrollTop = chatBox.scrollHeight

  const timer = setTimeout(() => onTimeout(clientMessageId), ACK_TIMEOUT_MS)
  pending.set(clientMessageId, { node, content, timer})
  mySent.add(clientMessageId)

  stompClient.publish({
    destination: "/msg/chat.send",
    body: JSON.stringify({ clientMessageId, roomId, writerId: myId, content })
  });

  input.value = "";
}

function appendMessage(message) {
  const curWriterId = message.writerId;

  chatBox.insertAdjacentElement('beforeend', createMessageEl(message, curWriterId == myId, curWriterId == chatBox.lastElementChild.dataset.writerId))
}

function prependMessage(message) {
  const curWriterId = message.writerId;

  chatBox.insertAdjacentElement('afterbegin', createMessageEl(message, curWriterId == myId));
}

function createAvatarEl(writerId) {
  const side = document.createElement('div');
  side.className = 'side';

  const label = document.createElement('div');
  label.className = 'avatar-initial';
  ensureProfile(writerId).then(p => label.textContent = p.nickname)

  const avatar = document.createElement('div');
  avatar.className = 'avatar';

  side.append(label, avatar);

  return side;
}

function createMyPendingmessageEl(clientMessageId, content) {
  const div = document.createElement('div')
  div.className = 'bubble me pending'
  div.dataset.clientMessageId = clientMessageId

  const text = document.createElement('div')
  text.className = 'text'
  text.textContent = `${content}`

  const meta = document.createElement('div')
  meta.className = 'meta'

  const status = document.createElement('div')
  status.className = 'status'
  // status.textContent = 'request..'

  const ts = document.createElement("span")
  ts.className = 'ts'

  const retryBtn = document.createElement('button')
  retryBtn.className = 'retry'
  retryBtn.textContent = 'retry'
  retryBtn.style.display = 'none'
  retryBtn.onclick = () => retry(clientMessageId);

  meta.append(ts, status, retryBtn)
  div.append(text, meta)

  return div
}

function createMessageEl(m, isMine, isContinue) {
  const createdAtTs = new Date(m.createdAt).getTime()

  const row = document.createElement('div');
  row.className = `msg-row ${isMine ? 'me' : 'other'} ${isContinue ? 'continued' : ''}`;
  row.dataset.id = m.id;
  row.dataset.ts = createdAtTs;
  row.dataset.writerId = m.writerId;

  const bubble = document.createElement("div")
  bubble.className = `bubble ${isMine ? 'me' : 'other'} ${isContinue ? 'compact' : ''}`;

  const content = document.createElement("div")
  content.className = 'content'
  content.textContent = `${m.content}`

  const ts = document.createElement("span")
  ts.className = 'ts'
  ts.textContent = formatLocaleDateTime(createdAtTs)

  bubble.append(content, ts)

  if (isMine || isContinue) row.append(bubble)
  else if (!isContinue) row.append(createAvatarEl(m.writerId), bubble)

  return row;
}

function showToast(message, type='info', timeout = 5000) {
  const toast = document.createElement('div')
  toast.classList.add('toast', `toast--${type}`)
  toast.setAttribute('role', 'status')
  
  const contentWrap = document.createElement('div')
  
  const msgEl = document.createElement('div')
  msgEl.className = 'toast__msg'
  msgEl.textContent = message
  contentWrap.appendChild(msgEl)

  const closeBtn = document.createElement('button')
  closeBtn.className = 'toast__close'
  closeBtn.setAttribute('aria-label', '닫기')
  closeBtn.textContent = 'x'

  toast.appendChild(contentWrap)
  toast.appendChild(closeBtn)

  const remove = () => {
    toast.classList.add('toast--closing')
    toast.addEventListener('animationend', () => toast.remove(), {once: true})        
  }
  closeBtn.addEventListener('click', remove)

  let hideTimer = setTimeout(remove, timeout)
  toast.addEventListener('mouseenter', () => clearTimeout(hideTimer))
  toast.addEventListener('mouseleave', () => hideTimer = setTimeout(remove, Math.max(3000, timeout / 2)))

  toastContainer.prepend(toast);
}

function markSent(node) {
  node.classList.remove('pending', 'failed')
  node.classList.add('sent')

  const t = node.querySelector('.ts')
  if (t) t.textContent = formatLocaleDateTime(Number(node.dataset.ts))

  const r = node.querySelector('.retry')
  if (r) r.style.display = 'none'
}

function markFailed(node) {
  node.classList.remove('pending')
  node.classList.add('failed')

  // const s = node.querySelector('.status')
  // if (s) s.textContent = reason

  const r = node.querySelector('.retry')
  if (r) r.style.display = 'inline-block'
}

async function smoothRemove(el, duration = 250) {
  if (!el || el.dataset.removing) return;
  el.dataset.removing = 1

  const h = el.offsetHeight;

  el.style.overflow = "hidden"

  const anim = el.animate(
    [
      { opacity: 1, transform: "translateY(0)", height: h + "px", marginTop: getComputedStyle(el).marginTop, marginBottom: getComputedStyle(el).marginBottom, paddingTop: getComputedStyle(el).paddingTop, paddingBottom: getComputedStyle(el).paddingBottom },
      { opacity: 0, transform: "translateY(4px)", height: "0px", marginTop: "0px", marginBottom: "0px", paddingTop: "0px", paddingBottom: "0px" }
    ],
    { duration, easing: "ease" }
  );

  await anim.finished;
  el.remove();
}

function retry(clientMessageId) {
  const e = pending.get(clientMessageId)
  if (!e) return;

  const node = e.node;

  node.classList.remove('failed');
  node.classList.add('pending');

  // const s = node.querySelector('.status')
  // if (s) s.textContent = 'retry..'

  const r = node.querySelector('.retry')
  if (r) r.style.display = 'none'

  clearTimeout(e.timer)
  e.timer = setTimeout(() => onTimeout(clientMessageId), ACK_TIMEOUT_MS)

  stompClient.publish({
    destination: "/msg/chat.send",
    body: JSON.stringify({ clientMessageId, roomId, writerId: myId, content: e.content })
  });
}

function onTimeout(clientMessageId) {
  const entry = pending.get(clientMessageId);
  if (!entry) return;

  markFailed(entry.node)      
}

function onAck(payload) {
  const { id, clientMessageId, success, ts, errors } = payload
  const e = pending.get(clientMessageId)
  if (!e) return;

  clearTimeout(e.timer)

  const node = e.node

  if (success) {
    node.dataset.id = id
    node.dataset.ts = ts        
    
    markSent(node);

    pending.delete(clientMessageId)

    lastMsgSeq++;
  } else if (errors.errors) {        
    for (let el = chatBox.lastElementChild; el; el = el.previousElementSibling) {
      if (el.matches(`[data-client-message-id="${escapeCss(clientMessageId)}"]`)) {            
        smoothRemove(el)
        break;
      }
    }

    errors.errors.forEach(({code, field, message}) => showToast(`${field}(${code}): ${message}`, 'error'))

    pending.delete(clientMessageId)
  } else {
    markFailed(node)
  }
}

function onBroadcast(message) {    
  if (mySent.has(message.clientMessageId)) {        
    mySent.delete(message.clientMessageId);
    return;
  }

  const distFromBottom = chatBox.scrollHeight - (chatBox.scrollTop + chatBox.clientHeight)

  appendMessage(message)
  lastMsgSeq++;

  if (distFromBottom <= 40) chatBox.scrollTop = chatBox.scrollHeight;      
}

function ensureProfile(userId) {
  const cached = profileCache.get(userId)
  if (cached) return Promise.resolve(cached)

  const pending = inFlight.get(userId);
  if (pending) return pending;
  
  const url = `${GATEWAY_URL}/user/${userId}/profile`;
  const req = apiClient.get(url, {validateStatus: s => s >= 200 && s < 300})
    .then(res => res.data)
    .then(profile => (profileCache.set(userId, profile), profile))
    .finally(() => inFlight.delete(userId));
  
  inFlight.set(userId, req);

  return req;
}

function loadMyProfile() {
  const url = `${GATEWAY_URL}/user/me`;
  
  return apiClient.get(url, {validateStatus: s => s === 304 || (s >= 200 && s < 300)}).then(res => res.data)
}

function loadChatroom() {
  const url = `${GATEWAY_URL}/chat/room/${roomId}`;
  
  return apiClient.get(url, {validateStatus: s => s === 200}).then(res => res.data)
}

function loadChatMessage(roomId, lastId, lastCreatedAtMillis) {
  const url = `${GATEWAY_URL}/chat/room/${roomId}/messages`;
  
  return apiClient.get(url, {
      params: {limit, lastId, lastCreatedAtMillis},
      validateStatus: s => s >= 200 && s < 300
    })
    .then(res => res.data)
    .then(({items, hasNext}) => {
      hasMorePrev = hasNext

      return items
    })
}

function loadLatestChatmessage(roomId) {
  return loadChatMessage(roomId)
}

function loadPrevChatMessage() {
  if (isLoadingPrev || !hasMorePrev) return;
  
  isLoadingPrev = true;

  const first = chatBox.firstElementChild
  const lastId = first?.dataset.id;
  const lastCreatedAtMillis = Number(first?.dataset.ts)

  loadChatMessage(roomId, lastId, lastCreatedAtMillis)
    .then((items) => {
      const prevScrollTop = chatBox.scrollTop;
      const prevScrollHeight = chatBox.scrollHeight;

      items.forEach(prependMessage)

      chatBox.scrollTop = chatBox.scrollHeight - prevScrollHeight + prevScrollTop
    }) 
    .catch((err) => console.error('loadChatMessage failed:', err))
    .finally(() => isLoadingPrev = false);
}

function updateMyLastActivity(e) {
  const url = `${GATEWAY_URL}/chat/room/${roomId}/activity?lastMsgSeq=${lastMsgSeq}&lastMsgMs=${chatBox.lastElementChild.dataset?.ts ?? 0}`;
  
  fetch(url, {
    method: 'PUT',
    headers: {'authorization': `Bearer ${getAccessToken()}`},        
    keepalive: true,
  })
  .catch(() => {});
}

(() => {
  stompClient.activate();
  stompClient.subscribe(`/user/queue/chat/ack`, onAck);
  stompClient.subscribe(`/topic/chat/${roomId}`, onBroadcast);

  loadMyProfile()
    .then(profile => {
      myId = profile?.id

      return loadChatroom()          
    })
    .then(room => {
      lastMsgSeq = room.msgCnt || 0

      return loadLatestChatmessage(roomId)
    })
    .then(items => {
      items?.forEach(prependMessage)

      return new Promise(requestAnimationFrame);
    })
    .then(() => {
      chatBox.scrollTop = chatBox.scrollHeight

      addSpacer();
      removeSpacer();
    }) 
    .catch(err => console.error('init chain failed:', err));        
})();
  
chatBox.addEventListener('scroll', () => {
  if (chatBox.scrollTop > 0) return;
  
  loadPrevChatMessage();
})
  
sendBtn.addEventListener('click', sendMessage)

window.addEventListener('beforeunload', updateMyLastActivity)
// window.addEventListener('pagehide', setMyLastMsgSeqOnExit)
// window.addEventListener('popstate', setMyLastMsgSeqOnExit)
// document.addEventListener('visibilitychange', setMyLastMsgSeqOnExit)
