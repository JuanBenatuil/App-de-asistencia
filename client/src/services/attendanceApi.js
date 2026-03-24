import { API_URL } from "../config/env";

async function parseResponse(response, fallbackMessage) {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || fallbackMessage);
  }

  return data;
}

export async function createSessionRequest(sessionForm) {
  const response = await fetch(`${API_URL}/api/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-instructor-key": sessionForm.instructorKey,
    },
    body: JSON.stringify({
      classroomName: sessionForm.classroomName,
      classroomLat: Number(sessionForm.classroomLat),
      classroomLng: Number(sessionForm.classroomLng),
      radiusMeters: Number(sessionForm.radiusMeters),
      durationMinutes: Number(sessionForm.durationMinutes),
    }),
  });

  return parseResponse(response, "No se pudo crear la sesion.");
}

export async function getSessionChallengeRequest(sessionId) {
  const response = await fetch(`${API_URL}/api/sessions/${sessionId}/challenge`);
  return parseResponse(response, "No se pudo validar la sesion activa.");
}

export async function submitAttendanceRequest({
  sessionId,
  attendanceForm,
  challenge,
  coords,
}) {
  const response = await fetch(`${API_URL}/api/attendance`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sessionId,
      studentId: attendanceForm.studentId,
      fullName: attendanceForm.fullName,
      email: attendanceForm.email,
      challenge,
      location: {
        lat: coords.latitude,
        lng: coords.longitude,
        accuracy: coords.accuracy,
      },
    }),
  });

  return parseResponse(response, "No fue posible registrar asistencia.");
}
