import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authApi } from '@paybridge/shared-api';
import type { UserInfo } from '@paybridge/shared-types';

const TOKEN_KEY = 'paybridge_merchant_token';
const REFRESH_TOKEN_KEY = 'paybridge_merchant_refresh_token';
const USER_KEY = 'paybridge_merchant_user';

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(localStorage.getItem(TOKEN_KEY));
  const refreshToken = ref<string | null>(localStorage.getItem(REFRESH_TOKEN_KEY));
  const user = ref<UserInfo | null>(
    JSON.parse(localStorage.getItem(USER_KEY) || 'null'),
  );

  const isAuthenticated = computed(() => !!accessToken.value);

  async function login(email: string, password: string, twoFactorCode?: string) {
    const result = await authApi.login({ email, password, twoFactorCode });

    if (result.requireTwoFactor) {
      return { requireTwoFactor: true };
    }

    if (result.tokens && result.user) {
      setTokens(result.tokens.accessToken, result.tokens.refreshToken);
      setUser(result.user as UserInfo);
    }

    return { requireTwoFactor: false };
  }

  function setTokens(access: string, refresh: string) {
    accessToken.value = access;
    refreshToken.value = refresh;
    localStorage.setItem(TOKEN_KEY, access);
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  }

  function setUser(userData: UserInfo) {
    user.value = userData;
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
  }

  async function logout() {
    try {
      if (refreshToken.value) {
        await authApi.logout(refreshToken.value);
      }
    } catch {
      // Ignore
    }

    accessToken.value = null;
    refreshToken.value = null;
    user.value = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  return {
    accessToken,
    refreshToken,
    user,
    isAuthenticated,
    login,
    logout,
  };
});
