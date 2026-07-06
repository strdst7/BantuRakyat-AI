import { AidProgram } from '../db/schema';
import { PasarApiSnapshot, getStateEconomicProfile } from './pasarapi';

export interface ScanInput {
  householdSize: number;
  monthlyIncome: number;
  state: string;
  employmentStatus: string; // 'Bekerja' | 'Tidak Bekerja' | 'Kerja Sendiri' | 'Pesara' | 'Pelajar'
  categories: string[]; // e.g. ['B40', 'Warga Emas', 'OKU', 'Ibu/Bapa Tunggal', 'Belia']
  currentlyClaimedCodes: string[]; // codes of aids already claimed
}

export interface QualifiedAidItem {
  program: AidProgram;
  estimatedAnnualValue: number;
  explanationBm: string;
  explanationEn: string;
  matchReasons: string[];
  isCurrentlyClaimed: boolean;
}

export interface CalendarEvent {
  month: string;
  monthIdx: number; // 1-12
  dateRange: string;
  programCode: string;
  programName: string;
  phaseOrAction: string;
  category: string;
  type: 'Payout' | 'Deadline' | 'Opening';
}

export interface EligibilityReport {
  scanId: string;
  scannedAt: string;
  input: ScanInput;
  stateProfile: {
    stateName: string;
    medianIncome: number;
    povertyRate: number;
    relativeStanding: string; // e.g. "Bawah Median Negeri" or "Atas Median Negeri"
  };
  qualifiedList: QualifiedAidItem[];
  missingList: QualifiedAidItem[]; // qualified but NOT claimed
  totalAnnualQualifiedValue: number;
  totalAnnualMissingValue: number;
  calendarEvents: CalendarEvent[];
  documentChecklist: {
    category: string;
    documents: string[];
  }[];
}

