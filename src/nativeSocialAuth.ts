import * as AuthSession from "expo-auth-session";
import { discovery as facebookDiscovery } from "expo-auth-session/providers/facebook";
import { discovery as googleDiscovery } from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import { facebookOAuthConfig, googleOAuthConfig, missingFacebookOAuthMessage, missingGoogleOAuthMessage } from "./oauthConfig";

WebBrowser.maybeCompleteAuthSession();

const googleNativeRedirectUri = AuthSession.makeRedirectUri({
  native: `${googleOAuthConfig.nativeRedirectScheme}:/oauthredirect`
});

const facebookNativeRedirectUri = AuthSession.makeRedirectUri({
  native: `${facebookOAuthConfig.nativeRedirectScheme}://authorize`
});

export async function requestGoogleIdToken() {
  const clientId = Platform.OS === "web" ? googleOAuthConfig.webClientId : googleOAuthConfig.androidClientId;
  if (!clientId) {
    throw new Error(missingGoogleOAuthMessage());
  }

  const request = new AuthSession.AuthRequest({
    clientId,
    redirectUri: googleNativeRedirectUri,
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
    scopes: ["openid", "profile", "email"],
    extraParams: {
      prompt: "select_account"
    }
  });

  const result = await request.promptAsync(googleDiscovery);
  if (result.type !== "success" || !result.params.code) {
    throw new Error("Inicio con Google cancelado.");
  }

  const token = await AuthSession.exchangeCodeAsync(
    {
      clientId,
      code: result.params.code,
      redirectUri: googleNativeRedirectUri,
      extraParams: {
        code_verifier: request.codeVerifier ?? ""
      }
    },
    googleDiscovery
  );

  if (!token.idToken) {
    throw new Error("Google no devolvió un ID token.");
  }

  return token.idToken;
}

export async function requestFacebookAccessToken() {
  const clientId = facebookOAuthConfig.appId;
  if (!clientId) {
    throw new Error(missingFacebookOAuthMessage());
  }

  const request = new AuthSession.AuthRequest({
    clientId,
    redirectUri: facebookNativeRedirectUri,
    responseType: AuthSession.ResponseType.Token,
    scopes: ["public_profile"]
  });

  const result = await request.promptAsync(facebookDiscovery);
  if (result.type !== "success" || !result.params.access_token) {
    throw new Error("Inicio con Facebook cancelado.");
  }

  return result.params.access_token;
}
