import { authApi } from "@paybridge/shared-api";
import type { LoginResponse, RefreshTokenResponse } from "@paybridge/shared-types";

export interface UserResult {
  success: boolean;
  data: {
    avatar?: string;
    username: string;
    nickname?: string;
    roles: string[];
    permissions: string[];
    accessToken: string;
    refreshToken: string;
    expires: Date;
  };
  requireTwoFactor?: boolean;
}

export type RefreshTokenResult = {
  success: boolean;
  data: {
    accessToken: string;
    refreshToken: string;
    expires: Date;
  };
};

export const getLogin = async (data: {
  email: string;
  password: string;
  twoFactorCode?: string;
}): Promise<UserResult> => {
  const response: LoginResponse = await authApi.login({
    email: data.email,
    password: data.password,
    twoFactorCode: data.twoFactorCode,
  });

  if (response.requireTwoFactor) {
    return {
      success: false,
      data: null as unknown as UserResult["data"],
      requireTwoFactor: true,
    };
  }

  return {
    success: true,
    data: {
      avatar: response.user?.avatar || "",
      username: response.user?.username || data.email,
      nickname: response.user?.username || "",
      roles: [response.user?.role || "OPERATOR"],
      permissions: response.user?.permissions || [],
      accessToken: response.accessToken!,
      refreshToken: response.refreshToken!,
      expires: new Date(response.expiresAt!),
    },
  };
};

export const refreshTokenApi = async (data: {
  refreshToken: string;
}): Promise<RefreshTokenResult> => {
  const response: RefreshTokenResponse = await authApi.refreshToken(
    data.refreshToken
  );

  return {
    success: true,
    data: {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      expires: new Date(response.expiresAt),
    },
  };
};
