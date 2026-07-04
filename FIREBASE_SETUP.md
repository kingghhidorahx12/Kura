# Firebase para MediMind

## 1. Proyecto

1. Entra a https://console.firebase.google.com/
2. Usa el proyecto `MediMind`.
3. Mantén registrada la app Android con package `com.medimind.app`.
4. Mantén `google-services.json` conectado desde `app.json`.

## 2. Configuración web

La configuración pública de Firebase debe vivir en `src/firebaseConfig.ts` si el
proyecto mantiene ese archivo, o en el archivo equivalente usado por la app.

```ts
export const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROYECTO",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID",
  measurementId: "TU_MEASUREMENT_ID"
};
```

Esta configuración no es una contraseña, pero debe estar protegida con reglas de
seguridad, App Check y proveedores correctamente configurados.

## 3. Authentication

En Firebase Console > Authentication > Sign-in method:

- Email/Password: activo.
- Google: activo, `androidClientId` y `webClientId` ya están en `src/oauthConfig.ts`.
- Facebook: `appId` ya está en `src/oauthConfig.ts`; App Secret debe estar en Firebase/Meta.
- Phone: activo; en APK usa React Native Firebase Auth para SMS real.

## 4. Firestore

En Firebase Console > Firestore Database:

1. Crea la base en modo producción.
2. Pega reglas estrictas.
3. Verifica que ningún usuario pueda leer datos de otro usuario.

Reglas sugeridas para V1:

```txt
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return signedIn() && request.auth.uid == userId;
    }

    function isAdmin() {
      return signedIn() && request.auth.token.email == "kingghidorahx12@gmail.com";
    }

    match /users/{userId} {
      allow create, update: if isOwner(userId);
      allow read: if isOwner(userId) || isAdmin();
      allow delete: if isOwner(userId);
    }

    match /usageSnapshots/{userId} {
      allow create, update: if isOwner(userId);
      allow read: if isOwner(userId) || isAdmin();
      allow delete: if isOwner(userId);
    }
  }
}
```

## 5. App Check

Antes de compartir MediMind con más personas:

1. Firebase Console > App Check.
2. Selecciona la app Android.
3. Activa Play Integrity.
4. Prueba primero en modo monitoreo.
5. Cuando los datos se vean correctos, activa enforcement para Firestore.

App Check ayuda a reducir abuso desde clientes no autorizados, pero no reemplaza
las reglas de Firestore.

## 6. Android y Google/Facebook nativo

Para que Google/Facebook funcionen dentro de la APK final hace falta:

1. Registrar app Android en Firebase con package `com.medimind.app`.
2. Agregar SHA-1/SHA-256 de la build de Expo/EAS.
3. Configurar Google provider con el cliente Android.
4. Configurar Facebook provider con App ID/App Secret desde Meta Developers.
5. Verificar que `androidClientId`, `webClientId` y `appId` sigan en `src/oauthConfig.ts`.
6. Verificar que `google-services.json` tenga `oauth_client`.
7. Si Facebook rechaza el login, permitir `com.medimind.app:/oauthredirect` en Meta Developers.

## 7. Celular con SMS real

El flujo visual ya existe: número, enviar código y validar código. En APK
instalada, el envío usa React Native Firebase Auth y debe mandar SMS real si
Phone Auth está activo. En navegador sigue usando código local de prueba.

## 8. Panel admin

El panel admin está preparado para:

- `KingGhidorahX12`
- `kingghidorahx12@gmail.com`

Para producción, la protección real debe estar en reglas de Firestore o custom
claims. No basta con ocultar el botón desde la interfaz.

## 9. Estado actual

- Correo y contraseña usan Firebase cuando `firebaseConfig` está completo.
- Google provider ya está activado y los Client IDs están en `src/oauthConfig.ts`.
- Facebook tiene App ID en `src/oauthConfig.ts`; confirma App Secret/redirect URI en Meta y Firebase.
- Celular ya usa SMS real en APK instalada con React Native Firebase Auth.
- Huella/biometría desbloquea sesión guardada localmente.
- Los datos externos que faltan están listados en `EXTERNAL_SERVICES.md`.
