export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'super_admin' | 'general_manager' | 'administrative_manager' | 'employee';
  companyId?: string;
  departmentId?: string;
  isActive: boolean;
  isOnline: boolean;
  permissions: Permission[];
  profileImage?: string;
  language: 'ar' | 'en';
  createdAt: Date;
  updatedAt: Date;
}

export interface Permission {
  module: string;
  actions: string[];
}

export interface Company {
  id: string;
  name: string;
  adminId: string;
  subscriptionStart: Date;
  subscriptionEnd: Date;
  subscriptionDuration: 3 | 6 | 12;
  isActive: boolean;
  customAppName?: string;
  baseCurrency: 'EGP' | 'USD' | 'SAR' | 'AED';
  supportedCurrencies?: ('EGP' | 'USD' | 'SAR' | 'AED')[];
  exchangeRates?: {
    EGP: number;
    USD: number;
    SAR: number;
    AED: number;
  };
  generalManagerId?: string;
  administrativeManagerId?: string;
  createdAt: Date;
}

export interface Department {
  id: string;
  name: string;
  companyId: string;
  description?: string;
  createdAt: Date;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  departmentId: string;
  companyId: string;
  salary: number;
  salaryCurrency: 'EGP' | 'USD' | 'SAR' | 'AED';
  salaryType: 'fixed' | 'variable';
  hireDate: Date;
  isActive: boolean;
  permissions: Permission[];
  isGeneralManager?: boolean;
  isAdministrativeManager?: boolean;
  leaveBalance?: {
    annual: number;
    emergency: number;
  };
}

export interface Payroll {
  id: string;
  employeeId: string;
  month: number;
  year: number;
  baseSalary: number;
  bonuses: number;
  deductions: number;
  netSalary: number;
  currency?: 'EGP' | 'USD' | 'SAR' | 'AED';
  type: 'fixed' | 'variable';
  notes?: string;
  createdAt: Date;
}

export interface Revenue {
  id: string;
  companyId: string;
  amount: number;
  currency: 'EGP' | 'USD' | 'SAR' | 'AED';
  exchangeRate: number;
  baseAmount: number; // المبلغ محول للجنيه المصري
  description: string;
  date: Date;
  category: string;
  source: string;
  notes?: string;
  createdBy: string;
  departmentId?: string; // ربط بالقسم
}

export interface Expense {
  id: string;
  companyId: string;
  amount: number;
  currency: 'EGP' | 'USD' | 'SAR' | 'AED';
  exchangeRate: number;
  baseAmount: number; // المبلغ محول للجنيه المصري
  description: string;
  date: Date;
  category: string;
  notes?: string;
  type: 'operational' | 'capital';
  createdBy: string;
  departmentId?: string; // ربط بالقسم
  approvedBy?: string; // من وافق على المصروف
  receiptNumber?: string; // رقم الإيصال
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: Date;
  isRead: boolean;
  attachments?: MessageAttachment[];
  replyTo?: string;
}

export interface MessageAttachment {
  id: string;
  type: 'image' | 'file';
  name: string;
  url: string;
  size: number;
  mimeType: string;
}

export interface Post {
  id: string;
  authorId: string;
  companyId: string;
  content: string;
  targetDepartment?: string;
  likes: string[];
  comments: Comment[];
  images?: string[];
  attachments?: PostAttachment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PostAttachment {
  id: string;
  type: 'pdf' | 'excel' | 'word' | 'image' | 'other';
  name: string;
  url: string;
  size: number;
}

export interface Comment {
  id: string;
  authorId: string;
  content: string;
  image?: string;
  createdAt: Date;
}

export interface TaskComment {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: Date;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  assignedBy: string;
  departmentId?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  dueDate: Date;
  completedDate?: Date;
  comments: TaskComment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskModification {
  id: string;
  userId: string;
  userName: string;
  action: 'created' | 'updated_status' | 'updated_testing' | 'edited' | 'commented' | 'assigned';
  field?: string;
  oldValue?: string;
  newValue?: string;
  description: string;
  timestamp: Date;
}

export interface DevTask {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  assignedBy: string;
  priority: number;
  status: 'pending' | 'in_progress' | 'testing' | 'completed' | 'blocked';
  startDate?: Date;
  dueDate: Date;
  completedDate?: Date;
  testingStatus: 'not_tested' | 'testing' | 'passed' | 'failed';
  testingNotes?: string;
  deploymentReady: boolean;
  tags?: string[];
  attachments?: Attachment[];
  comments: TaskComment[];
  modifications: TaskModification[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: 'link' | 'file' | 'image';
  uploadedAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'task' | 'salary' | 'subscription' | 'message' | 'post';
  title: string;
  message: string;
  isRead: boolean;
  link?: string;
  createdAt: Date;
}

export interface ExchangeRate {
  currency: 'EGP' | 'USD' | 'SAR' | 'AED';
  rate: number;
  lastUpdated: Date;
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  timestamp: Date;
}

export interface Custody {
  id: string;
  companyId: string;
  employeeId: string;
  type: 'material' | 'financial';
  itemName: string;
  amount?: number;
  currency?: 'EGP' | 'SAR' | 'USD';
  status: 'active' | 'returned';
  issueDate: Date;
  returnDate?: Date;
  notes?: string;
}

export interface Advance {
  id: string;
  companyId: string;
  employeeId: string;
  amount: number;
  currency: 'EGP' | 'SAR' | 'USD';
  reason: string;
  requestDate: Date;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  approvedBy?: string;
  paidDate?: Date;
  date: Date;
  deductedFromSalary: boolean;
}

export interface RegistrationRequest {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  password: string;
  role: 'super_admin' | 'general_manager' | 'administrative_manager' | 'employee';
  status: 'pending' | 'approved' | 'rejected';
  attempts?: number;
  createdAt: Date;
  notes?: string;
}

export interface Complaint {
  id: string;
  userId: string;
  userName: string;
  companyId: string;
  type: 'complaint' | 'suggestion' | 'technical_issue';
  title: string;
  description: string;
  recipientType: 'general_manager' | 'administrative_manager' | 'technical_support';
  recipientId: string;
  status: 'pending' | 'in-progress' | 'resolved' | 'rejected';
  response?: string;
  respondedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  companyId: string;
  date: Date;
  checkIn?: Date;
  checkOut?: Date;
  workHours?: number;
  overtime?: number;
  status: 'present' | 'late' | 'absent' | 'leave' | 'official_holiday';
  leaveType?: 'annual' | 'emergency' | 'sick' | 'unpaid';
  lateMinutes: number;
  notes?: string;
  confirmed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MonthlyAttendanceReport {
  employeeId: string;
  employeeName: string;
  month: number;
  year: number;
  presentDays: number;
  absentDays: number;
  annualLeaveDays: number;
  emergencyLeaveDays: number;
  sickLeaveDays: number;
  officialHolidayDays: number;
  lateDays: number;
  totalLateMinutes: number;
  totalWorkHours: number;
  totalOvertime: number;
  remainingAnnualLeave: number;
  remainingEmergencyLeave: number;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: 'annual' | 'emergency' | 'sick' | 'unpaid';
  startDate: Date;
  endDate: Date;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
  deductedFromEmergency?: boolean;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
}
