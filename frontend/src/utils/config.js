import config from '../config.json';

export function getSourceUrls() {
  const studentUrl = localStorage.getItem('google_sheets_student_url') || config.DEFAULT_STUDENT_URL;
  const attendanceUrl = localStorage.getItem('google_sheets_attendance_url') || config.DEFAULT_ATTENDANCE_URL;
  return {
    studentUrl,
    attendanceUrl
  };
}

export function saveSourceUrls(studentUrl, attendanceUrl) {
  localStorage.setItem('google_sheets_student_url', studentUrl || '');
  localStorage.setItem('google_sheets_attendance_url', attendanceUrl || '');
}
