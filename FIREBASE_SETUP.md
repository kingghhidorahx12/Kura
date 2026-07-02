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
- Facebook
- Phone, cuando quieras activar celular real

## 4. Estado actual

- Correo y contrasena ya usan Firebase cuando `firebaseConfig` esta completo.
- Google y Facebook usan Firebase en Web; para app nativa falta configurar OAuth nativo.
- Celular queda como prueba local hasta activar Phone Auth con verificacion SMS.
- Sin configuracion Firebase, MediMind sigue funcionando con sesion local de prueba.
