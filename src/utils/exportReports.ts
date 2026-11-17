import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { EvaluationRecord, TeacherUser } from '../shared/levels';

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}d` : `${s} detik`;
}

export function formatDateId(iso: string): string {
  try {
    return new Date(iso).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function downloadEvaluationPDF(params: {
  evaluations: EvaluationRecord[];
  teacher: TeacherUser;
  classLabel: string;
  topicLabel: string;
  dateLabel: string;
}) {
  const { evaluations, teacher, classLabel, topicLabel, dateLabel } = params;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Header Banner
  doc.setFillColor(29, 78, 216);
  doc.rect(0, 0, 297, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('INTEGER ADVENTURE — LAPORAN EVALUASI PEMBELAJARAN', 14, 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(
    `Guru: ${teacher.name}${teacher.schoolName ? ` · ${teacher.schoolName}` : ''}   |   Dicetak: ${new Date().toLocaleDateString('id-ID')}`,
    14,
    21
  );

  // Filter Context
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Kelas: ${classLabel}`, 14, 36);
  doc.text(`Materi: ${topicLabel}`, 105, 36);
  doc.text(`Tanggal: ${dateLabel}`, 205, 36);

  // Compute summary metrics
  const total = evaluations.length;
  const avgScore = total > 0 ? evaluations.reduce((acc, e) => acc + e.score, 0) / total : 0;
  const passedCount = evaluations.filter((e) => e.isPassed).length;
  const passRate = total > 0 ? (passedCount / total) * 100 : 0;

  // Summary bar
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, 41, 269, 14, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(`Total Peserta Evaluasi: ${total}`, 18, 49.5);
  doc.text(`Rata-rata Kelas: ${avgScore.toFixed(1)}`, 86, 49.5);
  doc.text(`Siswa Tuntas: ${passedCount} / ${total}`, 152, 49.5);
  doc.text(`Persentase Ketuntasan: ${passRate.toFixed(1)}%`, 216, 49.5);

  const tableRows = evaluations.map((ev, idx) => [
    String(idx + 1),
    ev.studentName,
    ev.className,
    ev.levelName,
    `${ev.correctCount}/${ev.totalQuestions}`,
    `${ev.wrongCount}`,
    `${ev.score}`,
    `${ev.passPercentage.toFixed(0)}%`,
    formatDuration(ev.durationSeconds),
    ev.isPassed ? 'Tuntas' : 'Belum Tuntas',
    formatDateId(ev.executedAt),
  ]);

  autoTable(doc, {
    startY: 60,
    head: [
      [
        'No',
        'Nama Siswa',
        'Kelas',
        'Materi',
        'Benar',
        'Salah',
        'Nilai',
        'Ketuntasan',
        'Durasi',
        'Status',
        'Tanggal',
      ],
    ],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      cellPadding: 2.5,
      textColor: [15, 23, 42],
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [30, 64, 175],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      4: { halign: 'center', cellWidth: 16 },
      5: { halign: 'center', cellWidth: 14 },
      6: { halign: 'center', cellWidth: 15 },
      7: { halign: 'center', cellWidth: 22 },
      8: { halign: 'center', cellWidth: 22 },
      9: { halign: 'center', cellWidth: 26 },
    },
    margin: { left: 14, right: 14 },
  });

  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 70;
  const conclusionY = Math.min(finalY + 10, 185);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Kesimpulan Hasil Evaluasi:', 14, conclusionY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);

  const conclusionText =
    total === 0
      ? 'Belum ada data evaluasi untuk filter yang dipilih.'
      : passRate >= 75
        ? `Capaian belajar kelas berada pada kategori baik dengan rata-rata nilai ${avgScore.toFixed(1)} dan tingkat ketuntasan ${passRate.toFixed(1)}%. Sebagian besar siswa telah memahami operasi bilangan bulat.`
        : `Rata-rata nilai kelas saat ini ${avgScore.toFixed(1)} dengan tingkat ketuntasan ${passRate.toFixed(1)}%. Disarankan memberikan pendalaman konsep pada siswa yang belum mencapai batas ketuntasan.`;

  doc.text(conclusionText, 14, conclusionY + 6, { maxWidth: 268 });

  const fileSlug = classLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  doc.save(`laporan-integer-adventure-${fileSlug}.pdf`);
}

export function downloadEvaluationExcel(evaluations: EvaluationRecord[], classLabel: string) {
  const rows = evaluations.map((ev, index) => ({
    Nomor: index + 1,
    'Nama Siswa': ev.studentName,
    Kelas: ev.className,
    Materi: `${ev.levelName} (${ev.topic})`,
    'Jumlah Soal': ev.totalQuestions,
    'Jawaban Benar': ev.correctCount,
    'Jawaban Salah': ev.wrongCount,
    Nilai: ev.score,
    'Persentase Keberhasilan': `${ev.passPercentage.toFixed(1)}%`,
    'Durasi Pengerjaan': formatDuration(ev.durationSeconds),
    'Status Ketuntasan': ev.isPassed ? 'Tuntas' : 'Belum Tuntas',
    'Tanggal Evaluasi': formatDateId(ev.executedAt),
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 7 },
    { wch: 24 },
    { wch: 14 },
    { wch: 32 },
    { wch: 13 },
    { wch: 14 },
    { wch: 14 },
    { wch: 10 },
    { wch: 22 },
    { wch: 18 },
    { wch: 18 },
    { wch: 22 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Hasil Evaluasi');

  const fileSlug = classLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  XLSX.writeFile(workbook, `laporan-integer-adventure-${fileSlug}.xlsx`);
}
