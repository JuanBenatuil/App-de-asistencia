function updateSessionField(setSessionForm, field, value) {
  setSessionForm((prev) => ({ ...prev, [field]: value }));
}

export function TeacherPanel({
  sessionForm,
  setSessionForm,
  createSession,
  canCreateSession,
  loading,
  sessionError,
  sessionResult,
  qrDataUrl,
}) {
  return (
    <section className="card">
      <h2>Crear sesion de asistencia</h2>
      <form onSubmit={createSession}>
        <label>
          Clave docente
          <input
            required
            type="password"
            value={sessionForm.instructorKey}
            onChange={(event) => updateSessionField(setSessionForm, "instructorKey", event.target.value)}
          />
        </label>
        <label>
          Nombre del aula
          <input
            required
            value={sessionForm.classroomName}
            onChange={(event) => updateSessionField(setSessionForm, "classroomName", event.target.value)}
          />
        </label>
        <label>
          Latitud del aula
          <input
            required
            type="number"
            step="0.000001"
            value={sessionForm.classroomLat}
            onChange={(event) => updateSessionField(setSessionForm, "classroomLat", event.target.value)}
          />
        </label>
        <label>
          Longitud del aula
          <input
            required
            type="number"
            step="0.000001"
            value={sessionForm.classroomLng}
            onChange={(event) => updateSessionField(setSessionForm, "classroomLng", event.target.value)}
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
            onChange={(event) => updateSessionField(setSessionForm, "radiusMeters", event.target.value)}
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
            onChange={(event) => updateSessionField(setSessionForm, "durationMinutes", event.target.value)}
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
  );
}
