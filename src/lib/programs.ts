import type { Profile, ProgramInfo } from "./types";

export interface ProgramRule {
  info: ProgramInfo;
  eligible: (p: Profile) => boolean;
  estimateAnnual: (p: Profile) => number;
  reason: (p: Profile, eligible: boolean) => string;
}

const perCapita = (p: Profile) =>
  p.monthlyIncome / Math.max(1, p.householdSize);

// NOTE: Benefit amounts are ESTIMATES ("anggaran") based on publicly
// announced figures (Belanjawan 2024/2025) and are for guidance only.
export const PROGRAM_RULES: ProgramRule[] = [
  {
    info: {
      slug: "str",
      name: "Sumbangan Tunai Rahmah (STR)",
      nameMs: "Sumbangan Tunai Rahmah",
      agency: "Kementerian Kewangan / LHDN",
      category: "Bantuan Tunai",
      description:
        "Bantuan tunai utama kerajaan untuk isi rumah dan individu berpendapatan rendah dan sederhana, dibayar secara berperingkat sepanjang tahun.",
      benefitLabel: "Tunai sehingga ~RM2,000 setahun",
      applyUrl: "https://bantuantunai.hasil.gov.my",
      benefitType: "cash",
      incomeCeiling: 5000,
      tags: ["tunai", "b40", "m40", "isi rumah"],
    },
    eligible: (p) => p.monthlyIncome <= 5000,
    estimateAnnual: (p) => {
      const single = p.householdSize <= 1;
      if (single) return p.monthlyIncome <= 2500 ? 600 : 300;
      let base = 500;
      if (p.monthlyIncome <= 2500) base = 1200;
      else if (p.monthlyIncome <= 3500) base = 800;
      const childBonus = Math.min(p.numChildren, 4) * 200;
      return base + childBonus;
    },
    reason: (p, ok) =>
      ok
        ? `Pendapatan isi rumah RM${p.monthlyIncome.toLocaleString()} berada dalam had kelayakan STR.`
        : "Pendapatan isi rumah melebihi had kelayakan STR (RM5,000).",
  },
  {
    info: {
      slug: "sara",
      name: "Sumbangan Asas Rahmah (SARA)",
      nameMs: "Sumbangan Asas Rahmah",
      agency: "Kementerian Kewangan",
      category: "Bantuan Tunai",
      description:
        "Kredit bulanan RM100 untuk membeli barang keperluan asas di kedai peruncit yang dilantik, bagi penerima STR berpendapatan sangat rendah.",
      benefitLabel: "Kredit ~RM1,200 setahun (RM100/bulan)",
      applyUrl: "https://bantuantunai.hasil.gov.my",
      benefitType: "cash",
      incomeCeiling: 2500,
      tags: ["barang runcit", "tunai", "b40"],
    },
    eligible: (p) => p.monthlyIncome <= 2500,
    estimateAnnual: () => 1200,
    reason: (p, ok) =>
      ok
        ? "Layak sebagai penerima STR berpendapatan rendah (≤ RM2,500/bulan)."
        : "SARA hanya untuk isi rumah berpendapatan ≤ RM2,500/bulan.",
  },
  {
    info: {
      slug: "warga-emas",
      name: "Bantuan Warga Emas (BWE)",
      nameMs: "Bantuan Warga Emas",
      agency: "Jabatan Kebajikan Masyarakat (JKM)",
      category: "Warga Emas",
      description:
        "Bantuan kewangan bulanan untuk warga emas berumur 60 tahun ke atas yang tidak berupaya bekerja dan tiada sumber pendapatan mencukupi.",
      benefitLabel: "Tunai ~RM6,000 setahun (RM500/bulan)",
      applyUrl: "https://www.jkm.gov.my",
      benefitType: "cash",
      incomeCeiling: 2000,
      tags: ["warga emas", "jkm", "60"],
    },
    eligible: (p) =>
      p.age >= 60 &&
      perCapita(p) < 1200 &&
      p.employmentStatus !== "employed" &&
      p.employmentStatus !== "self_employed",
    estimateAnnual: () => 6000,
    reason: (p, ok) =>
      ok
        ? `Berumur ${p.age} tahun dengan pendapatan per kapita rendah dan tidak bekerja.`
        : "Untuk warga emas 60+ yang tidak bekerja dengan pendapatan per kapita rendah.",
  },
  {
    info: {
      slug: "oku",
      name: "Bantuan OKU",
      nameMs: "Bantuan Orang Kurang Upaya",
      agency: "Jabatan Kebajikan Masyarakat (JKM)",
      category: "OKU",
      description:
        "Elaun untuk Orang Kurang Upaya (OKU) — Elaun Pekerja OKU bagi yang bekerja berpendapatan rendah, atau Bantuan OKU Tidak Berupaya Bekerja.",
      benefitLabel: "Tunai RM3,600–RM5,400 setahun",
      applyUrl: "https://www.jkm.gov.my",
      benefitType: "cash",
      incomeCeiling: null,
      tags: ["oku", "jkm", "elaun"],
    },
    eligible: (p) => p.isOku,
    estimateAnnual: (p) => {
      const working =
        p.employmentStatus === "employed" ||
        p.employmentStatus === "self_employed";
      return working && p.monthlyIncome < 1500 ? 5400 : 3600;
    },
    reason: (p, ok) =>
      ok
        ? "Berdaftar sebagai OKU — layak untuk elaun JKM."
        : "Bantuan ini khusus untuk individu berdaftar sebagai OKU.",
  },
  {
    info: {
      slug: "bkk",
      name: "Bantuan Kanak-Kanak (BKK)",
      nameMs: "Bantuan Kanak-Kanak",
      agency: "Jabatan Kebajikan Masyarakat (JKM)",
      category: "Kanak-Kanak",
      description:
        "Bantuan bulanan untuk keluarga miskin yang menanggung kanak-kanak berumur 18 tahun ke bawah bagi meringankan kos sara hidup.",
      benefitLabel: "Tunai sehingga ~RM12,000 setahun",
      applyUrl: "https://www.jkm.gov.my",
      benefitType: "cash",
      incomeCeiling: 2500,
      tags: ["kanak-kanak", "jkm", "keluarga"],
    },
    eligible: (p) => p.numChildren >= 1 && perCapita(p) < 1000,
    estimateAnnual: (p) => {
      const monthly = Math.min(250 + Math.max(0, p.numChildren - 1) * 150, 1000);
      return monthly * 12;
    },
    reason: (p, ok) =>
      ok
        ? `Menanggung ${p.numChildren} kanak-kanak dengan pendapatan per kapita rendah.`
        : "Untuk keluarga miskin yang menanggung anak dengan pendapatan per kapita < RM1,000.",
  },
  {
    info: {
      slug: "bantuan-am",
      name: "Bantuan Am Persekutuan",
      nameMs: "Bantuan Am Persekutuan",
      agency: "Jabatan Kebajikan Masyarakat (JKM)",
      category: "Kebajikan",
      description:
        "Bantuan sara hidup untuk individu atau keluarga yang tidak berkemampuan, tiada punca pendapatan dan tiada penjaga yang menanggung.",
      benefitLabel: "Tunai ~RM6,000 setahun (RM500/bulan)",
      applyUrl: "https://www.jkm.gov.my",
      benefitType: "cash",
      incomeCeiling: 1000,
      tags: ["kebajikan", "jkm", "tanpa pendapatan"],
    },
    eligible: (p) => p.employmentStatus === "unemployed" && p.monthlyIncome <= 1000,
    estimateAnnual: () => 6000,
    reason: (p, ok) =>
      ok
        ? "Tiada pekerjaan dan pendapatan sangat rendah — mungkin layak bantuan am."
        : "Untuk individu tanpa pekerjaan dan hampir tiada pendapatan.",
  },
  {
    info: {
      slug: "mysalam",
      name: "myNadi / MySalam",
      nameMs: "Skim Perlindungan MySalam",
      agency: "Kementerian Kewangan",
      category: "Kesihatan",
      description:
        "Perlindungan takaful kesihatan percuma untuk golongan B40 — bayaran tunai penyakit kritikal dan gantian pendapatan semasa dimasukkan ke hospital.",
      benefitLabel: "Perlindungan sehingga RM8,000 + RM50/hari hospital",
      applyUrl: "https://www.mysalam.com.my",
      benefitType: "value",
      incomeCeiling: 4850,
      tags: ["kesihatan", "takaful", "b40", "hospital"],
    },
    eligible: (p) => p.age >= 18 && p.age <= 65 && p.monthlyIncome <= 4850,
    estimateAnnual: () => 0,
    reason: (p, ok) =>
      ok
        ? "Dalam lingkungan umur 18–65 dan berpendapatan B40 — layak perlindungan percuma."
        : "Untuk B40 berumur 18–65 tahun (pendapatan ≤ RM4,850/bulan).",
  },
  {
    info: {
      slug: "peka-b40",
      name: "PeKa B40",
      nameMs: "Skim Peduli Kesihatan B40",
      agency: "ProtectHealth / KKM",
      category: "Kesihatan",
      description:
        "Saringan kesihatan percuma, bantuan peralatan perubatan dan insentif pengangkutan untuk rawatan bagi golongan B40 berumur 40 tahun ke atas.",
      benefitLabel: "Saringan kesihatan percuma (nilai ~RM500)",
      applyUrl: "https://protecthealth.com.my/peka-b40",
      benefitType: "value",
      incomeCeiling: 4850,
      tags: ["kesihatan", "saringan", "b40"],
    },
    eligible: (p) => p.age >= 40 && p.monthlyIncome <= 4850,
    estimateAnnual: () => 0,
    reason: (p, ok) =>
      ok
        ? "Berumur 40+ dan tergolong dalam B40 — layak saringan kesihatan percuma."
        : "Untuk B40 berumur 40 tahun ke atas.",
  },
  {
    info: {
      slug: "isuri",
      name: "i-Suri (KWSP)",
      nameMs: "Skim Caruman i-Suri",
      agency: "Kumpulan Wang Simpanan Pekerja (KWSP)",
      category: "Persaraan",
      description:
        "Insentif caruman persaraan kerajaan untuk suri rumah/isteri yang menerima STR, membantu membina simpanan KWSP untuk masa hadapan.",
      benefitLabel: "Caruman kerajaan ~RM480 setahun",
      applyUrl: "https://www.kwsp.gov.my",
      benefitType: "cash",
      incomeCeiling: 2500,
      tags: ["persaraan", "kwsp", "suri rumah"],
    },
    eligible: (p) =>
      p.employmentStatus === "housewife" && p.monthlyIncome <= 2500,
    estimateAnnual: () => 480,
    reason: (p, ok) =>
      ok
        ? "Suri rumah dalam isi rumah berpendapatan rendah — layak insentif i-Suri."
        : "Untuk suri rumah dalam isi rumah penerima STR.",
  },
  {
    info: {
      slug: "rumah-mesra",
      name: "Rumah Mesra Rakyat (RMR)",
      nameMs: "Program Rumah Mesra Rakyat",
      agency: "Syarikat Perumahan Negara Berhad (SPNB)",
      category: "Perumahan",
      description:
        "Subsidi pembinaan rumah di atas tanah sendiri untuk golongan berpendapatan rendah yang belum memiliki rumah kediaman.",
      benefitLabel: "Subsidi pembinaan rumah sehingga RM50,000 (sekali)",
      applyUrl: "https://www.spnb.com.my",
      benefitType: "value",
      incomeCeiling: 5000,
      tags: ["perumahan", "spnb", "subsidi"],
    },
    eligible: (p) => p.monthlyIncome <= 5000 && !p.ownsHome,
    estimateAnnual: () => 0,
    reason: (p, ok) =>
      ok
        ? "Belum memiliki rumah dan berpendapatan dalam had kelayakan."
        : "Untuk mereka yang belum memiliki rumah dengan pendapatan ≤ RM5,000.",
  },
  {
    info: {
      slug: "ptptn-bantuan",
      name: "Bantuan Pendidikan PTPTN",
      nameMs: "Pinjaman & Bantuan Pendidikan PTPTN",
      agency: "Perbadanan Tabung Pendidikan Tinggi Nasional",
      category: "Pendidikan",
      description:
        "Pinjaman pendidikan tinggi dan bantuan berkaitan untuk pelajar IPT, termasuk kemudahan bayaran balik dan diskaun.",
      benefitLabel: "Pembiayaan pengajian tinggi",
      applyUrl: "https://www.ptptn.gov.my",
      benefitType: "value",
      incomeCeiling: null,
      tags: ["pendidikan", "ptptn", "pelajar"],
    },
    eligible: (p) => p.hasStudent || p.employmentStatus === "student",
    estimateAnnual: () => 0,
    reason: (_p, ok) =>
      ok
        ? "Terdapat pelajar dalam isi rumah — mungkin layak pembiayaan PTPTN."
        : "Untuk isi rumah dengan pelajar pengajian tinggi.",
  },
  {
    info: {
      slug: "perkeso-sksps",
      name: "PERKESO SKSPS",
      nameMs: "Skim Keselamatan Sosial Pekerjaan Sendiri",
      agency: "Pertubuhan Keselamatan Sosial (PERKESO)",
      category: "Kebajikan",
      description:
        "Perlindungan keselamatan sosial untuk pekerja sendiri (penjaja, peniaga, pemandu e-hailing) daripada risiko kemalangan semasa bekerja.",
      benefitLabel: "Perlindungan kemalangan pekerjaan",
      applyUrl: "https://www.perkeso.gov.my",
      benefitType: "value",
      incomeCeiling: null,
      tags: ["pekerja sendiri", "perkeso", "perlindungan"],
    },
    eligible: (p) => p.employmentStatus === "self_employed",
    estimateAnnual: () => 0,
    reason: (_p, ok) =>
      ok
        ? "Bekerja sendiri — digalakkan menyertai skim perlindungan PERKESO."
        : "Untuk individu yang bekerja sendiri.",
  },
];

export function getCatalog(): ProgramInfo[] {
  return PROGRAM_RULES.map((r) => r.info);
}
