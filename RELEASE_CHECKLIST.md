# Checklist V1 de MediMind

## Antes de compilar

1. Pegar `firebaseConfig` real en `src/firebaseConfig.ts`.
2. Activar Firebase Authentication > Email/Password.
3. Activar Firestore Database y pegar las reglas de `FIREBASE_SETUP.md`.
4. Probar en navegador:
   - Crear cuenta con correo.
   - Cerrar sesión.
   - Iniciar sesión con la misma cuenta.
   - Crear primer perfil.
   - Agregar receta y activar recordatorios.
5. Probar en app instalada:
   - Notificacion de prueba.
   - Recordatorio real programado.
   - Acciones de notificación: Completado, Posponer y Omitir.
   - Desbloqueo con huella/biometría después de tener una sesión guardada.
   - SMS real en APK: enviar código, recibirlo y confirmar cuenta.
   - Google/Facebook con los IDs reales de `src/oauthConfig.ts`.
6. Revisar `EXTERNAL_SERVICES.md` antes de activar Google nativo, Facebook, SMS real o Donar en una build pública.
7. Revisar `SECURITY_AND_RIGHTS.md` antes de compartir la app o hacer público el repositorio.
8. Probar el panel admin siguiendo `ADMIN_TEST_GUIDE.md`.
9. Confirmar que EAS Update conserve canales `preview` y `production`.

## Versión instalada

La APK ya instalada no se actualiza sola. Cada cambio de permisos, icono, Firebase nativo, notificaciones o configuración requiere nueva build e instalación.

Para la siguiente APK de prueba:

```bash
npm run build:android:preview
```

Para tienda o distribucion final:

```bash
npm run build:android:production
```

## Pendientes recomendados para V1.1

- Google/Facebook nativo con OAuth real.
- SMS real con Firebase Phone Auth.
- EAS Update para cambios visuales/JavaScript sin reinstalar.
- Política de privacidad y aviso médico formal.
- Registro de obra ante INDAUTOR y revisión de marca ante IMPI.
- App Check con Play Integrity antes de abrir la app a más usuarios.
