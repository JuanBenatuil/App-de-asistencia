export function ModeSwitcher({ mode, setMode }) {
  return (
    <section className="switcher">
      <button className={mode === "teacher" ? "active" : ""} type="button" onClick={() => setMode("teacher")}>
        Modo docente
      </button>
      <button className={mode === "student" ? "active" : ""} type="button" onClick={() => setMode("student")}>
        Modo estudiante
      </button>
    </section>
  );
}
