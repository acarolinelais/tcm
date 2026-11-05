export interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: "bearer";
}

const ACCESS = "sdf.access";

export const getAccessToken = () => sessionStorage.getItem(ACCESS);

export function saveTokens(tokens: TokenResponse) {
  sessionStorage.setItem(ACCESS, tokens.access_token);
}

export function clearTokens() {
  sessionStorage.removeItem(ACCESS);
}
