# App de Asistencia Presencial (120 estudiantes)

Web app liviana para registrar asistencia en cursos masivos, con controles de presencia fisica en sala.

## Que incluye este MVP

- Frontend React para:
  - Modo docente: crear sesion, generar link y QR.
  - Modo estudiante: registrar asistencia con geolocalizacion.
- Backend Node + Express para:
  - Crear sesiones con duracion y radio permitido.
  - Validar challenge temporal (rota cada 30 segundos).
  - Validar posicion GPS y precision del dispositivo.
  - Evitar doble registro por estudiante.
  - Reenviar asistencia a Airtable por webhook (sin exponer tokens en el cliente).

## Arquitectura de seguridad presencial

Este MVP combina varias barreras:

1. **Sesion corta** (ejemplo 20 minutos).
2. **Challenge temporal** (expira en 30 segundos) para evitar uso de capturas viejas.
3. **Geocerca del aula** (lat/lng + radio en metros).
4. **Precision minima de GPS** (rechaza ubicaciones con baja calidad).
5. **Clave docente** para crear y consultar sesiones.

> Nota: Ningun mecanismo web es infalible al 100%, pero esta combinacion sube mucho la dificultad de marcar asistencia desde casa.

## Requisitos

- Node.js 18+
- npm 9+

## Instalacion

```bash
npm install
```

## Configuracion

1. Copia el archivo de ejemplo:

```bash
copy server\\.env.example server\\.env
```

2. Edita `server/.env`:

- `INSTRUCTOR_SECRET`: clave del docente.
- `SESSION_SIGNING_SECRET`: secreto interno para challenge.
- `CLIENT_ORIGIN`: URL del frontend (default `http://localhost:5173`).
- `AIRTABLE_WEBHOOK_URL`: opcional, URL de automation webhook en Airtable.

## Ejecucion en desarrollo

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8787`

## Flujo de uso

### Docente

1. Abre la app en modo docente.
2. Ingresa clave docente.
3. Define aula (lat/lng), radio y duracion.
4. Genera sesion y proyecta el QR/link en la sala.

### Estudiante

1. Escanea QR o abre link.
2. Completa datos.
3. Autoriza geolocalizacion.
4. Se registra asistencia si cumple reglas de presencia.

## Integracion con Airtable (sin API key en frontend)

Como no tienes token API aun, usa **Airtable Automation + Webhook**:

1. En Airtable, crea una automation con trigger `When webhook is received`.
2. Copia la URL del webhook en `AIRTABLE_WEBHOOK_URL`.
3. En la automation, agrega accion para crear un registro en tu tabla de asistencia con los campos del payload.

Payload enviado por servidor:

- `sessionId`
- `classroomName`
- `studentId`
- `fullName`
- `email`
- `distanceMeters`
- `gpsAccuracyMeters`
- `submittedAt`
- `userAgent`

## Endpoints principales

- `POST /api/sessions` (requiere header `x-instructor-key`)
- `GET /api/sessions/:id/challenge`
- `POST /api/attendance`
- `GET /api/sessions/:id/summary` (requiere header `x-instructor-key`)

## Siguientes mejoras recomendadas

1. Persistencia en base de datos (PostgreSQL/SQLite) en vez de memoria.
2. Login institucional (SSO Google/Microsoft).
3. Deteccion de red del campus (Wi-Fi) como factor adicional.
4. Auditoria y exportacion CSV/PDF.
5. Panel docente con lista en vivo de asistentes.
