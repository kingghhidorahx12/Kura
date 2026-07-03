# Firebase para MediMind

## 1. Crear proyecto

1. Entra a https://console.firebase.google.com/
2. Crea un proyecto llamado `MediMind`.
3. Activa Google Analytics si quieres medir usuarios activos y eventos.
4. Registra una app Web y copia el objeto `firebaseConfig`.

## 2. Pegar configuracion

Pega los valores en `src/firebaseConfig.ts`:

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

## 3. Activar proveedores

En Firebase Console > Authentication > Sign-in method:

- Email/Password
- Google
- Facebook, con App ID y App Secret de Meta Developers
- Phone, cuando quieras activar SMS real

Para cerrar V1, primero deja funcionando Email/Password y Firestore. Google, Facebook y SMS real requieren configuracion adicional externa.

## 4. Activar base de datos

En Firebase Console > Firestore Database:

1. Crea la base en modo produccion.
2. Crea reglas para que solo el usuario autenticado escriba su propio documento.
3. La app escribira:
   - `users/{uid}` con datos basicos de la cuenta.
   - `usageSnapshots/{uid}` con conteos anonimos de perfiles, tratamientos y dosis.

Reglas sugeridas:

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
    }

    match /usageSnapshots/{userId} {
      allow create, update: if isOwner(userId);
      allow read: if isOwner(userId) || isAdmin();
    }
  }
}
```

## 5. Android y Google/Facebook nativo

Para que Google/Facebook funcionen dentro de la APK final hace falta:

1. Registrar app Android en Firebase con package `com.medimind.app`.
2. Agregar SHA-1/SHA-256 de la build de Expo/EAS.
3. Configurar Google provider con el cliente Android.
4. Configurar Facebook provider con App ID/App Secret desde Meta Developers.
5. Agregar el flujo OAuth nativo con paquetes de Expo antes de publicar esa funcion.

## 6. Celular con SMS real

El flujo visual ya existe: numero, enviar codigo y validar codigo. Para SMS real hace falta activar Phone Auth en Firebase y conectar el verificador nativo. Mientras eso no este, el codigo es de prueba local.

## 7. Estado actual

- Correo y contrasena ya usan Firebase cuando `firebaseConfig` esta completo.
- Google y Facebook usan Firebase en Web; para app nativa faltan los Client ID nativos y el flujo OAuth de Expo.
- Celular ya tiene el flujo correcto de enviar codigo y verificarlo, pero el SMS real requiere activar Phone Auth.
- Sin configuracion Firebase, MediMind sigue funcionando con correo/celular local para pruebas.
- Los botones sociales ya no crean sesiones falsas si Firebase no esta conectado.
