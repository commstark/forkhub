import "server-only"

export type PreviewData =
  | { type: "excel";   rows: (string | number | boolean | null)[][] }
  | { type: "zip";     entries: { path: string; size: number; isDir: boolean }[] }
  | { type: "docx";    html: string }
  | { type: "ipynb";   cells: { kind: "code" | "markdown"; source: string }[] }

function getExt(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() ?? ""
}

export async function generatePreviewData(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<PreviewData | null> {
  const ext = getExt(fileName)

  // ── Excel ─────────────────────────────────────────────────────────────────
  if (ext === "xlsx" || ext === "xls" ||
      mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      mimeType === "application/vnd.ms-excel") {
    try {
      const XLSX = await import("xlsx")
      const wb   = XLSX.read(buffer, { type: "buffer" })
      const ws   = wb.Sheets[wb.SheetNames[0]]
      const raw  = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(ws, {
        header: 1,
        defval: null,
      })
      const rows = (raw as (string | number | boolean | null)[][])
        .slice(0, 100)
        .map((row) => row.slice(0, 20))
      return { type: "excel", rows }
    } catch (e) {
      console.error("Excel preview failed:", e)
      return null
    }
  }

  // ── ZIP ───────────────────────────────────────────────────────────────────
  if (ext === "zip" || mimeType === "application/zip" || mimeType === "application/x-zip-compressed") {
    try {
      const AdmZip = (await import("adm-zip")).default
      const zip    = new AdmZip(buffer)
      const entries = zip.getEntries().map((e) => ({
        path:  e.entryName,
        size:  e.header.size,
        isDir: e.isDirectory,
      }))
      return { type: "zip", entries }
    } catch (e) {
      console.error("ZIP preview failed:", e)
      return null
    }
  }

  // ── Word (.docx) ──────────────────────────────────────────────────────────
  if (ext === "docx" ||
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    try {
      const mammoth = await import("mammoth")
      const result  = await mammoth.convertToHtml({ buffer })
      return { type: "docx", html: result.value }
    } catch (e) {
      console.error("DOCX preview failed:", e)
      return null
    }
  }

  // ── Jupyter Notebook ──────────────────────────────────────────────────────
  if (ext === "ipynb") {
    try {
      const notebook = JSON.parse(buffer.toString("utf-8"))
      type NbCell = { cell_type: string; source: string | string[] }
      const cells: { kind: "code" | "markdown"; source: string }[] = []
      for (const cell of (notebook.cells ?? []) as NbCell[]) {
        if (cell.cell_type === "code" || cell.cell_type === "markdown") {
          const source = Array.isArray(cell.source)
            ? cell.source.join("")
            : (cell.source ?? "")
          cells.push({ kind: cell.cell_type as "code" | "markdown", source })
        }
      }
      return { type: "ipynb", cells }
    } catch (e) {
      console.error("Notebook preview failed:", e)
      return null
    }
  }

  return null
}
