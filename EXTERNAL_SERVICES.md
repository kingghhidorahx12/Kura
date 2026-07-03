# Servicios externos para MediMind

Este archivo deja claro que no hay credenciales inventadas. Lo que ya funciona con la configuracion actual es correo/contrasena en Firebase y escritura de estadisticas basicas en Firestore.

## Google login en APK

Pendiente de credenciales nativas.

Datos necesarios:
- Package Android: `com.medimind.app`.
- SHA-1 y SHA-256 de la credencial Android usada por EAS.
- Android client ID generado por Firebase/Google Cloud.
- Web client ID si se usa `expo-auth-session`.

Donde obtenerlo:
1. Firebase Console > Project settings > Your apps > Add Android app.
2. EAS credentials para ver o generar el keystore y sus SHA.
3. Firebase Authentication > Sign-in method > Google.

## Facebook login en APK

Pendiente de credenciales de Meta.

Datos necesarios:
- Facebook App ID.
- Facebook App Secret.
- Android package: `com.medimind.app`.
- Key hash de Android para Meta Developers.

Donde obtenerlo:
1. https://developers.facebook.com/
2. Crear app de consumidor.
3. Agregar producto Facebook Login.
4. Copiar App ID/App Secret a Firebase Authentication > Facebook.

## SMS real

El flujo visual existe, pero el envio actual sigue usando codigo de prueba local.

Datos/configuracion necesarios:
- Activar Firebase Authentication > Phone.
- Registrar app Android en Firebase.
- Agregar SHA-1/SHA-256 de EAS.
- Revisar si el proyecto requiere plan Blaze para verificacion telefonica segun el uso.
- Conectar el verificador nativo antes de publicar SMS real.

## Donaciones

Para Mexico conviene dejar dos opciones:
- Mercado Pago: mejor para usuarios en Mexico.
- PayPal.me: util para usuarios fuera de Mexico.

Datos necesarios:
- Link publico de Mercado Pago.
- Link publico de PayPal.me.

En `App.tsx` quedan las constantes:
- `MERCADO_PAGO_DONATION_URL`
- `PAYPAL_DONATION_URL`

Mientras esten vacias, el boton Donar muestra un aviso de configuracion pendiente y no abre un enlace falso.

## Contacto

Ya esta preparado con:
- WhatsApp: `+52 712 170 9077`
- Correo: `kingghidorahx12@gmail.com`

La app no muestra esos datos directamente; abre WhatsApp o correo con el mensaje armado por el formulario.
