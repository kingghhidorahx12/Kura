# Prueba del panel admin

Esta guía es para probar MediMind desde la cuenta administradora antes de cerrar
V1.

## Cuenta admin

El panel admin aparece si inicias sesión con:

- `KingGhidorahX12@gmail.com`
- `kingghidorahx12@gmail.com`

La app también reconoce `KingGhidorahX12` como identificador interno.

## Qué debe mostrar

En Perfiles, debajo de Cuenta, debe aparecer `Panel admin` con:

- Usuarios.
- Usuarios activos.
- Perfiles.
- Tratamientos.
- Medicamentos.
- Dosis registradas.
- Completadas.
- Omitidas.
- Última actividad o última actualización del panel.

Los datos remotos salen de Firestore:

- `users/{uid}`
- `usageSnapshots/{uid}`

## Flujo de prueba recomendado

1. Instala la APK preview.
2. Crea o inicia sesión con `KingGhidorahX12@gmail.com`.
3. Crea un perfil.
4. Agrega una receta con al menos un medicamento.
5. Activa alarmas.
6. Marca una dosis como completada.
7. Entra a Perfiles.
8. Toca `Actualizar` en el Panel admin.
9. Verifica que suban perfiles, tratamientos, medicamentos y dosis.

## Prueba con otro usuario

1. Cierra sesión.
2. Crea una cuenta diferente.
3. Crea un perfil y una receta.
4. Cierra sesión.
5. Entra otra vez con la cuenta admin.
6. Toca `Actualizar`.
7. Debe aumentar el conteo de usuarios y actividad.

## Si no aparecen datos remotos

Revisa:

1. Que Firebase Authentication esté usando la cuenta admin real.
2. Que Firestore tenga reglas de admin como en `FIREBASE_SETUP.md`.
3. Que existan documentos en `users` y `usageSnapshots`.
4. Que el dispositivo tenga internet.
5. Que App Check no esté en enforcement antes de configurarlo en la APK.
