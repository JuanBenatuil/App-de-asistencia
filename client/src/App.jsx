import { Hero } from "./components/Hero";
import { ModeSwitcher } from "./components/ModeSwitcher";
import { StudentPanel } from "./components/StudentPanel";
import { TeacherPanel } from "./components/TeacherPanel";
import { useAttendanceApp } from "./hooks/useAttendanceApp";

export default function App() {
  const app = useAttendanceApp();

  return (
    <main className="app-shell">
      <Hero />
      <ModeSwitcher mode={app.mode} setMode={app.setMode} />

      {app.mode === "teacher" ? (
        <TeacherPanel
          sessionForm={app.sessionForm}
          setSessionForm={app.setSessionForm}
          createSession={app.createSession}
          canCreateSession={app.canCreateSession}
          loading={app.loading}
          sessionError={app.sessionError}
          sessionResult={app.sessionResult}
          qrDataUrl={app.qrDataUrl}
        />
      ) : (
        <StudentPanel
          attendanceSessionId={app.attendanceSessionId}
          setAttendanceSessionId={app.setAttendanceSessionId}
          attendanceForm={app.attendanceForm}
          setAttendanceForm={app.setAttendanceForm}
          submitAttendance={app.submitAttendance}
          loading={app.loading}
          attendanceMessage={app.attendanceMessage}
          attendanceError={app.attendanceError}
        />
      )}
    </main>
  );
}
