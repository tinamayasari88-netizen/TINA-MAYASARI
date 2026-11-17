import crypto from 'node:crypto';
import type { QuestionItem } from '../src/shared/levels.ts';

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function nonZeroInt(min: number, max: number): number {
  let n = 0;
  while (n === 0) {
    n = randInt(min, max);
  }
  return n;
}

function fmt(n: number): string {
  return n < 0 ? `(${n})` : `${n}`;
}

function buildOptions(correct: number, candidateDistractors: number[]): number[] {
  const set = new Set<number>([correct]);
  for (const d of candidateDistractors) {
    if (Number.isInteger(d) && d !== correct && set.size < 4) {
      set.add(d);
    }
  }
  let offset = 1;
  while (set.size < 4) {
    const candidate = offset % 2 === 0 ? correct + offset : correct - offset;
    if (candidate !== correct) {
      set.add(candidate);
    }
    offset++;
  }
  const arr = Array.from(set);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateAddition(index: number, difficulty: 'easy' | 'medium' | 'hard'): Omit<QuestionItem, 'id' | 'levelId' | 'orderIndex'> {
  if (difficulty === 'easy') {
    const scenarios = [
      () => {
        const a = randInt(3, 15);
        const b = randInt(2, 12);
        const ans = a + b;
        return {
          prompt: `Hitung hasil dari ${a} + ${b} = ...`,
          correctAnswer: ans,
          options: buildOptions(ans, [a - b, ans + 2, ans - 2]),
          explanation: `Kedua bilangan positif, sehingga dijumlahkan langsung: ${a} + ${b} = ${ans}.`,
        };
      },
      () => {
        const a = -randInt(2, 9);
        const b = randInt(Math.abs(a) + 1, Math.abs(a) + 10);
        const ans = a + b;
        return {
          prompt: `Hitung hasil dari ${fmt(a)} + ${b} = ...`,
          correctAnswer: ans,
          options: buildOptions(ans, [-ans, a - b, ans + 3]),
          explanation: `Mulai dari ${a} (merah/negatif) lalu tambahkan ${b} tombol positif (biru), sisanya ${ans}.`,
        };
      },
    ];
    return { ...scenarios[index % scenarios.length](), difficulty };
  }

  if (difficulty === 'medium') {
    const a = index % 2 === 0 ? randInt(4, 15) : -randInt(4, 14);
    const b = -randInt(6, 18);
    const ans = a + b;
    const explain =
      a >= 0
        ? `Penjumlahan bilangan positif ${a} dengan negatif ${b} sama dengan ${a} - ${Math.abs(b)} = ${ans}.`
        : `Kedua bilangan bertanda negatif, jumlahkan nilainya dan beri tanda negatif: -(${Math.abs(a)} + ${Math.abs(b)}) = ${ans}.`;
    return {
      prompt: `Berapakah hasil dari ${fmt(a)} + ${fmt(b)}?`,
      correctAnswer: ans,
      options: buildOptions(ans, [-ans, a - b, ans + 4, ans - 4]),
      explanation: explain,
      difficulty,
    };
  }

  const a = -randInt(10, 25);
  const b = randInt(12, 30);
  const c = -randInt(5, 18);
  const ans = a + b + c;
  return {
    prompt: `Tentukan hasil dari ${fmt(a)} + ${b} + ${fmt(c)} = ...`,
    correctAnswer: ans,
    options: buildOptions(ans, [-ans, a + b - c, a - b + c, ans + 5]),
    explanation: `Hitung berurutan dari kiri: ${fmt(a)} + ${b} = ${a + b}, lalu ${a + b} + ${fmt(c)} = ${ans}.`,
    difficulty,
  };
}

function generateSubtraction(index: number, difficulty: 'easy' | 'medium' | 'hard'): Omit<QuestionItem, 'id' | 'levelId' | 'orderIndex'> {
  if (difficulty === 'easy') {
    if (index % 2 === 0) {
      const a = randInt(8, 20);
      const b = randInt(2, a - 1);
      const ans = a - b;
      return {
        prompt: `Hitung hasil dari ${a} - ${b} = ...`,
        correctAnswer: ans,
        options: buildOptions(ans, [-ans, a + b, ans + 2]),
        explanation: `Kurangkan ${b} dari ${a}: ${a} - ${b} = ${ans}.`,
        difficulty,
      };
    }
    const a = randInt(3, 10);
    const b = randInt(a + 2, a + 12);
    const ans = a - b;
    return {
      prompt: `Hitung hasil dari ${a} - ${b} = ...`,
      correctAnswer: ans,
      options: buildOptions(ans, [b - a, -(a + b), ans - 2]),
      explanation: `Karena ${b} lebih besar dari ${a}, hasilnya negatif: ${a} - ${b} = -(${b} - ${a}) = ${ans}.`,
      difficulty,
    };
  }

  if (difficulty === 'medium') {
    if (index % 2 === 0) {
      const a = -randInt(3, 14);
      const b = randInt(4, 15);
      const ans = a - b;
      return {
        prompt: `Berapakah hasil dari ${fmt(a)} - ${b}?`,
        correctAnswer: ans,
        options: buildOptions(ans, [a + b, -ans, ans + 2]),
        explanation: `Mengurangi dengan ${b} berarti melangkah ${b} satuan ke kiri dari ${a}: ${a} + ${fmt(-b)} = ${ans}.`,
        difficulty,
      };
    }
    const a = -randInt(5, 16);
    const b = -randInt(2, 12);
    const ans = a - b;
    return {
      prompt: `Berapakah hasil dari ${fmt(a)} - ${fmt(b)}?`,
      correctAnswer: ans,
      options: buildOptions(ans, [a + b, -ans, Math.abs(a) - Math.abs(b)]),
      explanation: `Ingat aturan tanda: dikurangi bilangan negatif sama dengan ditambah bilangan positif, jadi ${a} + ${Math.abs(b)} = ${ans}.`,
      difficulty,
    };
  }

  const a = -randInt(12, 26);
  const b = -randInt(10, 24);
  const c = randInt(5, 15);
  const ans = a - b - c;
  return {
    prompt: `Tentukan hasil dari ${fmt(a)} - ${fmt(b)} - ${c} = ...`,
    correctAnswer: ans,
    options: buildOptions(ans, [a + b - c, -ans, a - b + c]),
    explanation: `Ubah tanda kurang negatif: ${a} + ${Math.abs(b)} - ${c} = ${a - b} - ${c} = ${ans}.`,
    difficulty,
  };
}

function generateMultiplication(index: number, difficulty: 'easy' | 'medium' | 'hard'): Omit<QuestionItem, 'id' | 'levelId' | 'orderIndex'> {
  if (difficulty === 'easy') {
    const a = index % 2 === 0 ? randInt(3, 9) : -randInt(3, 8);
    const b = randInt(2, 9);
    const ans = a * b;
    return {
      prompt: `Hitung hasil dari ${fmt(a)} × ${b} = ...`,
      correctAnswer: ans,
      options: buildOptions(ans, [-ans, a + b, ans + b]),
      explanation:
        a >= 0
          ? `Positif × positif menghasilkan positif: ${a} × ${b} = ${ans}.`
          : `Negatif × positif menghasilkan negatif: -(${Math.abs(a)} × ${b}) = ${ans}.`,
      difficulty,
    };
  }

  if (difficulty === 'medium') {
    const bothNeg = index % 2 === 0;
    const a = bothNeg ? -randInt(3, 9) : randInt(4, 9);
    const b = -randInt(3, 9);
    const ans = a * b;
    return {
      prompt: `Berapakah hasil dari ${fmt(a)} × ${fmt(b)}?`,
      correctAnswer: ans,
      options: buildOptions(ans, [-ans, a + b, ans + 6]),
      explanation: bothNeg
        ? `Negatif × negatif menghasilkan positif: ${Math.abs(a)} × ${Math.abs(b)} = ${ans}.`
        : `Positif × negatif menghasilkan negatif: -(${a} × ${Math.abs(b)}) = ${ans}.`,
      difficulty,
    };
  }

  const a = -randInt(2, 6);
  const b = randInt(3, 7);
  const c = -randInt(2, 5);
  const ans = a * b * c;
  return {
    prompt: `Tentukan hasil dari ${fmt(a)} × ${b} × ${fmt(c)} = ...`,
    correctAnswer: ans,
    options: buildOptions(ans, [-ans, a * b + c, (a + b) * c]),
    explanation: `Kalikan bertahap: ${fmt(a)} × ${b} = ${a * b}, lalu ${a * b} × ${fmt(c)} = ${ans} (negatif × negatif = positif).`,
    difficulty,
  };
}

function generateDivision(index: number, difficulty: 'easy' | 'medium' | 'hard'): Omit<QuestionItem, 'id' | 'levelId' | 'orderIndex'> {
  if (difficulty === 'easy') {
    const divisor = randInt(2, 8);
    const quotient = index % 2 === 0 ? randInt(3, 9) : -randInt(3, 9);
    const dividend = divisor * quotient;
    return {
      prompt: `Hitung hasil dari ${fmt(dividend)} ÷ ${divisor} = ...`,
      correctAnswer: quotient,
      options: buildOptions(quotient, [-quotient, quotient + 2, quotient - 2]),
      explanation:
        quotient >= 0
          ? `Positif ÷ positif = positif: ${dividend} ÷ ${divisor} = ${quotient}.`
          : `Negatif ÷ positif = negatif: -(${Math.abs(dividend)} ÷ ${divisor}) = ${quotient}.`,
      difficulty,
    };
  }

  if (difficulty === 'medium') {
    const divisor = -randInt(3, 9);
    const quotient = index % 2 === 0 ? randInt(3, 9) : -randInt(3, 9);
    const dividend = divisor * quotient;
    return {
      prompt: `Berapakah hasil dari ${fmt(dividend)} ÷ ${fmt(divisor)}?`,
      correctAnswer: quotient,
      options: buildOptions(quotient, [-quotient, quotient + 3, quotient - 3]),
      explanation:
        dividend < 0
          ? `Negatif ÷ negatif menghasilkan positif: ${Math.abs(dividend)} ÷ ${Math.abs(divisor)} = ${quotient}.`
          : `Positif ÷ negatif menghasilkan negatif: -(${dividend} ÷ ${Math.abs(divisor)}) = ${quotient}.`,
      difficulty,
    };
  }

  const c = nonZeroInt(-5, 5);
  const b = nonZeroInt(-6, 6);
  const q1 = b * randInt(2, 5) * (index % 2 === 0 ? -1 : 1);
  const a = q1 * c;
  // Wait: compute (a ÷ b) ÷ c cleanly:
  const div2 = nonZeroInt(-5, 5);
  const finalQ = nonZeroInt(-7, 7);
  const mid = finalQ * div2;
  const div1 = nonZeroInt(-6, 6);
  const start = mid * div1;
  void a; void q1; void c; void b;
  return {
    prompt: `Tentukan hasil dari ${fmt(start)} ÷ ${fmt(div1)} ÷ ${fmt(div2)} = ...`,
    correctAnswer: finalQ,
    options: buildOptions(finalQ, [-finalQ, mid, finalQ + 2]),
    explanation: `Hitung dari kiri ke kanan: ${fmt(start)} ÷ ${fmt(div1)} = ${mid}, lalu ${fmt(mid)} ÷ ${fmt(div2)} = ${finalQ}.`,
    difficulty,
  };
}

function generateMixed(index: number, difficulty: 'easy' | 'medium' | 'hard'): Omit<QuestionItem, 'id' | 'levelId' | 'orderIndex'> {
  if (difficulty === 'easy') {
    const a = randInt(4, 15);
    const b = -randInt(2, 6);
    const c = randInt(2, 5);
    const ans = a + b * c;
    const wrongOrder = (a + b) * c;
    return {
      prompt: `Hitung dengan urutan operasi yang tepat: ${a} + ${fmt(b)} × ${c} = ...`,
      correctAnswer: ans,
      options: buildOptions(ans, [wrongOrder, a - b * c, -ans]),
      explanation: `Dahulukan perkalian sebelum penjumlahan: ${fmt(b)} × ${c} = ${b * c}, lalu ${a} + ${fmt(b * c)} = ${ans}.`,
      difficulty,
    };
  }

  if (difficulty === 'medium') {
    if (index % 2 === 0) {
      const divisor = nonZeroInt(-6, 6);
      const q = nonZeroInt(-8, 8);
      const dividend = divisor * q;
      const tail = randInt(3, 12);
      const ans = q - tail;
      return {
        prompt: `Hitung hasil dari ${fmt(dividend)} ÷ ${fmt(divisor)} - ${tail} = ...`,
        correctAnswer: ans,
        options: buildOptions(ans, [q + tail, -ans, ans + 4]),
        explanation: `Kerjakan pembagian lebih dahulu: ${fmt(dividend)} ÷ ${fmt(divisor)} = ${q}, lalu ${q} - ${tail} = ${ans}.`,
        difficulty,
      };
    }
    const a = randInt(4, 12);
    const b = randInt(a + 3, a + 10);
    const c = -randInt(2, 5);
    const ans = (a - b) * c;
    return {
      prompt: `Hitung hasil dari (${a} - ${b}) × ${fmt(c)} = ...`,
      correctAnswer: ans,
      options: buildOptions(ans, [-ans, a - b * c, (a + b) * c]),
      explanation: `Kerjakan dalam kurung terlebih dahulu: (${a} - ${b}) = ${a - b}, kemudian ${fmt(a - b)} × ${fmt(c)} = ${ans}.`,
      difficulty,
    };
  }

  const d = nonZeroInt(-5, 5);
  const q = nonZeroInt(-6, 6);
  const c = d * q;
  const a = randInt(10, 24);
  const ans = a - q;
  return {
    prompt: `Hitung hasil dari ${a} - ${fmt(c)} ÷ ${fmt(d)} = ...`,
    correctAnswer: ans,
    options: buildOptions(ans, [a + q, Math.trunc((a - c) / d), -ans]),
    explanation: `Dahulukan pembagian: ${fmt(c)} ÷ ${fmt(d)} = ${q}. Kemudian hitung ${a} - ${fmt(q)} = ${ans}.`,
    difficulty,
  };
}

function generateMaster(index: number, difficulty: 'easy' | 'medium' | 'hard'): Omit<QuestionItem, 'id' | 'levelId' | 'orderIndex'> {
  if (difficulty === 'easy') {
    const a = -randInt(2, 6);
    const b = randInt(3, 8);
    const ans = 2 * a - 3 * b;
    return {
      prompt: `Jika a = ${a} dan b = ${b}, berapakah nilai dari 2a - 3b?`,
      correctAnswer: ans,
      options: buildOptions(ans, [2 * a + 3 * b, -ans, 2 * b - 3 * a]),
      explanation: `Substitusikan nilai: 2(${a}) - 3(${b}) = ${2 * a} - ${3 * b} = ${ans}.`,
      difficulty,
    };
  }

  if (difficulty === 'medium') {
    if (index % 2 === 0) {
      const startTemp = -randInt(4, 12);
      const rise = randInt(9, 18);
      const drop = randInt(6, 15);
      const ans = startTemp + rise - drop;
      return {
        prompt: `Suhu sebuah ruang pendingin mula-mula ${startTemp}°C, lalu naik ${rise}°C, kemudian turun ${drop}°C. Suhu akhir ruang tersebut adalah ... °C`,
        correctAnswer: ans,
        options: buildOptions(ans, [startTemp - rise + drop, -ans, startTemp + rise + drop]),
        explanation: `Naik berarti ditambah dan turun berarti dikurang: ${startTemp} + ${rise} - ${drop} = ${ans}°C.`,
        difficulty,
      };
    }
    const correctPts = randInt(12, 18);
    const wrongPts = randInt(3, 6);
    const blankPts = 20 - correctPts - wrongPts;
    const ans = correctPts * 4 + wrongPts * -2 + blankPts * 0;
    return {
      prompt: `Dalam olimpiade (20 soal), jawaban benar bernilai 4, salah -2, dan tidak dijawab 0. Jika Dina menjawab ${correctPts} benar dan ${wrongPts} salah, berapakah total skornya?`,
      correctAnswer: ans,
      options: buildOptions(ans, [correctPts * 4 + wrongPts * 2, correctPts * 4 - wrongPts, ans - 4]),
      explanation: `Skor = (${correctPts} × 4) + (${wrongPts} × (-2)) + (${blankPts} × 0) = ${correctPts * 4} + (${wrongPts * -2}) = ${ans}.`,
      difficulty,
    };
  }

  const div = nonZeroInt(-4, 4);
  const q = nonZeroInt(-6, 6);
  const mult = nonZeroInt(-4, 4);
  // Make ((a + b) * mult) / div exact integer: choose innerSum = q * div
  const innerSum = q * div;
  const b = randInt(4, 12);
  const a = innerSum - b;
  const ans = q * mult;
  return {
    prompt: `Tentukan nilai dari (${fmt(a)} + ${b}) × ${fmt(mult)} ÷ ${fmt(div)} = ...`,
    correctAnswer: ans,
    options: buildOptions(ans, [-ans, innerSum * mult, ans + 6]),
    explanation: `Hitung dalam kurung: ${fmt(a)} + ${b} = ${innerSum}. Lalu ${innerSum} × ${fmt(mult)} ÷ ${fmt(div)} = ${innerSum * mult} ÷ ${fmt(div)} = ${ans}.`,
    difficulty,
  };
}

export function generateQuestionsForLevel(levelId: number, count = 10): QuestionItem[] {
  const questions: QuestionItem[] = [];
  const usedPrompts = new Set<string>();

  for (let i = 0; i < count; i++) {
    const ratio = i / Math.max(count - 1, 1);
    const difficulty: 'easy' | 'medium' | 'hard' =
      ratio < 0.31 ? 'easy' : ratio < 0.71 ? 'medium' : 'hard';

    let generated: Omit<QuestionItem, 'id' | 'levelId' | 'orderIndex'> | null = null;
    for (let attempt = 0; attempt < 15; attempt++) {
      const candidate =
        levelId === 1
          ? generateAddition(i + attempt, difficulty)
          : levelId === 2
            ? generateSubtraction(i + attempt, difficulty)
            : levelId === 3
              ? generateMultiplication(i + attempt, difficulty)
              : levelId === 4
                ? generateDivision(i + attempt, difficulty)
                : levelId === 5
                  ? generateMixed(i + attempt, difficulty)
                  : generateMaster(i + attempt, difficulty);

      if (!usedPrompts.has(candidate.prompt)) {
        generated = candidate;
        usedPrompts.add(candidate.prompt);
        break;
      }
    }

    if (!generated) {
      generated = generateAddition(i, difficulty);
    }

    questions.push({
      id: crypto.randomUUID(),
      levelId,
      orderIndex: i + 1,
      ...generated,
    });
  }

  return questions;
}
