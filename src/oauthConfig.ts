export const googleOAuthConfig = {
  // Firebase / Google Cloud > OAuth 2.0 Client IDs > Android client for com.medimind.app.
  androidClientId: "270375464494-itflgjlas726kf7rs075jc3555532d76.apps.googleusercontent.com",
  // Firebase / Google Cloud > OAuth 2.0 Client IDs > Web client.
  webClientId: "270375464494-n6366uakae4b71btetq76d357dkmiecr.apps.googleusercontent.com",
  nativeRedirectScheme: "com.googleusercontent.apps.270375464494-itflgjlas726kf7rs075jc3555532d76"
};

export const facebookOAuthConfig = {
  // Meta Developers > App ID. The App Secret must stay in Firebase/Meta, never here.
  appId: "1040848148361818",
  nativeRedirectScheme: "fb1040848148361818"
};

export function missingGoogleOAuthMessage() {
  return "Falta pegar el Android Client ID de Google en src/oauthConfig.ts.";
}

export function missingFacebookOAuthMessage() {
  return "Falta pegar el Facebook App ID en src/oauthConfig.ts.";
}
