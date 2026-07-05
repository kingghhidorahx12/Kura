# Seguridad de Kura

Gracias por ayudar a cuidar Kura.

Si encuentras una vulnerabilidad, no la publiques en issues ni compartas datos
de usuarios. Reporta el problema de forma privada a:

- GitHub: `KingGhidorahX12`
- Correo: `kingghidorahx12@gmail.com`

Incluye, si puedes:

- Versión de la app.
- Dispositivo y versión de Android.
- Pasos para reproducir el problema.
- Capturas sin datos personales.
- Riesgo esperado: bajo, medio o alto.

## Alcance V1

Kura no es una app médica profesional y no sustituye indicaciones de un
médico. La seguridad prioritaria de V1 está enfocada en:

- Proteger cuentas con Firebase Authentication.
- Mantener reglas estrictas de Firestore.
- Evitar secretos dentro del cliente.
- Usar huella/biometría solo para desbloquear una sesión local guardada.
- Preparar App Check antes de abrir la app a más usuarios.

## Fuera de alcance

- Intentos de fuerza bruta contra cuentas reales.
- Ataques que afecten datos de terceros.
- Publicación de recetas, teléfonos, correos o capturas con datos personales.
- Ingeniería social contra usuarios o el desarrollador.
