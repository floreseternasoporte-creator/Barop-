# Configuración de Vercel Serverless

## Arquitectura
- **Firebase**: Solo autenticación (Auth).
- **AWS S3**: Datos + imágenes.
- **AWS SES**: Emails.
- **Vercel Functions**: Serverless API.

## Variables de Entorno

```bash
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION
AWS_S3_BUCKET
SUPPORT_EMAIL
GROQ_API_KEY
```

## Endpoints API

- `api/notes.js`
- `api/community-notes.js`
- `api/likes.js`
- `api/following.js`
- `api/notifications.js`
- `api/scheduled-chapters.js`
- `api/user-stats.js`
- `api/users.js`
- `api/upload-image.js`
- `api/send-support-email.js`
- `api/index.js` (router principal)

## Desarrollo

```bash
npm install
vercel dev
```

## Estado

- Runtime objetivo: **Vercel**.
- Persistencia: AWS S3 a través de APIs serverless.
- Firebase Realtime Database no se usa como datastore principal.
