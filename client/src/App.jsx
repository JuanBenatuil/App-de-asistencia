import { useMemo, useState } from "react";
import QRCode from "qrcode";

const API_URL = "http://localhost:8787";

const initialSessionForm = {
  instructorKey: "",
  classroomName: "Sala A-101",
  classroomLat: "",
  classroomLng: "",
  radiusMeters: "50",
  durationMinutes: "20",
};

const initialAttendanceForm = {
  studentId: "",
  fullName: "",
  email: "",
};

function getSessionIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("s") || "";
}

async function getCurrentPosition() {
  if (!navigator.geolocation) {
    throw new Error("Tu navegador no soporta geolocalizacion.");
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve(position.coords);
      },
      () => reject(new Error("No fue posible obtener tu ubicacion.")),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  });
}

export default function App() {
  const [mode, setMode] = useState(getSessionIdFromUrl() ? "student" : "teacher");
  const [sessionForm, setSessionForm] = useState(initialSessionForm);
  const [sessionResult, setSessionResult] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [sessionError, setSessionError] = useState("");
  const [attendanceForm, setAttendanceForm] = useState(initialAttendanceForm);
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

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "No se pudo crear la sesion.");
      }

      setSessionResult(data);
      setAttendanceSessionId(data.sessionId);
      const qr = await QRCode.toDataURL(data.joinUrl, {
        margin: 1,
        width: 280,
      });
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

      const challengeRes = await fetch(`${API_URL}/api/sessions/${attendanceSessionId}/challenge`);
      const challengeData = await challengeRes.json();

      if (!challengeRes.ok) {
        throw new Error(challengeData.error || "No se pudo validar la sesion activa.");
      }

      const attendanceRes = await fetch(`${API_URL}/api/attendance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: attendanceSessionId,
          studentId: attendanceForm.studentId,
          fullName: attendanceForm.fullName,
          email: attendanceForm.email,
          challenge: challengeData.challenge,
          location: {
            lat: coords.latitude,
            lng: coords.longitude,
            accuracy: coords.accuracy,
          },
        }),
      });

      const attendanceData = await attendanceRes.json();
      if (!attendanceRes.ok) {
        throw new Error(attendanceData.error || "No fue posible registrar asistencia.");
      }

      setAttendanceMessage("Asistencia registrada correctamente. Ya quedaste marcado en la clase.");
      setAttendanceForm(initialAttendanceForm);
    } catch (error) {
      setAttendanceError(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">Asistencia segura presencial</p>
        <h1>Curso Masivo - 120 personas</h1>
        <p>
          El registro exige geolocalizacion dentro del aula y challenge temporal para reducir registros
          remotos.
        </p>
      </section>

      <section className="switcher">
        <button
          className={mode === "teacher" ? "active" : ""}
          type="button"
          onClick={() => setMode("teacher")}
        >
          Modo docente
        </button>
        <button
          className={mode === "student" ? "active" : ""}
          type="button"
          onClick={() => setMode("student")}
        >
          Modo estudiante
        </button>
      </section>

      {mode === "teacher" ? (
        <section className="card">
          <h2>Crear sesion de asistencia</h2>
          <form onSubmit={createSession}>
            <label>
              Clave docente
              <input
                required
                type="password"
                value={sessionForm.instructorKey}
                onChange={(event) =>
                  setSessionForm((prev) => ({ ...prev, instructorKey: event.target.value }))
                }
              />
            </label>
            <label>
              Nombre del aula
              <input
                required
                value={sessionForm.classroomName}
                onChange={(event) =>
                  setSessionForm((prev) => ({ ...prev, classroomName: event.target.value }))
                }
              />
            </label>
            <label>
              Latitud del aula
              <input
                required
                type="number"
                step="0.000001"
                value={sessionForm.classroomLat}
                onChange={(event) =>
                  setSessionForm((prev) => ({ ...prev, classroomLat: event.target.value }))
                }
              />
            </label>
            <label>
              Longitud del aula
              <input
                required
                type="number"
                step="0.000001"
                value={sessionForm.classroomLng}
                onChange={(event) =>
                  setSessionForm((prev) => ({ ...prev, classroomLng: event.target.value }))
                }
              />
            </label>
            <label>
              Radio permitido (m)
              <input
                required
                type="number"
                min="10"
                max="200"
                value={sessionForm.radiusMeters}
                onChange={(event) =>
                  setSessionForm((prev) => ({ ...prev, radiusMeters: event.target.value }))
                }
              />
            </label>
            <label>
              Duracion (min)
              <input
                required
                type="number"
                min="5"
                max="240"
                value={sessionForm.durationMinutes}
                onChange={(event) =>
                  setSessionForm((prev) => ({ ...prev, durationMinutes: event.target.value }))
                }
              />
            </label>
            <button disabled={!canCreateSession || loading} type="submit">
              {loading ? "Creando..." : "Generar sesion y QR"}
            </button>
          </form>

          {sessionError ? <p className="error">{sessionError}</p> : null}

          {sessionResult ? (
            <div className="result">
              <p>
                <strong>Session ID:</strong> {sessionResult.sessionId}
              </p>
              <p>
                <strong>Link de acceso:</strong>
              </p>
              <a href={sessionResult.joinUrl} rel="noreferrer" target="_blank">
                {sessionResult.joinUrl}
              </a>
              {qrDataUrl ? <img alt="Codigo QR de asistencia" src={qrDataUrl} /> : null}
            </div>
          ) : null}
        </section>
      ) : (
        <section className="card">
          <h2>Registrar asistencia</h2>
          <form onSubmit={submitAttendance}>
            <label>
              Session ID
              <input
                required
                value={attendanceSessionId}
                onChange={(event) => setAttendanceSessionId(event.target.value)}
              />
            </label>
            <label>
              ID de estudiante
              <input
                required
                value={attendanceForm.studentId}
                onChange={(event) =>
                  setAttendanceForm((prev) => ({ ...prev, studentId: event.target.value }))
                }
              />
            </label>
            <label>
              Nombre completo
              <input
                required
                value={attendanceForm.fullName}
                onChange={(event) =>
                  setAttendanceForm((prev) => ({ ...prev, fullName: event.target.value }))
                }
              />
            </label>
            <label>
              Correo institucional
              <input
                required
                type="email"
                value={attendanceForm.email}
                onChange={(event) =>
                  setAttendanceForm((prev) => ({ ...prev, email: event.target.value }))
                }
              />
            </label>
            <button disabled={loading} type="submit">
              {loading ? "Validando presencia..." : "Marcar asistencia"}
            </button>
          </form>

          {attendanceMessage ? <p className="ok">{attendanceMessage}</p> : null}
          {attendanceError ? <p className="error">{attendanceError}</p> : null}
        </section>
      )}
    </main>
  );
}
