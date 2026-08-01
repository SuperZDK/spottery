import client from "./client"

export type ImportMode = "incremental" | "resync" | "full_rebuild" | "test"
export type ImportPhase = "A" | "B" | "AB"
export type ImportJobStatus = "idle" | "running" | "done" | "failed" | "stopped"

export interface ImportJob {
  id: string | null
  mode: ImportMode | null
  phase: ImportPhase | null
  status: ImportJobStatus
  stage: string | null
  done: number
  total: number
  counts: Record<string, number | null> | null
  error: string | null
  started_at: string | null
  finished_at: string | null
  data_dir: string
}

export interface ImportInfo {
  data_dir: string
  data_dir_exists: boolean
  daily_files: number
  matches_files: number
  confirm_phrase: string
  test_max_files: number
  tables: Record<string, number>
  last_job: ImportJob
}

export const adminApi = {
  info: () => client.get<ImportInfo>("/admin/import/info").then((r) => r.data),

  start: (mode: ImportMode, phase?: ImportPhase, confirm?: string) =>
    client
      .post<ImportJob>("/admin/import/start", { mode, phase, confirm })
      .then((r) => r.data),

  stop: () => client.post<ImportJob>("/admin/import/stop").then((r) => r.data),

  status: () => client.get<ImportJob>("/admin/import/status").then((r) => r.data),
}
