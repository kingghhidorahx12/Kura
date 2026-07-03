# Checklist V1 de MediMind

## Antes de compilar

1. Pegar `firebaseConfig` real en `src/firebaseConfig.ts`.
2. Activar Firebase Authentication > Email/Password.
3. Activar Firestore Database y pegar las reglas de `FIREBASE_SETUP.md`.
4. Probar en navegador:
   - Crear cuenta con correo.
   - Cerrar sesion.
   - Iniciar sesion con la misma cuenta.
   - Crear primer perfil.
   - Agregar receta y activar recordatorios.
5. Probar en app instalada:
   - Notificacion de prueba.
   - Recordatorio real programado.
   - Acciones de notificacion: Completado, Posponer y Omitir.
6. Revisar `EXTERNAL_SERVICES.md` antes de activar Google, Facebook, SMS real o Donar en una build publica.

## Version instalada

La APK ya instalada no se actualiza sola. Cada cambio de permisos, icono, Firebase nativo, notificaciones o configuracion requiere nueva build e instalacion.

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
- Politica de privacidad y aviso medico formal.
