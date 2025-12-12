import { create } from "zustand";
import api from "../services/api";
import { useAuthStore } from "./authStore";
import {
  Department,
  Employee,
  Payroll,
  Revenue,
  Expense,
  Post,
  Company,
  Custody,
  Advance,
  ChatMessage,
  Task,
  DevTask,
  Notification,
  RegistrationRequest,
} from "../types";

interface DataState {
  companies: Company[];
  departments: Department[];
  employees: Employee[];
  payrolls: Payroll[];
  revenues: Revenue[];
  expenses: Expense[];
  posts: Post[];
  custodies: Custody[];
  advances: Advance[];
  chatMessages: ChatMessage[];
  tasks: Task[];
  devTasks: DevTask[];
  notifications: Notification[];
  registrationRequests: RegistrationRequest[];
  attendance: any[];
  complaints: any[];
  reviews: any[];
  leaveRequests: any[];
  isLoading: boolean;

  // Load Data
  loadDepartments: () => Promise<void>;
  loadEmployees: () => Promise<void>;
  loadPayrolls: () => Promise<void>;
  loadRevenues: () => Promise<void>;
  loadExpenses: () => Promise<void>;
  loadPosts: () => Promise<void>;
  loadTasks: () => Promise<void>;
  loadNotifications: () => Promise<void>;
  loadCustodies: () => Promise<void>;
  loadAttendance: (month?: number, year?: number) => Promise<void>;
  loadComplaints: () => Promise<void>;
  loadReviews: () => Promise<void>;
  loadLeaveRequests: () => Promise<void>;

  // Company Actions
  addCompany: (company: Omit<Company, "id" | "createdAt">) => Promise<void>;
  updateCompany: (id: string, company: Partial<Company>) => Promise<void>;
  deleteCompany: (id: string) => Promise<void>;

  // Department Actions
  addDepartment: (
    department: Omit<Department, "id" | "createdAt">
  ) => Promise<void>;
  updateDepartment: (
    id: string,
    department: Partial<Department>
  ) => Promise<void>;
  deleteDepartment: (id: string) => Promise<void>;

  // Employee Actions
  addEmployee: (
    employee: Omit<Employee, "id"> & Partial<Pick<Employee, "id">>
  ) => Promise<void>;
  updateEmployee: (id: string, employee: Partial<Employee>) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;

  // Payroll Actions
  addPayroll: (payroll: Omit<Payroll, "id" | "createdAt">) => Promise<void>;
  updatePayroll: (id: string, payroll: Partial<Payroll>) => Promise<void>;
  deletePayroll: (id: string) => Promise<void>;

  // Revenue Actions
  addRevenue: (revenue: Omit<Revenue, "id">) => Promise<void>;
  updateRevenue: (id: string, revenue: Partial<Revenue>) => Promise<void>;
  deleteRevenue: (id: string) => Promise<void>;

