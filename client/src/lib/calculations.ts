import { Month } from './types';

// Helper to get month number
export const monthToNumber = (month: Month): number => {
    const months: Month[] = [
        'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
        'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
    ];
    return months.indexOf(month) + 1;
};

export interface DistributorMetrics {
    venitTVA: number;
    achizitieTVA: number;
    comisionPercent: number;
    cheltuieliMarketing: number;
    costTransport: number;
    costAmbalare: number;
    adaosTVA: number;
    tva: number;
    adaosFaraTVA: number;
    comisionValoare: number;
    profitNet: number;
}

export const calculateDistributorMetrics = (data: any): DistributorMetrics => {
    const venitTVA = parseFloat(data.venitTVA || "0");
    const achizitieTVA = parseFloat(data.achizitieTVA || "0");
    const comisionPercent = parseFloat(data.comisionPercent || "0");
    const cheltuieliMarketing = parseFloat(data.cheltuieliMarketing || "0");
    const costTransport = parseFloat(data.costTransport || "0");
    const costAmbalare = parseFloat(data.costAmbalare || "0");

    // Adaos cu TVA (marja brută care include TVA)
    const adaosTVA = venitTVA - achizitieTVA;
    // TVA = 21% din adaos cu TVA
    const tva = adaosTVA * 0.21;
    // Adaos fără TVA = Adaos cu TVA - TVA (79% din adaos cu TVA)
    const adaosFaraTVA = adaosTVA - tva;
    const comisionValoare = venitTVA * (comisionPercent / 100);

    // Note: costProductie and costIndirecte are now handled on server or in a larger report
    // For individual distributor editing, we might only show local metrics or fetch from report

    const profitNet = adaosFaraTVA - comisionValoare - cheltuieliMarketing - costTransport - costAmbalare;

    return {
        venitTVA,
        achizitieTVA,
        comisionPercent,
        cheltuieliMarketing,
        costTransport,
        costAmbalare,
        adaosTVA,
        tva,
        adaosFaraTVA,
        comisionValoare,
        profitNet
    };
};
