import cors from "cors";
import crypto from "node:crypto";
import dotenv from "dotenv";
import express from "express";
import { z } from "zod";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 8787);
const instructorSecret = process.env.INSTRUCTOR_SECRET || "dev-secret";
const signingSecret = process.env.SESSION_SIGNING_SECRET || "dev-signing-secret";
const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const maxGpsAccuracyMeters = Number(process.env.MAX_GPS_ACCURACY_METERS || 80);
const airtableWebhookUrl = process.env.AIRTABLE_WEBHOOK_URL || "";

app.use(cors({ origin: clientOrigin }));
app.use(express.json());

const sessions = new Map();

const createSessionSchema = z.object({
  classroomName: z.string().min(2).max(100),
  classroomLat: z.number().min(-90).max(90),
  classroomLng: z.number().min(-180).max(180),
  radiusMeters: z.number().min(10).max(200),
  durationMinutes: z.number().min(5).max(240),
});

const attendanceSchema = z.object({
  sessionId: z.string().min(8),
  studentId: z.string().min(1).max(40),
  fullName: z.string().min(2).max(120),
  email: z.string().email(),
  challenge: z.string().min(20),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    accuracy: z.number().min(0).max(5000),
  }),
});

function hashChallenge(sessionId, timeStep) {
  return crypto
    .createHmac("sha256", signingSecret)
    .update(`${sessionId}:${timeStep}`)
    .digest("hex");
}

function isChallengeValid(sessionId, challenge) {
  const nowStep = Math.floor(Date.now() / 30000);
  const accepted = [nowStep, nowStep - 1].map((step) => hashChallenge(sessionId, step));
  return accepted.includes(challenge);
}

function toRad(value) {
  return (value * Math.PI) / 180;
}

function distanceInMeters(aLat, aLng, bLat, bLng) {
  const earthRadius = 6371000;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);

  const p =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(p), Math.sqrt(1 - p));
  return earthRadius * c;
}

async function forwardToAirtable(payload) {
  if (!airtableWebhookUrl) {
    return;
  }

  try {
    const response = await fetch(airtableWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error("Webhook Airtable devolvio estado no exitoso", response.status);
    }
  } catch (error) {
    console.error("Error enviando asistencia al webhook de Airtable", error);
  }
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, now: new Date().toISOString() });
});

app.post("/api/sessions", (req, res) => {
  const key = req.header("x-instructor-key");
  if (key !== instructorSecret) {
    return res.status(401).json({ error: "Clave docente invalida" });
  }

  const parsed = createSessionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Datos de sesion invalidos", details: parsed.error.flatten() });
  }

  const id = crypto.randomUUID();
  const startsAt = Date.now();
  const endsAt = startsAt + parsed.data.durationMinutes * 60 * 1000;

  sessions.set(id, {
    id,
    ...parsed.data,
    startsAt,
    endsAt,
    attendees: new Map(),
  });

  const joinUrl = `${clientOrigin}?s=${id}`;
  return res.status(201).json({
    sessionId: id,
    joinUrl,
    startsAt,
    endsAt,
  });
});

app.get("/api/sessions/:id/challenge", (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) {
    return res.status(404).json({ error: "Sesion no encontrada" });
  }

  if (Date.now() > session.endsAt) {
    return res.status(410).json({ error: "Sesion finalizada" });
  }

  const timeStep = Math.floor(Date.now() / 30000);
  const challenge = hashChallenge(session.id, timeStep);
  return res.json({
    challenge,
    validForSeconds: 30,
    classroomName: session.classroomName,
    sessionEndsAt: session.endsAt,
  });
});

app.post("/api/attendance", async (req, res) => {
  const parsed = attendanceSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Datos de asistencia invalidos", details: parsed.error.flatten() });
  }

  const data = parsed.data;
  const session = sessions.get(data.sessionId);
  if (!session) {
    return res.status(404).json({ error: "Sesion no encontrada" });
  }

  const now = Date.now();
  if (now > session.endsAt) {
    return res.status(410).json({ error: "La sesion ya finalizo" });
  }

  if (!isChallengeValid(session.id, data.challenge)) {
    return res.status(401).json({ error: "Challenge invalido o expirado" });
  }

  if (data.location.accuracy > maxGpsAccuracyMeters) {
    return res.status(400).json({
      error: "Precision de GPS insuficiente para validar presencia",
      requiredMaxAccuracyMeters: maxGpsAccuracyMeters,
      yourAccuracyMeters: data.location.accuracy,
    });
  }

  const distance = distanceInMeters(
    session.classroomLat,
    session.classroomLng,
    data.location.lat,
    data.location.lng,
  );

  if (distance > session.radiusMeters) {
    return res.status(403).json({
      error: "Estas fuera del radio permitido del aula",
      distanceMeters: Math.round(distance),
      allowedRadiusMeters: session.radiusMeters,
    });
  }

  const normalizedKey = `${data.studentId.trim().toLowerCase()}::${data.email.trim().toLowerCase()}`;
  if (session.attendees.has(normalizedKey)) {
    return res.status(409).json({ error: "Asistencia ya registrada para este estudiante" });
  }

  const attendanceRecord = {
    sessionId: session.id,
    classroomName: session.classroomName,
    studentId: data.studentId.trim(),
    fullName: data.fullName.trim(),
    email: data.email.trim().toLowerCase(),
    distanceMeters: Math.round(distance),
    gpsAccuracyMeters: Math.round(data.location.accuracy),
    submittedAt: new Date().toISOString(),
    userAgent: req.header("user-agent") || "unknown",
  };

  session.attendees.set(normalizedKey, attendanceRecord);
  await forwardToAirtable({ type: "attendance.created", payload: attendanceRecord });

  return res.status(201).json({ ok: true, attendance: attendanceRecord });
});

app.get("/api/sessions/:id/summary", (req, res) => {
  const key = req.header("x-instructor-key");
  if (key !== instructorSecret) {
    return res.status(401).json({ error: "Clave docente invalida" });
  }

  const session = sessions.get(req.params.id);
  if (!session) {
    return res.status(404).json({ error: "Sesion no encontrada" });
  }

  const attendees = Array.from(session.attendees.values());
  return res.json({
    sessionId: session.id,
    classroomName: session.classroomName,
    totalAttendees: attendees.length,
    endsAt: session.endsAt,
    attendees,
  });
});

app.listen(port, () => {
  console.log(`Attendance server running on http://localhost:${port}`);
});
