import { useMemo, useState } from "react";
import { INITIAL_ATTENDANCE_FORM, INITIAL_SESSION_FORM } from "../constants/forms";
import {
  createSessionRequest,
  getSessionChallengeRequest,
  submitAttendanceRequest,
} from "../services/attendanceApi";
import { getCurrentPosition } from "../utils/location";
import { generateSessionQrDataUrl } from "../utils/qr";
import { getSessionIdFromUrl } from "../utils/url";

export function useAttendanceApp() {
  const [mode, setMode] = useState(getSessionIdFromUrl() ? "student" : "teacher");
  const [sessionForm, setSessionForm] = useState(INITIAL_SESSION_FORM);
  const [sessionResult, setSessionResult] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [sessionError, setSessionError] = useState("");
  const [attendanceForm, setAttendanceForm] = useState(INITIAL_ATTENDANCE_FORM);
  const [attendanceSessionId, setAttendanceSessionId] = useState(getSessionIdFromUrl());
  const [attendanceMessage, setAttendanceMessage] = useState("");
  const [attendanceError, setAttendanceError] = useState("");
  const [loading, setLoading] = useState(false);

  const canCreateSession = useMemo(() => {
    return (
      sessionForm.instructorKey.trim() &&
      sessionForm.classroomName.trim() &&
      sessionForm.classroomLat.trim() &&
      sessionForm.classroomLng.trim() &&
      sessionForm.radiusMeters.trim() &&
      sessionForm.durationMinutes.trim()
    );
  }, [sessionForm]);

  async function createSession(event) {
    event.preventDefault();
    setSessionError("");
    setSessionResult(null);
    setQrDataUrl("");

    try {
      setLoading(true);
      const sessionData = await createSessionRequest(sessionForm);
      setSessionResult(sessionData);
      setAttendanceSessionId(sessionData.sessionId);
      const qr = await generateSessionQrDataUrl(sessionData.joinUrl);
      setQrDataUrl(qr);
    } catch (error) {
      setSessionError(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitAttendance(event) {
    event.preventDefault();
    setAttendanceError("");
    setAttendanceMessage("");

    try {
      if (!attendanceSessionId.trim()) {
        throw new Error("Debes ingresar o escanear un ID de sesion.");
      }

      setLoading(true);
      const coords = await getCurrentPosition();
      const challengeData = await getSessionChallengeRequest(attendanceSessionId);

      await submitAttendanceRequest({
        sessionId: attendanceSessionId,
        attendanceForm,
        challenge: challengeData.challenge,
        coords,
      });

      setAttendanceMessage("Asistencia registrada correctamente. Ya quedaste marcado en la clase.");
      setAttendanceForm(INITIAL_ATTENDANCE_FORM);
    } catch (error) {
      setAttendanceError(error.message);
    } finally {
      setLoading(false);
    }
  }

  return {
    mode,
    setMode,
    sessionForm,
    setSessionForm,
    sessionResult,
    qrDataUrl,
    sessionError,
    attendanceForm,
    setAttendanceForm,
    attendanceSessionId,
    setAttendanceSessionId,
    attendanceMessage,
    attendanceError,
    loading,
    canCreateSession,
    createSession,
    submitAttendance,
  };
}
