# Auditoría de infraestructura (Firebase vs AWS vs Cloudflare)

## Resultado corto
- **Firebase**: solo autenticación (Auth).
- **Datos tipo Realtime DB**: ahora se enrutan por un **bridge en AWS S3** vía `/api/realtime-db`.
- **Runtime de despliegue**: Cloudflare.

## Qué se cambió
1. Se retiró el SDK `firebase-database-compat` del frontend.
2. Se añadió un bridge `firebase.database()` en cliente que usa `/api/realtime-db`.
3. Se añadió el handler `lib/handlers/realtime-db.js` para persistencia jerárquica en S3.
4. El routing catch-all de Cloudflare (`api/[...].js` y `api/[...path].js`) ahora incluye `realtime-db`.

## Conclusión técnica
Ya no depende de Firebase Realtime Database como servicio. El patrón de llamadas se mantiene (compatibilidad de código), pero la persistencia real está en AWS (S3) detrás de APIs en Cloudflare.
