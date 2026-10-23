export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: "bearer";
}

const ACCESS = "sdf.access";
const REFRESH = "sdf.refresh";

export const getAccessToken = () => sessionStorage.getItem(ACCESS);
export const getRefreshToken = () => sessionStorage.getItem(REFRESH);

export function saveTokens(tokens: TokenResponse) {
  sessionStorage.setItem(ACCESS, tokens.access_token);
  sessionStorage.setItem(REFRESH, tokens.refresh_token);
}

export function clearTokens() {
  sessionStorage.removeItem(ACCESS);
  sessionStorage.removeItem(REFRESH);
  localStorage.clear();
}
