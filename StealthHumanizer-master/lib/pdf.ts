export interface PDFExportOptions {
  title: string;
  originalText: string;
  humanizedText: string;
  scores?: {
    localScore?: number | null;
    gptzeroOriginal?: number | null;
    gptzeroHumanized?: number | null;
  };
  date: string;
}

export async function generatePDF(options: PDFExportOptions): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const maxWidth = pageWidth - margin * 2;
  let y = 20;

  const addWrappedText = (text: string, fontSize: number, color: [number, number, number] = [0, 0, 0]) => {
    doc.setFontSize(fontSize);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, margin, y);
    y += lines.length * (fontSize * 0.4) + 4;
    if (y > 270) { doc.addPage(); y = 20; }
  };

  addWrappedText(options.title, 18, [99, 102, 241]);
  addWrappedText(options.date, 9, [120, 120, 120]);
  y += 4;

  addWrappedText('Original Text', 13, [60, 60, 60]);
  addWrappedText(options.originalText || '(no original text)', 10);
  y += 4;

  addWrappedText('Humanized Text', 13, [60, 60, 60]);
  addWrappedText(options.humanizedText, 10);
  y += 4;

  const scores = options.scores;
  if (scores?.localScore != null || scores?.gptzeroOriginal != null || scores?.gptzeroHumanized != null) {
    addWrappedText('Detection Scores', 13, [60, 60, 60]);
    if (scores.localScore != null) addWrappedText(`Local Estimate — Original: AI, Humanized: ~${scores.localScore}% human`, 10);
    if (scores.gptzeroOriginal != null) addWrappedText(`GPTZero — Original: ${scores.gptzeroOriginal}% AI probability`, 10);
    if (scores.gptzeroHumanized != null) addWrappedText(`GPTZero — Humanized: ${scores.gptzeroHumanized}% AI probability`, 10);
  }

  doc.save('stealthhumanizer-export.pdf');
}
