export interface Metric {
  name: string;
  value: string;
  unit: string;
  referenceRange: string;
  status: 'normal' | 'abnormal' | 'critical' | 'pending';
  interpretation: string;
  clinicalSignificance?: string;
  unitMismatchCorrection?: string;
}

export interface PreventionPlan {
  category: 'diet' | 'exercise' | 'lifestyle' | 'wellness';
  title: string;
  description: string;
  action: string;
}

export interface TraditionalRemedy {
  name: string;
  description: string;
  context: string;
}

export interface AnalysisData {
  status: 'success' | 'error';
  summary: string;
  metrics?: Metric[];
  conditions?: string[];
  associatedSymptoms?: string[];
  preventionPlan?: PreventionPlan[];
  traditionalRemedies?: TraditionalRemedy[];
  concerns?: string[];
  nextSteps?: string[];
  healthTrends?: string;
  medicineInfo?: {
    indications: string[];
    sideEffects: string[];
    interactions: string[];
    genericAlternatives: string[];
    safeUsage: string;
    warnings: string[];
    doctorQuestions: string[];
  };
}
