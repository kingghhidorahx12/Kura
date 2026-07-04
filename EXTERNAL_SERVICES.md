# Servicios externos para MediMind

Este archivo deja claro que no hay credenciales inventadas. Lo que ya funciona
con la configuración actual es correo/contraseña en Firebase, escritura de
estadísticas básicas en Firestore y desbloqueo local con huella/biometría cuando
ya existe una sesión guardada.

## Datos que necesito para terminar lo pendiente

Pásame estos datos cuando los tengas:

1. Google:
   - Android client ID ya está pegado en `src/oauthConfig.ts`.
   - Web client ID ya está pegado en `src/oauthConfig.ts`.
   - `google-services.json` ya trae `oauth_client`.

2. Facebook:
   - Facebook App ID ya está pegado en `src/oauthConfig.ts`.
   - App Secret debe quedarse solo en Firebase/Meta, no dentro del código.
   - Revisa en Meta que el redirect URI `com.medimind.app:/oauthredirect` esté permitido si Facebook rechaza el regreso a la app.

3. SMS real:
   - Phone Auth debe estar activo en Firebase.
   - En APK instalada, MediMind usa React Native Firebase Auth para enviar SMS real.
   - Revisa plan/costos si Firebase lo solicita para producción.

4. Donar:
   - PayPal.me actual: `https://paypal.me/KingGhidorahX12`
   - Link de Mercado Pago, si decides agregarlo también.

## Google login en APK

Estado actual:

- Google provider ya está activado en Firebase.
- La app Android ya está registrada con package `com.medimind.app`.
- `google-services.json` ya está conectado desde `app.json`.
- El `google-services.json` actual ya trae `oauth_client`.
- En Web, Firebase puede usar popup.
- En APK nativa el flujo AuthSession ya está preparado y tiene `androidClientId`.

Dónde obtenerlo:

1. Firebase Console > Project settings > Your apps > Android app.
2. Google Cloud Console > APIs & Services > Credentials.
3. Firebase Authentication > Sign-in method > Google.

## Facebook login en APK

Pendiente de credenciales de Meta. No metas el App Secret dentro de la app.

Datos necesarios:

- Facebook App ID.
- Facebook App Secret solo para Firebase Console/Meta.
- Android package: `com.medimind.app`.
- Key hash de Android para Meta Developers.

Dónde obtenerlo:

1. https://developers.facebook.com/
2. Crear app de consumidor.
3. Agregar producto Facebook Login.
4. Copiar App ID/App Secret a Firebase Authentication > Facebook.
5. Registrar package y key hash Android en Meta.

## SMS real

Estado actual:

- Phone provider ya está activado en Firebase.
- El flujo visual existe.
- En APK instalada, MediMind intenta enviar SMS real con React Native Firebase Auth.
- En navegador, MediMind mantiene código de prueba porque Phone Auth real necesita módulo nativo.

Notas:

- El SMS puede tener cuotas, límites o costos según configuración y país.
- Debe probarse en APK real, no solo navegador.

## Huella / biometría

Estado actual:

- `expo-local-authentication` está instalado.
- Si ya hay sesión guardada y el teléfono tiene huella/biometría configurada, MediMind pide desbloqueo antes de entrar.
- Si no hay biometría disponible, la app conserva el flujo normal de correo/celular.
- La biometría no crea cuentas; solo desbloquea una sesión local guardada.

## Donaciones

Para México conviene dejar dos opciones:

- Mercado Pago: cómodo para usuarios en México.
- PayPal.me: útil para usuarios fuera de México.

Estado actual:

- PayPal.me: `https://paypal.me/KingGhidorahX12`
- Mercado Pago: pendiente.

En `App.tsx` quedan las constantes:

- `MERCADO_PAGO_DONATION_URL`
- `PAYPAL_DONATION_URL`

Si Mercado Pago queda vacío, el botón Donar usa PayPal.

## Contacto

Ya está preparado con:

- WhatsApp: `+52 712 170 9077`
- Correo: `kingghidorahx12@gmail.com`

La app no muestra esos datos directamente; abre WhatsApp o correo con el mensaje
armado por el formulario.