  addExpense: (expense: Omit<Expense, "id">) => Promise<void>;
  updateExpense: (id: string, expense: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;

  addPost: (
    post: Omit<Post, "id" | "createdAt" | "updatedAt" | "likes" | "comments">
  ) => Promise<void>;
  updatePost: (id: string, post: Partial<Post>) => Promise<void>;
  deletePost: (id: string) => Promise<void>;
  likePost: (postId: string, userId: string) => Promise<void>;

  // Custody Actions
  addCustody: (custody: Omit<Custody, "id">) => Promise<void>;
  updateCustody: (id: string, custody: Partial<Custody>) => Promise<void>;
  deleteCustody: (id: string) => Promise<void>;

  // Advance Actions
  addAdvance: (advance: Omit<Advance, "id">) => Promise<void>;
  updateAdvance: (id: string, advance: Partial<Advance>) => Promise<void>;
  deleteAdvance: (id: string) => Promise<void>;

  // Chat Actions
  loadMessages: () => Promise<void>;
  addChatMessage: (message: Omit<ChatMessage, "id">) => Promise<void>;
  markMessageAsRead: (id: string) => Promise<void>;

  // Task Actions
  addTask: (
    task: Omit<Task, "id" | "createdAt" | "updatedAt">
  ) => Promise<void>;
  updateTask: (id: string, task: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  addTaskComment: (taskId: string, content: string) => Promise<void>;

  // DevTask Actions
  loadDevTasks: () => Promise<void>;
  addDevTask: (
    task: Omit<DevTask, "id" | "createdAt" | "updatedAt">
  ) => Promise<void>;
  updateDevTask: (id: string, task: Partial<DevTask>) => Promise<void>;
  deleteDevTask: (id: string) => Promise<void>;
  updateDevTaskStatus: (id: string, status: DevTask["status"]) => Promise<void>;
  updateDevTaskTestingStatus: (
    id: string,
    testingStatus: DevTask["testingStatus"],
    notes?: string
  ) => Promise<void>;
  addDevTaskComment: (taskId: string, content: string) => Promise<void>;

  // Notification Actions
  addNotification: (
    notification: Omit<Notification, "id" | "createdAt">
  ) => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: (userId: string) => Promise<void>;

  // Attendance Actions
  addAttendance: (data: any) => Promise<void>;
  updateAttendance: (id: string, data: any) => Promise<void>;
  deleteAttendance: (id: string) => Promise<void>;

  // Complaint Actions
  addComplaint: (data: any) => Promise<void>;
  updateComplaint: (id: string, data: any) => Promise<void>;
  deleteComplaint: (id: string) => Promise<void>;

  // Review Actions
  addReview: (data: any) => Promise<void>;
  updateReview: (id: string, data: any) => Promise<void>;
  deleteReview: (id: string) => Promise<void>;
  addReviewComment: (reviewId: string, content: string) => Promise<void>;

  // Leave Request Actions
  addLeaveRequest: (data: any) => Promise<void>;
  updateLeaveRequestStatus: (
    id: string,
    status: string,
    reviewNotes?: string,
    deductFromEmergency?: boolean
  ) => Promise<void>;
  updateLeaveBalance: (
    employeeId: string,
    annual: number,
    emergency: number
  ) => Promise<void>;
  deleteLeaveRequest: (id: string) => Promise<void>;

  // Registration Actions
  addRegistrationRequest: (request: {
    companyName: string;
    contactName: string;
    email: string;
    phone: string;
    password: string;
    role: "admin" | "employee";
    attempts?: number;
  }) => Promise<void>;
}

export const useDataStore = create<DataState>((set, get) => ({
  companies: [],
  departments: [],
  employees: [],
  payrolls: [],
  revenues: [],
  expenses: [],
  posts: [],
  custodies: [],
  advances: [],
  chatMessages: [],
  tasks: [],
  devTasks: [],
  notifications: [],
  registrationRequests: [],
  attendance: [],
  complaints: [],
  reviews: [],
  leaveRequests: [],
  isLoading: false,

  // Load Functions
  loadDepartments: async () => {
    try {
      const response = await api.get("/departments");
      const departments = response.data.map((d: any) => ({
        ...d,
        id: d._id || d.id,
      }));
      set({ departments });
    } catch (error) {
      console.error("Failed to load departments:", error);
    }
  },

  loadEmployees: async () => {
    try {
      const response = await api.get("/employees");
      console.log("📥 API Response for employees:", response.data);
      const employees = response.data.map((e: any) => {
        let departmentId = e.departmentId;

        if (departmentId && typeof departmentId === "object") {
          departmentId = departmentId._id || departmentId.id;
        }

        return {
          ...e,
          id: e._id || e.id,
          departmentId: departmentId || null,
        };
      });
      console.log("✅ Employees loaded:", employees.length);
      set({ employees });
    } catch (error: any) {
      console.error(
        "❌ Failed to load employees:",
        error.response?.data || error.message
      );
      // Set empty array on error to prevent undefined issues
      set({ employees: [] });
    }
  },

  loadPayrolls: async () => {
    try {
      const response = await api.get("/payroll");
      set({ payrolls: response.data });
    } catch (error) {
      console.error("Failed to load payrolls:", error);
    }
  },

  loadRevenues: async () => {
    try {
      const response = await api.get("/revenues");
      set({ revenues: response.data });
    } catch (error) {
      console.error("Failed to load revenues:", error);
    }
  },

  loadExpenses: async () => {
    try {
      const response = await api.get("/expenses");
      set({ expenses: response.data });
    } catch (error) {
      console.error("Failed to load expenses:", error);
    }
  },

  loadPosts: async () => {
    try {
      const response = await api.get("/posts");
      const posts = response.data.map((p: any) => ({
        ...p,
        id: p._id || p.id,
        authorName: p.authorId?.name || p.authorName || "مجهول",
        likes: p.likes || [],
        comments: p.comments || [],
      }));
      set({ posts });
    } catch (error) {
      console.error("Failed to load posts:", error);
    }
  },

  loadTasks: async () => {
    try {
      const response = await api.get("/tasks");
      const tasks = response.data.map((t: any) => ({
        ...t,
        id: t._id || t.id,
        comments: t.comments || [],
      }));
      set({ tasks });
    } catch (error) {
      console.error("Failed to load tasks:", error);
    }
  },

  loadNotifications: async () => {
    try {
      const response = await api.get("/notifications");
      set({ notifications: response.data });
    } catch (error) {
      console.error("Failed to load notifications:", error);
    }
  },

  loadCustodies: async () => {
    try {
      const response = await api.get("/custody");
      set({ custodies: response.data });
    } catch (error) {
      console.error("Failed to load custodies:", error);
    }
  },

  loadAttendance: async (month, year) => {
    try {
      const params = month && year ? `?month=${month}&year=${year}` : "";
      console.log(`📥 Loading attendance: /attendance${params}`);
      const response = await api.get(`/attendance${params}`);
      const attendance = response.data.map((a: any) => ({
        ...a,
        id: a._id || a.id,
      }));
      console.log(`✅ Attendance loaded: ${attendance.length} records`);
      set({ attendance });
    } catch (error: any) {
      console.error(
        "❌ Failed to load attendance:",
        error.response?.data || error.message
      );
      set({ attendance: [] });
    }
  },

  loadComplaints: async () => {
    try {
      const response = await api.get("/complaints");
      set({ complaints: response.data });
    } catch (error) {
      console.error("Failed to load complaints:", error);
    }
  },

  loadReviews: async () => {
    try {
      const response = await api.get("/reviews");
      set({ reviews: response.data });
    } catch (error) {
      console.error("Failed to load reviews:", error);
    }
  },

  loadLeaveRequests: async () => {
    try {
      const response = await api.get("/leave-requests");
      set({ leaveRequests: response.data });
    } catch (error) {
      console.error("Failed to load leave requests:", error);
    }
  },

  // Department Actions
  addDepartment: async (department) => {
    try {
      await api.post("/departments", department);
      await get().loadDepartments();
    } catch (error) {
      console.error("Error adding department:", error);
      throw error;
    }
  },

  updateDepartment: async (id, department) => {
    await api.put(`/departments/${id}`, department);
    await get().loadDepartments();
  },

  deleteDepartment: async (id) => {
    await api.delete(`/departments/${id}`);
    set({ departments: get().departments.filter((d) => d.id !== id) });
  },

  // Employee Actions
  addEmployee: async (employee) => {
    try {
      await api.post("/employees", employee);
      await get().loadEmployees();
    } catch (error) {
      console.error("Error adding employee:", error);
      throw error;
    }
  },

  updateEmployee: async (id, employee) => {
    await api.put(`/employees/${id}`, employee);
    await get().loadEmployees();
  },

  deleteEmployee: async (id) => {
    await api.delete(`/employees/${id}`);
    set({ employees: get().employees.filter((e) => e.id !== id) });
  },

  // Payroll Actions
  addPayroll: async (payroll) => {
    const response = await api.post("/payroll", payroll);
    set({ payrolls: [...get().payrolls, response.data] });
  },

  updatePayroll: async (id, payroll) => {
    await api.put(`/payroll/${id}`, payroll);
    const updated = get().payrolls.map((p) =>
      p.id === id ? { ...p, ...payroll } : p
    );
    set({ payrolls: updated });
  },

  deletePayroll: async (id) => {
    await api.delete(`/payroll/${id}`);
    set({ payrolls: get().payrolls.filter((p) => p.id !== id) });
  },

  // Revenue Actions
  addRevenue: async (revenue) => {
    try {
      await api.post("/revenues", revenue);
      await get().loadRevenues();
    } catch (error) {
      console.error("Error adding revenue:", error);
      throw error;
    }
  },

  updateRevenue: async (id, revenue) => {
    try {
      await api.put(`/revenues/${id}`, revenue);
      await get().loadRevenues();
    } catch (error) {
      console.error("Error updating revenue:", error);
      throw error;
    }
  },

  deleteRevenue: async (id) => {
    await api.delete(`/revenues/${id}`);
    set({ revenues: get().revenues.filter((r) => r.id !== id) });
  },

  // Expense Actions
  addExpense: async (expense) => {
    try {
      await api.post("/expenses", expense);
      await get().loadExpenses();
    } catch (error) {
      console.error("Error adding expense:", error);
      throw error;
    }
  },

  updateExpense: async (id, expense) => {
    try {
      await api.put(`/expenses/${id}`, expense);
      await get().loadExpenses();
    } catch (error) {
      console.error("Error updating expense:", error);
      throw error;
    }
  },

  deleteExpense: async (id) => {
    await api.delete(`/expenses/${id}`);
    set({ expenses: get().expenses.filter((e) => e.id !== id) });
  },

  // Post Actions
  addPost: async (post) => {
    try {
      await api.post("/posts", post);
      await get().loadPosts();
    } catch (error) {
      console.error("Error adding post:", error);
      throw error;
    }
  },

  updatePost: async (id, post) => {
    try {
      await api.put(`/posts/${id}`, post);
      await get().loadPosts();
    } catch (error) {
      console.error("Error updating post:", error);
      throw error;
    }
  },

  deletePost: async (id) => {
    try {
      await api.delete(`/posts/${id}`);
      set({ posts: get().posts.filter((p) => p.id !== id) });
    } catch (error) {
      console.error("Error deleting post:", error);
      throw error;
    }
  },

  likePost: async (postId) => {
    try {
      await api.post(`/posts/${postId}/like`);
      await get().loadPosts();
    } catch (error) {
      console.error("Error liking post:", error);
      throw error;
    }
  },

  // Custody Actions
  addCustody: async (custody) => {
    try {
      await api.post("/custody", custody);
      await get().loadCustodies();
    } catch (error) {
      console.error("Error adding custody:", error);
      throw error;
    }
  },

  updateCustody: async (id, custody) => {
    await api.put(`/custody/${id}`, custody);
    const updated = get().custodies.map((c) =>
      c.id === id ? { ...c, ...custody } : c
    );
    set({ custodies: updated });
  },

  deleteCustody: async (id) => {
    await api.delete(`/custody/${id}`);
    set({ custodies: get().custodies.filter((c) => c.id !== id) });
  },

  // Advance Actions
  addAdvance: async (advance) => {
    try {
      await api.post("/advances", advance);
      // إعادة تحميل البيانات من الـ API
      const response = await api.get("/advances");
      set({ advances: response.data });
    } catch (error) {
      console.error("Error adding advance:", error);
      throw error;
    }
  },

  updateAdvance: async (id, advance) => {
    await api.put(`/advances/${id}`, advance);
    const updated = get().advances.map((a) =>
      a.id === id ? { ...a, ...advance } : a
    );
    set({ advances: updated });
  },

  deleteAdvance: async (id) => {
    await api.delete(`/advances/${id}`);
    set({ advances: get().advances.filter((a) => a.id !== id) });
  },

  // Chat Actions
  loadMessages: async () => {
    try {
      const response = await api.get("/messages");
      console.log("📥 Loaded messages from API:", response.data.length);
      const messages = response.data.map((m: any) => ({
        ...m,
        id: m._id || m.id,
        senderId: m.senderId?._id || m.senderId,
        receiverId: m.receiverId?._id || m.receiverId,
        timestamp: m.createdAt || m.timestamp,
      }));
      set({ chatMessages: messages });
    } catch (error) {
      console.error("Failed to load messages:", error);
    }
  },

  addChatMessage: async (message) => {
    try {
      console.log("📤 Sending message to API:", message);
      const response = await api.post("/messages", message);
      console.log("✅ API response:", response.status, response.data);
      const newMessage = {
        ...response.data,
        id: response.data._id || response.data.id,
        senderId: response.data.senderId,
        receiverId: response.data.receiverId,
        content: response.data.content,
        timestamp: response.data.createdAt || response.data.timestamp,
        isRead: response.data.isRead,
      };
      set({ chatMessages: [...get().chatMessages, newMessage] });
      console.log(
        "✅ Message added to store, total:",
        get().chatMessages.length
      );
    } catch (error: any) {
      console.error(
        "❌ Error sending message:",
        error.response?.data || error.message
      );
      throw error;
    }
  },

  markMessageAsRead: async (id) => {
    await api.put(`/messages/${id}/read`);
    const updated = get().chatMessages.map((m) =>
      m.id === id ? { ...m, isRead: true } : m
    );
    set({ chatMessages: updated });
  },

  // Task Actions
  addTask: async (task) => {
    try {
      await api.post("/tasks", task);
      await get().loadTasks(); // إعادة تحميل المهام
    } catch (error) {
      console.error("Error adding task:", error);
      throw error;
    }
  },

  updateTask: async (id, task) => {
    try {
      await api.put(`/tasks/${id}`, task);
      await get().loadTasks(); // إعادة تحميل المهام
    } catch (error) {
      console.error("Error updating task:", error);
      throw error;
    }
  },

  deleteTask: async (id) => {
    await api.delete(`/tasks/${id}`);
    set({ tasks: get().tasks.filter((t) => t.id !== id) });
  },

  addTaskComment: async (taskId, content) => {
    try {
      await api.post(`/tasks/${taskId}/comments`, { content });
      await get().loadTasks(); // إعادة تحميل المهام لتحديث التعليقات
    } catch (error) {
      console.error("Error adding task comment:", error);
      throw error;
    }
  },

  // DevTask Actions
  loadDevTasks: async () => {
    try {
      // Try API first
      const response = await api.get("/dev-tasks");
      const devTasks = response.data.map((t: any) => ({
        ...t,
        id: t._id || t.id,
        comments: t.comments || [],
        tags: t.tags || [],
        attachments: t.attachments || [],
      }));
      set({ devTasks });
      localStorage.setItem("gemawi-dev-tasks", JSON.stringify(devTasks));
    } catch (error) {
      // Fallback to localStorage
      console.log("Loading dev tasks from localStorage");
      const stored = localStorage.getItem("gemawi-dev-tasks");
      if (stored) {
        set({ devTasks: JSON.parse(stored) });
      }
    }
  },

  addDevTask: async (task) => {
    const user = useAuthStore.getState().user;
    const userName = user?.name || "Unknown User";
    const userId = user?.id || "";

    // إضافة سجل الإنشاء
    const creationModification = {
      id: Date.now().toString(),
      userId,
      userName,
      action: "created" as const,
      description: `أنشأ المهمة "${task.title}"`,
      timestamp: new Date(),
    };

    try {
      // Ensure assignedTo and assignedBy are present
      const taskToSend = {
        ...task,
        assignedTo: task.assignedTo || userId,
        assignedBy: task.assignedBy || userId,
      };

      console.log("📤 Sending dev task to API:", taskToSend);
      const response = await api.post("/dev-tasks", taskToSend);
      console.log("✅ Dev task saved successfully:", response.data);
      const newTask = {
        ...response.data,
        id: response.data._id || response.data.id,
        comments: [],
        tags: task.tags || [],
        attachments: task.attachments || [],
        modifications: [creationModification],
      };
      set((state) => ({ devTasks: [newTask, ...state.devTasks] }));
      // Save to localStorage
      const currentTasks = get().devTasks;
      localStorage.setItem("gemawi-dev-tasks", JSON.stringify(currentTasks));
    } catch (error: any) {
      // Fallback to localStorage
      console.error("❌ Error saving dev task to API:", error);
      console.log("💾 Saving dev task to localStorage instead");
      const newTask = {
        ...task,
        id: Date.now().toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
        modifications: [creationModification],
      };
      set((state) => ({
        devTasks: [newTask, ...state.devTasks],
      }));
      // Save to localStorage
      const currentTasks = get().devTasks;
      localStorage.setItem("gemawi-dev-tasks", JSON.stringify(currentTasks));
    }
  },

  updateDevTask: async (id, task) => {
    const user = useAuthStore.getState().user;
    const userName = user?.name || "Unknown User";
    const userId = user?.id || "";

    // إنشاء سجل التعديل
    const modification = {
      id: Date.now().toString(),
      userId,
      userName,
      action: "edited" as const,
      description: `عدّل تفاصيل المهمة`,
      timestamp: new Date(),
    };

    try {
      await api.put(`/dev-tasks/${id}`, task);
      set((state) => ({
        devTasks: state.devTasks.map((t) =>
          t.id === id
            ? {
                ...t,
                ...task,
                updatedAt: new Date(),
                modifications: [...(t.modifications || []), modification],
              }
            : t
        ),
      }));
      // Save to localStorage
      const currentTasks = get().devTasks;
      localStorage.setItem("gemawi-dev-tasks", JSON.stringify(currentTasks));
    } catch (error) {
      // Fallback to localStorage
      console.log("Updating dev task in localStorage");
      set((state) => ({
        devTasks: state.devTasks.map((t) =>
          t.id === id
            ? {
                ...t,
                ...task,
                updatedAt: new Date(),
                modifications: [...(t.modifications || []), modification],
              }
            : t
        ),
      }));
      // Save to localStorage
      const currentTasks = get().devTasks;
      localStorage.setItem("gemawi-dev-tasks", JSON.stringify(currentTasks));
    }
  },

  deleteDevTask: async (id) => {
    try {
      await api.delete(`/dev-tasks/${id}`);
      set((state) => ({
        devTasks: state.devTasks.filter((t) => t.id !== id),
      }));
      // Save to localStorage
      const currentTasks = get().devTasks;
      localStorage.setItem("gemawi-dev-tasks", JSON.stringify(currentTasks));
    } catch (error) {
      // Fallback to localStorage
      console.log("Deleting dev task from localStorage");
      set((state) => ({
        devTasks: state.devTasks.filter((t) => t.id !== id),
      }));
      // Save to localStorage
      const currentTasks = get().devTasks;
      localStorage.setItem("gemawi-dev-tasks", JSON.stringify(currentTasks));
    }
  },

  updateDevTaskStatus: async (id, status) => {
    const user = useAuthStore.getState().user;
    const userName = user?.name || "Unknown User";
    const userId = user?.id || "";

    const existingTask = get().devTasks.find((t) => t.id === id);
    const oldStatus = existingTask?.status || "";

    // إنشاء سجل تغيير الحالة
    const modification = {
      id: Date.now().toString(),
      userId,
      userName,
      action: "updated_status" as const,
      field: "status",
      oldValue: oldStatus,
      newValue: status,
      description: `غيّر الحالة من "${oldStatus}" إلى "${status}"`,
      timestamp: new Date(),
    };

    try {
      await api.patch(`/dev-tasks/${id}/status`, { status });
      set((state) => ({
        devTasks: state.devTasks.map((t) =>
          t.id === id
            ? {
                ...t,
                status,
                updatedAt: new Date(),
                completedDate:
                  status === "completed" ? new Date() : t.completedDate,
                modifications: [...(t.modifications || []), modification],
              }
            : t
        ),
      }));
      // Save to localStorage
      const currentTasks = get().devTasks;
      localStorage.setItem("gemawi-dev-tasks", JSON.stringify(currentTasks));
    } catch (error) {
      // Fallback to localStorage
      console.log("Updating dev task status in localStorage");
      set((state) => ({
        devTasks: state.devTasks.map((t) =>
          t.id === id
            ? {
                ...t,
                status,
                updatedAt: new Date(),
                completedDate:
                  status === "completed" ? new Date() : t.completedDate,
                modifications: [...(t.modifications || []), modification],
              }
            : t
        ),
      }));
      // Save to localStorage
      const currentTasks = get().devTasks;
      localStorage.setItem("gemawi-dev-tasks", JSON.stringify(currentTasks));
    }
  },

  updateDevTaskTestingStatus: async (id, testingStatus, notes) => {
    try {
      await api.patch(`/dev-tasks/${id}/testing`, {
        testingStatus,
        testingNotes: notes,
      });
      set((state) => ({
        devTasks: state.devTasks.map((t) =>
          t.id === id
            ? {
                ...t,
                testingStatus,
                testingNotes: notes || t.testingNotes,
                updatedAt: new Date(),
              }
            : t
        ),
      }));
      // Save to localStorage
      const currentTasks = get().devTasks;
      localStorage.setItem("gemawi-dev-tasks", JSON.stringify(currentTasks));
    } catch (error) {
      // Fallback to localStorage
      console.log("Updating dev task testing status in localStorage");
      set((state) => ({
        devTasks: state.devTasks.map((t) =>
          t.id === id
            ? {
                ...t,
                testingStatus,
                testingNotes: notes || t.testingNotes,
                updatedAt: new Date(),
              }
            : t
        ),
      }));
      // Save to localStorage
      const currentTasks = get().devTasks;
      localStorage.setItem("gemawi-dev-tasks", JSON.stringify(currentTasks));
    }
  },

  addDevTaskComment: async (taskId, content) => {
    try {
      await api.post(`/dev-tasks/${taskId}/comments`, { content });
      await get().loadDevTasks(); // إعادة تحميل المهام لتحديث التعليقات
    } catch (error) {
      console.error("Error adding dev task comment:", error);
      throw error;
    }
  },

  // Notification Actions
  addNotification: async (notification) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}`,
      createdAt: new Date(),
    };
    set({ notifications: [...get().notifications, newNotification] });
  },

  markNotificationAsRead: async (id) => {
    await api.put(`/notifications/${id}/read`);
    const updated = get().notifications.map((n) =>
      n.id === id ? { ...n, isRead: true } : n
    );
    set({ notifications: updated });
  },

  markAllNotificationsAsRead: async (userId) => {
    await api.put("/notifications/read-all");
    const updated = get().notifications.map((n) =>
      n.userId === userId ? { ...n, isRead: true } : n
    );
    set({ notifications: updated });
  },

  // Registration Actions
  addRegistrationRequest: async (request) => {
    const payload = {
      companyName: request.companyName,
      industry: "general",
      email: request.email,
      phone: request.phone,
      adminName: request.contactName,
      password: request.password,
      subscriptionPlan: "basic",
      subscriptionDuration: 3,
    } as const;

    const response = await api.post("/register", payload);

    const newReq: RegistrationRequest = {
      id: response.data?.id || response.data?._id || `reg-${Date.now()}`,
      companyName: request.companyName,
      contactName: request.contactName,
      email: request.email,
      phone: request.phone,
      password: "",
      role: request.role === "admin" ? "general_manager" : "employee",
      status: "pending",
      attempts: request.attempts ?? 1,
      createdAt: new Date(),
      notes: undefined,
    };

    set({ registrationRequests: [...get().registrationRequests, newReq] });
  },

  // Company Actions
  addCompany: async (company) => {
    const response = await api.post("/companies", company);
    set({ companies: [...get().companies, response.data] });
  },

  updateCompany: async (id, company) => {
    await api.put(`/companies/${id}`, company);
    const updated = get().companies.map((c) =>
      c.id === id ? { ...c, ...company } : c
    );
    set({ companies: updated });
  },

  deleteCompany: async (id) => {
    await api.delete(`/companies/${id}`);
    set({ companies: get().companies.filter((c) => c.id !== id) });
  },

  // Attendance Actions
  addAttendance: async (data) => {
    const response = await api.post("/attendance", data);
    const newRecord = {
      ...response.data,
      id: response.data._id || response.data.id,
    };
    set({ attendance: [...get().attendance, newRecord] });
  },

  updateAttendance: async (id, data) => {
    await api.put(`/attendance/${id}`, data);
    // إعادة تحميل البيانات من API للتأكد من التحديث
    await get().loadAttendance(data.month + 1, data.year);
  },

  deleteAttendance: async (id) => {
    await api.delete(`/attendance/${id}`);
    set({ attendance: get().attendance.filter((a) => a.id !== id) });
  },

  // Complaint Actions
  addComplaint: async (data) => {
    const response = await api.post("/complaints", data);
    set({ complaints: [...get().complaints, response.data] });
  },

  updateComplaint: async (id, data) => {
    await api.put(`/complaints/${id}`, data);
    const updated = get().complaints.map((c) =>
      c.id === id ? { ...c, ...data } : c
    );
    set({ complaints: updated });
  },

  deleteComplaint: async (id) => {
    await api.delete(`/complaints/${id}`);
    set({ complaints: get().complaints.filter((c) => c.id !== id) });
  },

  // Review Actions
  addReview: async (data) => {
    const response = await api.post("/reviews", data);
    set({ reviews: [...get().reviews, response.data] });
  },

  updateReview: async (id, data) => {
    await api.put(`/reviews/${id}`, data);
    const updated = get().reviews.map((r) =>
      r.id === id ? { ...r, ...data } : r
    );
    set({ reviews: updated });
  },

  deleteReview: async (id) => {
    await api.delete(`/reviews/${id}`);
    set({ reviews: get().reviews.filter((r) => r.id !== id) });
  },

  addReviewComment: async (reviewId, content) => {
    try {
      await api.post(`/reviews/${reviewId}/comments`, { content });
      await get().loadReviews();
    } catch (error) {
      console.error("Error adding review comment:", error);
      throw error;
    }
  },

  // Leave Request Actions
  addLeaveRequest: async (data) => {
    await api.post("/leave-requests", data);
    await get().loadLeaveRequests();
    await get().loadEmployees();
  },

  updateLeaveRequestStatus: async (
    id,
    status,
    reviewNotes,
    deductFromEmergency
  ) => {
    await api.patch(`/leave-requests/${id}/status`, {
      status,
      reviewNotes,
      deductFromEmergency,
    });
    await get().loadLeaveRequests();
    await get().loadEmployees();
  },

  updateLeaveBalance: async (employeeId, annual, emergency) => {
    await api.patch("/leave-requests/balance", {
      employeeId,
      annual,
      emergency,
    });
    await get().loadEmployees();
  },

  deleteLeaveRequest: async (id) => {
    await api.delete(`/leave-requests/${id}`);
    set({ leaveRequests: get().leaveRequests.filter((r) => r.id !== id) });
  },
}));
