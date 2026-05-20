"""File I/O and artifact rendering."""

import re
from pathlib import Path

from fpdf import FPDF


class FileService:
    """Handles artifact file writing and rendering."""

    def __init__(self, artifact_root: Path):
        self.artifact_root = artifact_root

    def write_md(self, relative_path: str, md_content: str) -> Path:
        """Write markdown content to a file under artifact_root. Returns the full path."""
        full_path = self.artifact_root / relative_path
        full_path.parent.mkdir(parents=True, exist_ok=True)
        full_path.write_text(md_content)
        return full_path

    def write_pdf(self, relative_path: str, md_content: str) -> Path:
        """Render markdown content to PDF and write under artifact_root. Returns the full path."""
        _REPLACEMENTS = {'—': '-', '–': '-', '\u2019': "'", '\u2018': "'", '\u201c': '"', '\u201d': '"', '\u2022': '*', '\u2026': '...'}

        def _sanitize(text: str) -> str:
            for src, dst in _REPLACEMENTS.items():
                text = text.replace(src, dst)
            return text.encode('latin-1', errors='replace').decode('latin-1')

        pdf = FPDF()
        pdf.set_margins(25, 25, 25)
        pdf.add_page()
        pdf.set_auto_page_break(auto=False)
        w = pdf.w - pdf.l_margin - pdf.r_margin

        def cell(text: str, h: float = 5.5, align: str = 'L') -> None:
            pdf.multi_cell(w, h, text, align=align)

        for line in md_content.splitlines():
            if line.strip() in ('---', '***', '___'):
                pdf.set_draw_color(180, 180, 180)
                pdf.line(pdf.l_margin, pdf.get_y(), pdf.l_margin + w, pdf.get_y())
                pdf.ln(4)
            elif line.startswith('### '):
                pdf.set_font('Helvetica', 'B', 12)
                cell(_sanitize(line[4:]), 6.5, 'L')
                pdf.ln(1)
            elif line.startswith('## '):
                pdf.set_font('Helvetica', 'B', 14)
                cell(_sanitize(line[3:]), 7.5, 'L')
                pdf.ln(2)
            elif line.startswith('# '):
                pdf.set_font('Helvetica', 'B', 16)
                cell(_sanitize(line[2:]), 9, 'L')
                pdf.ln(1)
                pdf.set_draw_color(180, 180, 180)
                pdf.line(pdf.l_margin, pdf.get_y(), pdf.l_margin + w, pdf.get_y())
                pdf.ln(4)
            elif line.startswith('- ') or line.startswith('* '):
                pdf.set_font('Helvetica', '', 10)
                clean = re.sub(r'\*\*(.+?)\*\*', r'\1', line[2:])
                clean = re.sub(r'\*(.+?)\*', r'\1', clean)
                cell(f'*  {_sanitize(clean)}', align='L')
            elif line.strip() == '':
                pdf.ln(4)
            else:
                clean = re.sub(r'\*\*(.+?)\*\*', r'\1', line)
                clean = re.sub(r'\*(.+?)\*', r'\1', clean)
                pdf.set_font('Helvetica', '', 10)
                cell(_sanitize(clean))

        full_path = self.artifact_root / relative_path
        full_path.parent.mkdir(parents=True, exist_ok=True)
        pdf.output(str(full_path))
        return full_path
