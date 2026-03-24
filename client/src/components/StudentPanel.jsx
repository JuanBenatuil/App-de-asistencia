function updateAttendanceField(setAttendanceForm, field, value) {
  setAttendanceForm((prev) => ({ ...prev, [field]: value }));
}

export function StudentPanel({
  attendanceSessionId,
  setAttendanceSessionId,
  attendanceForm,
  setAttendanceForm,
  submitAttendance,
  loading,
  attendanceMessage,
  attendanceError,
}) {
  return (
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
            onChange={(event) => updateAttendanceField(setAttendanceForm, "studentId", event.target.value)}
          />
        </label>
        <label>
          Nombre completo
          <input
            required
            value={attendanceForm.fullName}
            onChange={(event) => updateAttendanceField(setAttendanceForm, "fullName", event.target.value)}
          />
        </label>
        <label>
          Correo institucional
          <input
            required
            type="email"
            value={attendanceForm.email}
            onChange={(event) => updateAttendanceField(setAttendanceForm, "email", event.target.value)}
          />
        </label>
        <button disabled={loading} type="submit">
          {loading ? "Validando presencia..." : "Marcar asistencia"}
        </button>
      </form>

      {attendanceMessage ? <p className="ok">{attendanceMessage}</p> : null}
      {attendanceError ? <p className="error">{attendanceError}</p> : null}
    </section>
  );
}
