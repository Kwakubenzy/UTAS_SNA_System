/** Persists auth tokens in localStorage (Remember Me) or sessionStorage (not remembered),
 * so a browser-close actually logs the user out when they didn't ask to be remembered. */
const REMEMBER_KEY = 'auth_remember';
const ACCESS_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';

const activeStore = (): Storage => (localStorage.getItem(REMEMBER_KEY) === 'false' ? sessionStorage : localStorage);

export const tokenStorage = {
  setTokens(accessToken: string, refreshToken: string, remember: boolean) {
    localStorage.setItem(REMEMBER_KEY, String(remember));
    const store = remember ? localStorage : sessionStorage;
    const other = remember ? sessionStorage : localStorage;
    other.removeItem(ACCESS_KEY);
    other.removeItem(REFRESH_KEY);
    store.setItem(ACCESS_KEY, accessToken);
    store.setItem(REFRESH_KEY, refreshToken);
  },
  getAccessToken(): string | null {
    return activeStore().getItem(ACCESS_KEY);
  },
  getRefreshToken(): string | null {
    return activeStore().getItem(REFRESH_KEY);
  },
  setAccessToken(token: string) {
    activeStore().setItem(ACCESS_KEY, token);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    sessionStorage.removeItem(ACCESS_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
  },
};
