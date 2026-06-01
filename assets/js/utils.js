export const escapeCss = (value) => CSS.escape(String(value));

export function formatLocaleDateTime(ts) {
  const date = new Date(ts);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
}

export function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function toQueryString(params) {
  return new URLSearchParams(params).toString();
}

export function createButton({ text, className = 'btn', onClick }) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = text;
  if (onClick) button.addEventListener('click', onClick);
  return button;
}
