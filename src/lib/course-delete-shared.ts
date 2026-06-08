export interface CourseDeletePreview {
  id: string;
  title: string;
  active: boolean;
  counts: {
    assignments: number;
    trainingAttempts: number;
    certificates: number;
  };
  hasDependencies: boolean;
}

export interface MasterCourseDeletePreview {
  id: string;
  title: string;
  status: string;
  counts: {
    provisions: number;
    companyCourses: number;
    assignments: number;
    trainingAttempts: number;
    certificates: number;
  };
  hasDependencies: boolean;
}

export type CourseDeletePreviewData =
  | ({ kind: "course" } & CourseDeletePreview)
  | ({ kind: "master" } & MasterCourseDeletePreview);

export const COURSE_PERMANENT_DELETE_WARNING =
  "Dieses Seminar kann bereits Zuweisungen, Prüfungsversuche, Zertifikate oder Nachweise enthalten. Beim endgültigen Löschen können historische Daten verloren gehen oder unvollständig werden. Dieser Vorgang kann nicht rückgängig gemacht werden.";

export const MASTER_COURSE_PERMANENT_DELETE_WARNING =
  "Dieser Masterkurs kann bereits an Firmen bereitgestellt sein und mit Zuweisungen, Prüfungsversuchen, Zertifikaten oder Nachweisen verknüpft sein. Beim endgültigen Löschen wird nur die Master-Vorlage entfernt; bestehende Firmenkurse bleiben erhalten, verlieren aber die Verknüpfung zum Master. Historische Nachweise an Firmenkursen können betroffen sein. Dieser Vorgang kann nicht rückgängig gemacht werden.";
