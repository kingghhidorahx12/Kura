# MediMind: cierre legal y seguridad V1

Este documento no sustituye asesoría legal ni una auditoría profesional de seguridad. Sirve como guía práctica para preparar MediMind antes de compartirla públicamente.

## 1. Derechos y respaldo de autor

Para proteger MediMind conviene separar tres cosas:

- Código y diseño de la app: registrar como obra/programa de cómputo ante INDAUTOR.
- Nombre y logo `MediMind`: revisar disponibilidad y registrar marca ante IMPI.
- Repositorio: mantener historial de Git, versiones, commits y releases firmados o claramente fechados.

Pasos recomendados:

1. Conserva el repositorio privado o público con commits ordenados y etiquetas como `v1.0.0`.
2. Genera un paquete de evidencia de la versión que quieres proteger: código fuente, logo, capturas, README, fecha de release y APK/AAB.
3. Registra la obra en el Registro Público del Derecho de Autor de INDAUTOR. El portal de INDAUTOR muestra el servicio de Registro Público del Derecho de Autor y costos vigentes.
4. Registra o al menos busca la marca `MediMind` en IMPI antes de compartirla demasiado.
5. Agrega dentro de la app una leyenda tipo: `© 2026 KingGhidorahX12. MediMind. Todos los derechos reservados.`

## 2. Privacidad y datos personales

MediMind maneja datos delicados por su contexto: perfiles, edad, tratamientos, medicamentos, horarios y registros de dosis. Aunque no sea una app médica profesional, debe tratarse con mucho cuidado.

Antes de publicarla:

1. Crear aviso de privacidad.
2. Explicar qué datos se guardan, para qué se usan y cómo pedir eliminación.
3. No guardar más datos de los necesarios.
4. No mostrar datos personales en el panel admin; usa conteos agregados.
5. Evitar subir fotos de recetas a la nube mientras no haya Storage Rules y consentimiento claro.

## 3. Seguridad técnica mínima

Ninguna app es imposible de atacar, pero sí podemos reducir mucho el riesgo. La defensa real está en el servidor, reglas y configuración, no en esconder lógica dentro de la APK.

Checklist para V1:

- Firebase Authentication activo para correo/contraseña.
- Reglas de Firestore estrictas: cada usuario solo lee/escribe sus datos.
- Panel admin protegido por reglas del servidor, no solo por UI.
- App Check con Play Integrity antes de abrir la app a mucha gente.
- No poner secretos privados en `App.tsx`, `app.json` ni en el repo.
- No guardar App Secret de Facebook en la app.
- No subir keystores, claves privadas, `.env` reales o credenciales sensibles.
- Revisar permisos Android y quitar los que no sean necesarios.
- Mantener `google-services.json` en el repo solo si el repositorio público no expone nada sensible adicional. Firebase config no es secreto, pero debe estar protegida con Rules/App Check.

## 4. Pendientes técnicos para login real

### Google

Ya está preparado a nivel visual y Firebase, pero para APK falta conectar OAuth nativo:

- Android Client ID.
- Web Client ID si se usa `expo-auth-session`.
- Redirect URI configurado.
- Prueba en APK real, no solo navegador.

### Facebook

Falta Meta Developers:

- Facebook App ID.
- Facebook App Secret solo en Firebase/Meta, nunca en el cliente.
- Key hash Android.
- Configurar Facebook Login en Meta y Firebase.

### Celular/SMS

El flujo visual ya existe, pero el SMS real necesita verificador nativo:

- Validar Phone Auth en Firebase.
- Revisar costos/cuotas antes de publicar.
- Probar en APK real con un número propio y uno externo.

## 5. Antes de hacer público el repo

1. Revisar que no haya claves privadas ni archivos temporales sensibles.
2. Decidir licencia. Si quieres protegerlo y no permitir copias comerciales, no uses MIT. Usa `Todos los derechos reservados` o una licencia propia simple.
3. Agregar `LICENSE` y `README.md`.
4. Agregar aviso de privacidad y términos.
5. Crear release `v1.0.0`.
6. Mantener issues/discussions para la comunidad sin publicar datos privados.

## 6. Fuentes oficiales y referencias

- INDAUTOR: https://www.indautor.gob.mx/
- Registro Público del Derecho de Autor: https://www.indautor.gob.mx/servicios/registro/registro.php
- IMPI PASE: https://eservicios.impi.gob.mx/seimpi/
- Ley Federal de Protección de Datos Personales en Posesión de los Particulares: https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf
- Firebase App Check con Play Integrity: https://firebase.google.com/docs/app-check/android/play-integrity-provider
- Firebase Security Rules: https://firebase.google.com/docs/rules
- OWASP Mobile Application Security: https://owasp.org/www-project-mobile-app-security/
