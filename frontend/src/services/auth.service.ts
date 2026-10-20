import type {
  AuthUser,
  LoginResponse,
} from '../types/auth';

import { API_URL } from '../config';

const TOKEN_KEY =
  'factoredge_access_token';

const USER_KEY =
  'factoredge_user';

export async function login(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const response =
    await fetch(
      `${API_URL}/auth/login`,
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json',
        },

        body: JSON.stringify({
          email,
          password,
        }),
      },
    );

  if (!response.ok) {
    throw new Error(
      'Invalid email or password',
    );
  }

  const data =
    (await response.json()) as
      LoginResponse;

  localStorage.setItem(
    TOKEN_KEY,
    data.accessToken,
  );

  localStorage.setItem(
    USER_KEY,
    JSON.stringify(data.user),
  );

  return data;
}

export function logout(): void {
  localStorage.removeItem(
    TOKEN_KEY,
  );

  localStorage.removeItem(
    USER_KEY,
  );
}

export function getToken():
  string | null {
  return localStorage.getItem(
    TOKEN_KEY,
  );
}

export function getStoredUser():
  AuthUser | null {
  const value =
    localStorage.getItem(
      USER_KEY,
    );

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(
      value,
    ) as AuthUser;
  } catch {
    return null;
  }
}


// Demo için localStorage yeterli. Mülakatta sorulursa production web uygulamasında token saklama stratejisinin XSS/CSRF
//  tehdit modeline göre seçileceğini; mümkün olduğunda güvenli HttpOnly + Secure + SameSite cookie yaklaşımının değerlendirileceğini söyleyebiliriz.