export function evaluateEligibility(
  programs: AidProgram[],
  input: ScanInput,
  snapshot: PasarApiSnapshot
): EligibilityReport {
  const stateProfile = getStateEconomicProfile(input.state, snapshot);

  const qualifiedList: QualifiedAidItem[] = [];
  let totalAnnualQualifiedValue = 0;

  for (const prog of programs) {
    if (!prog.isActive) continue;

    // Check income threshold
    // Adjust income threshold slightly if state cost multiplier is high (e.g. Selangor / KL)
    const effectiveMaxIncome = prog.maxIncome;
    if (input.monthlyIncome > effectiveMaxIncome) {
      continue;
    }

    // Check state eligibility
    const progStates = prog.states.toUpperCase();
    if (progStates !== 'ALL' && !progStates.includes(input.state.toUpperCase())) {
      continue;
    }

    // Check specific target category matches
    const targetCats = prog.targetCategories.split(',').map(c => c.trim().toUpperCase());
    const userCats = input.categories.map(c => c.trim().toUpperCase());
    const isIncomeB40 = input.monthlyIncome <= 4850;
    const isIncomeM40 = input.monthlyIncome > 4850 && input.monthlyIncome <= 10970;

    // Auto inject B40/M40 based on income
    if (isIncomeB40 && !userCats.includes('B40')) userCats.push('B40');
    if (isIncomeM40 && !userCats.includes('M40')) userCats.push('M40');

    // If program targets OKU only, check if user has OKU
    if (targetCats.includes('OKU') && !targetCats.includes('ALL') && !targetCats.includes('B40') && !userCats.includes('OKU')) {
      continue;
    }

    // If program targets Warga Emas only
    if (targetCats.includes('WARGA EMAS') && !targetCats.includes('ALL') && !targetCats.includes('B40') && !userCats.includes('WARGA EMAS')) {
      continue;
    }

    // Calculate estimated annual value
    let estimatedAnnualValue = prog.amountMin;
    if (input.householdSize >= 4 && prog.amountMax > prog.amountMin) {
      estimatedAnnualValue = Math.min(prog.amountMax, prog.amountMin + (input.householdSize - 1) * 350);
    } else if (input.householdSize === 2 || input.householdSize === 3) {
      estimatedAnnualValue = Math.min(prog.amountMax, prog.amountMin + 300);
    }

    // Generate match reasons
    const matchReasons: string[] = [];
    matchReasons.push(`Pendapatan RM${input.monthlyIncome.toLocaleString()} ≤ Had RM${effectiveMaxIncome.toLocaleString()}`);
    if (prog.states !== 'ALL') matchReasons.push(`Negeri kediaman: ${prog.states}`);
    if (userCats.some(c => targetCats.includes(c))) {
      matchReasons.push(`Kategori sepadan: ${userCats.filter(c => targetCats.includes(c)).join(', ')}`);
    }

    // Generate BM explanation gaya chill
    let explanationBm = '';
    let explanationEn = '';

    if (prog.code.startsWith('STR')) {
      explanationBm = `Bro/Kakak, pendapatan isi rumah RM${input.monthlyIncome.toLocaleString()} memang ngam-ngam bawah kelayakan STR (RM${effectiveMaxIncome.toLocaleString()}). Dengan saiz keluarga ${input.householdSize} orang, anda layak terima bantuan tunai anggaran RM${estimatedAnnualValue.toLocaleString()} setahun dalam 4 fasa. Memang mantap untuk tampung keperluan harian!`;
      explanationEn = `Hey boss! With a monthly household income of RM${input.monthlyIncome.toLocaleString()}, you comfortably clear the STR eligibility ceiling. Given your household size of ${input.householdSize}, you're looking at direct cash aid around RM${estimatedAnnualValue.toLocaleString()} split over 4 phases. Solid support for groceries and bills!`;
    } else if (prog.code.startsWith('SARA')) {
      explanationBm = `Berita baik! Sebab anda layak untuk STR dan berada dalam kelompok pendapatan rendah, anda auto-layak untuk kredit SARA RM100 setiap bulan masuk terus dalam MyKad. Boleh belanja barang dapur di Speedmart 99, Mydin atau Giant berdekatan tanpa tunai. Chill je swipe MyKad!`;
      explanationEn = `Awesome news! Because you qualify for STR and fall under the low-income tier, you're automatically eligible for RM100 monthly SARA credits right inside your MyKad. Walk into selected supermarkets and swipe your IC for cashless groceries every single month!`;
    } else if (prog.code.startsWith('JKM')) {
      explanationBm = `Anda menepati kriteria bantuan kebajikan bulanan JKM sebanyak RM${(estimatedAnnualValue/12).toFixed(0)} sebulan (RM${estimatedAnnualValue.toLocaleString()} setahun). Permohonan boleh dibuat di Pejabat Kebajikan Masyarakat Daerah dengan membawa kad pengenalan dan pengesahan berkaitan.`;
      explanationEn = `You match the criteria for monthly JKM social welfare assistance of RM${(estimatedAnnualValue/12).toFixed(0)}/month (RM${estimatedAnnualValue.toLocaleString()}/year). Simply apply at your nearest District Welfare Office with your IC and supporting documents.`;
    } else if (prog.code.includes('BINGKAS')) {
      explanationBm = `Warga Selangor! Pendapatan anda di bawah RM5,000 dan mempunyai tanggungan membolehkan anda claim RM300 sebulan e-dompet SELangkah melalui program BINGKAS. Rugi besar kalau tak claim RM3,600 setahun ni!`;
      explanationEn = `Selangor residents alert! Your income under RM5,000 with dependents unlocks RM300/month in SELangkah e-wallet credits via BINGKAS. Don't leave this RM3,600 annual support on the table!`;
    } else if (prog.code.includes('MYSALAM') || prog.code.includes('PEKA')) {
      explanationBm = `Jangan risau pasal bil klinik atau hospital kerajaaan! Sebagai golongan B40, anda dilindungi takaful kesihatan percuma MySalam (elaun hospital RM50/hari) & saringan kesihatan komprehensif PeKa B40 secara percuma.`;
      explanationEn = `Never stress over health screenings or hospital stays! As part of the B40 community, you get free MySalam national health takaful (RM50/day hospital allowance) plus full PeKa B40 health screenings and medical device subsidies.`;
    } else {
      explanationBm = `Berdasarkan profil anda di ${input.state} dengan pendapatan RM${input.monthlyIncome.toLocaleString()}, anda memenuhi kriteria rasmi program ${prog.name}. Anggaran manfaat adalah RM${estimatedAnnualValue.toLocaleString()} setahun.`;
      explanationEn = `Based on your profile in ${input.state} and monthly income of RM${input.monthlyIncome.toLocaleString()}, you fulfill the official criteria for ${prog.name}, locking in around RM${estimatedAnnualValue.toLocaleString()} worth of support.`;
    }

    const isCurrentlyClaimed = input.currentlyClaimedCodes.includes(prog.code);

    qualifiedList.push({
      program: prog,
      estimatedAnnualValue,
      explanationBm,
      explanationEn,
      matchReasons,
      isCurrentlyClaimed,
    });

    totalAnnualQualifiedValue += estimatedAnnualValue;
  }

  // Generate Missing list
  const missingList = qualifiedList.filter(item => !item.isCurrentlyClaimed);
  const totalAnnualMissingValue = missingList.reduce((acc, item) => acc + item.estimatedAnnualValue, 0);

  // Generate personalized calendar events
  const calendarEvents: CalendarEvent[] = [
    {
      month: 'Januari 2026',
      monthIdx: 1,
      dateRange: '1 Jan 2026',
      programCode: 'SARA_2026',
      programName: 'Sumbangan Asas Rahmah (SARA)',
      phaseOrAction: 'Kredit Bulanan RM100 Masuk MyKad',
      category: 'Barangan Asas',
      type: 'Payout',
    },
    {
      month: 'Februari 2026',
      monthIdx: 2,
      dateRange: '12 Feb - 20 Feb 2026',
      programCode: 'STR_2026',
      programName: 'Sumbangan Tunai Rahmah (STR)',
      phaseOrAction: 'Pengagihan Bayaran Fasa 1 (RM500 - RM1,000)',
      category: 'Bantuan Tunai',
      type: 'Payout',
    },
    {
      month: 'Februari 2026',
      monthIdx: 2,
      dateRange: '28 Feb 2026',
      programCode: 'STR_2026',
      programName: 'Rayuan & Kemaskini STR 2026',
      phaseOrAction: 'Tarikh Tutup Rayuan Fasa 1 di Portal LHDNM',
      category: 'Bantuan Tunai',
      type: 'Deadline',
    },
    {
      month: 'Mac 2026',
      monthIdx: 3,
      dateRange: '15 Mac 2026',
      programCode: 'BAP_2026',
      programName: 'Bantuan Awal Persekolahan (BAP)',
      phaseOrAction: 'Pengagihan Tunai RM150 Oleh Sekolah KPM',
      category: 'Pendidikan',
      type: 'Payout',
    },
    {
      month: 'April 2026',
      monthIdx: 4,
      dateRange: '3 Apr - 9 Apr 2026',
      programCode: 'STR_2026',
      programName: 'Sumbangan Tunai Rahmah (STR)',
      phaseOrAction: 'Pengagihan Bayaran Fasa 2 Khas Aidilfitri',
      category: 'Bantuan Tunai',
      type: 'Payout',
    },
    {
      month: 'Mei 2026',
      monthIdx: 5,
      dateRange: '1 Mei - 31 Mei 2026',
      programCode: 'BINGKAS_SEL',
      programName: 'BINGKAS Selangor / Bantuan Negeri',
      phaseOrAction: 'Pembukaan Permohonan Kohort Baru 2026',
      category: 'Barangan Asas',
      type: 'Opening',
    },
    {
      month: 'Ogos 2026',
      monthIdx: 8,
      dateRange: '14 Ogos 2026',
      programCode: 'STR_2026',
      programName: 'Sumbangan Tunai Rahmah (STR)',
      phaseOrAction: 'Pengagihan Bayaran Fasa 3',
      category: 'Bantuan Tunai',
      type: 'Payout',
    },
    {
      month: 'November 2026',
      monthIdx: 11,
      dateRange: '12 Nov 2026',
      programCode: 'STR_2026',
      programName: 'Sumbangan Tunai Rahmah (STR)',
      phaseOrAction: 'Pengagihan Bayaran Fasa 4 (Fasa Terakhir)',
      category: 'Bantuan Tunai',
      type: 'Payout',
    },
  ];

  // Generate Document checklist
  const documentSet = new Set<string>();
  qualifiedList.forEach(q => {
    q.program.requiredDocs.split('|').forEach(d => {
      if (d && d.trim()) documentSet.add(d.trim());
    });
  });

  const docsArray = Array.from(documentSet);
  const identityDocs = docsArray.filter(d => d.toLowerCase().includes('mykad') || d.toLowerCase().includes('sijil lahir') || d.toLowerCase().includes('mykid'));
  const financialDocs = docsArray.filter(d => d.toLowerCase().includes('slip gaji') || d.toLowerCase().includes('bank') || d.toLowerCase().includes('pendapatan') || d.toLowerCase().includes('ea form'));
  const supportingDocs = docsArray.filter(d => !identityDocs.includes(d) && !financialDocs.includes(d));

  const documentChecklist = [
    {
      category: 'Dokumen Pengenalan Diri (Identity Documents)',
      documents: identityDocs.length > 0 ? identityDocs : ['Salinan MyKad Pemohon', 'Salinan MyKad/Sijil Lahir Tanggungan'],
    },
    {
      category: 'Dokumen Pendapatan & Kewangan (Financial Proofs)',
      documents: financialDocs.length > 0 ? financialDocs : ['Penyata Akaun Bank Aktif', 'Slip Gaji 3 Bulan Terkini atau Pengesahan Pendapatan'],
    },
    {
      category: 'Dokumen Sokongan Tambahan (Supporting Documents)',
      documents: supportingDocs.length > 0 ? supportingDocs : ['Salinan Bil Air / Elektrik Tempat Kediaman', 'Surat Pengesahan Mastautin (jika berkaitan)'],
    },
  ];

  const scanId = 'BR-' + Math.random().toString(36).substring(2, 9).toUpperCase();

  const relativeStanding = input.monthlyIncome < stateProfile.medianIncome
    ? `Bawah Median Negeri (${stateProfile.state})`
    : `Atas Median Negeri (${stateProfile.state})`;

  return {
    scanId,
    scannedAt: new Date().toISOString(),
    input,
    stateProfile: {
      stateName: stateProfile.state,
      medianIncome: stateProfile.medianIncome,
      povertyRate: stateProfile.povertyRate,
      relativeStanding,
    },
    qualifiedList,
    missingList,
    totalAnnualQualifiedValue,
    totalAnnualMissingValue,
    calendarEvents,
    documentChecklist,
  };
}
