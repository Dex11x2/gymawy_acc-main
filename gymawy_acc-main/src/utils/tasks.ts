// منطق موحّد لإبراز المهام (غير مشاهد / متأخر / يحتاج انتباه / ترتيب)

export const empIdOf = (ref: any): string => String(ref?._id || ref?.id || ref || '');

export const isTaskOverdue = (task: any): boolean => {
  if (!task?.dueDate) return false;
  if (task.status === 'completed' || task.status === 'cancelled') return false;
  const due = new Date(task.dueDate);
  due.setHours(23, 59, 59, 999);
  return due.getTime() < Date.now();
};

// فيه تغيير جديد (من طرف آخر) لم يشاهده المستخدم الحالي
export const hasUnseenTask = (task: any, userId?: string): boolean => {
  const acts = task?.activities || [];
  if (!acts.length) return false;
  const last = acts[acts.length - 1];
  if (String(last.byId) === String(userId)) return false;
  const lastTime = new Date(last.createdAt).getTime();
  const seen = (task.seenBy || []).find((s: any) => String(s.userId) === String(userId));
  if (!seen) return true;
  return lastTime > new Date(seen.seenAt).getTime();
};

export const isIncomingTask = (task: any, myEmpId?: string): boolean =>
  !!myEmpId && empIdOf(task.assignedTo) === String(myEmpId);

export const isSentTask = (task: any, myEmpId?: string): boolean =>
  !!myEmpId && empIdOf(task.assignedBy) === String(myEmpId);

// يحتاج انتباهي: وارد لي ومعلّق/قيد التنفيذ، أو أي مهمة فيها تغيير جديد لم أشاهده
export const taskNeedsAttention = (task: any, myEmpId?: string, userId?: string): boolean => {
  const activeIncoming = isIncomingTask(task, myEmpId) && (task.status === 'pending' || task.status === 'in_progress');
  return hasUnseenTask(task, userId) || activeIncoming;
};

export const attentionCount = (tasks: any[], myEmpId?: string, userId?: string): number =>
  (tasks || []).filter((t) => taskNeedsAttention(t, myEmpId, userId)).length;

const priorityRank: Record<string, number> = { high: 0, medium: 1, low: 2 };

// ترتيب حسب الإلحاح: غير مشاهد → متأخر → أولوية → تاريخ الاستحقاق
export const sortTasksByUrgency = (tasks: any[], userId?: string): any[] =>
  [...(tasks || [])].sort((a, b) => {
    const ua = hasUnseenTask(a, userId) ? 0 : 1;
    const ub = hasUnseenTask(b, userId) ? 0 : 1;
    if (ua !== ub) return ua - ub;
    const oa = isTaskOverdue(a) ? 0 : 1;
    const ob = isTaskOverdue(b) ? 0 : 1;
    if (oa !== ob) return oa - ob;
    const pa = priorityRank[a.priority] ?? 3;
    const pb = priorityRank[b.priority] ?? 3;
    if (pa !== pb) return pa - pb;
    return new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime();
  });
