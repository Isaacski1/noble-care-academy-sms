with open("types.ts", "r", encoding="utf-8") as f:
    content = f.read()

old = """export interface SchoolConfig {
    schoolId: string;
    schoolName: string;
    academicYear: string;
    currentTerm: string;
    headTeacherRemark: string;
    termEndDate: string;
    schoolReopenDate: string;
    vacationDate: string;
    address?: string;
    phone?: string;
    email?: string;
    logoUrl?: string;
    nextTermBegins: string;
    termTransitionProcessed: boolean;
    holidayDates?: { date: string; reason?: string }[];
    passMark?: number;
    failMark?: number;
    isPromotionalTerm?: boolean;
    gradingScale?: {
      A: number;
      B: number;
      C: number;
      D: number;
    };
    positionRule?: "total" | "average" | "subject";
    classRooms?: ClassRoom[];
    reportCardSettings?: ReportCardSettings;
    notificationSettings?: {
      adminWhatsAppNumber?: string;
      adminSmsNumber?: string;
      enableWhatsAppNotifications?: boolean;
      enableSmsNotifications?: boolean;
      enablePaymentAlerts?: boolean;
      enableInvoiceNotifications?: boolean;
    };
  }
    assessmentScoreWeights?: {
      testScore: number;
      homeworkScore: number;
      projectScore: number;
      examScore: number;
    };
  }"""

new = """export interface SchoolConfig {
    schoolId: string;
    schoolName: string;
    academicYear: string;
    currentTerm: string;
    headTeacherRemark: string;
    termEndDate: string;
    schoolReopenDate: string;
    vacationDate: string;
    address?: string;
    phone?: string;
    email?: string;
    logoUrl?: string;
    nextTermBegins: string;
    termTransitionProcessed: boolean;
    holidayDates?: { date: string; reason?: string }[];
    passMark?: number;
    failMark?: number;
    isPromotionalTerm?: boolean;
    gradingScale?: {
      A: number;
      B: number;
      C: number;
      D: number;
    };
    positionRule?: "total" | "average" | "subject";
    classRooms?: ClassRoom[];
    reportCardSettings?: ReportCardSettings;
    notificationSettings?: {
      adminWhatsAppNumber?: string;
      adminSmsNumber?: string;
      enableWhatsAppNotifications?: boolean;
      enableSmsNotifications?: boolean;
      enablePaymentAlerts?: boolean;
      enableInvoiceNotifications?: boolean;
    };
    assessmentScoreWeights?: {
      testScore: number;
      homeworkScore: number;
      projectScore: number;
      examScore: number;
    };
  }"""

content = content.replace(old, new)

with open("types.ts", "w", encoding="utf-8") as f:
    f.write(content)
print("Fixed")
