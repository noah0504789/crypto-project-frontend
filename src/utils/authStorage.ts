const ACCESS_TOKEN_KEY = 'accessToken';
const REDIRECT_AFTER_LOGIN_KEY = 'redirectAfterLogin';

export function getAccessToken() {
  return sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(accessToken: string) {
  sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
}

export function removeAccessToken() {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
}

export function saveRedirectAfterLogin(path: string) {
  sessionStorage.setItem(REDIRECT_AFTER_LOGIN_KEY, path);
}

export function consumeRedirectAfterLogin() {
  const redirectPath = sessionStorage.getItem(REDIRECT_AFTER_LOGIN_KEY);

  if (redirectPath) {
    sessionStorage.removeItem(REDIRECT_AFTER_LOGIN_KEY);
  }

  return redirectPath;
}