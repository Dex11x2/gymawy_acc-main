// Automatic backup utility
export const createBackup = () => {
  const data = {
    users: localStorage.getItem('gemawi-users'),
    companies: localStorage.getItem('gemawi-companies'),
    departments: localStorage.getItem('gemawi-departments'),
    employees: localStorage.getItem('gemawi-employees'),
    revenues: localStorage.getItem('gemawi-revenues'),
    expenses: localStorage.getItem('gemawi-expenses'),
    payrolls: localStorage.getItem('gemawi-payrolls'),
    posts: localStorage.getItem('gemawi-posts'),
    messages: localStorage.getItem('gemawi-messages'),
    tasks: localStorage.getItem('gemawi-tasks'),
    timestamp: new Date().toISOString()
  };

  const backup = JSON.stringify(data, null, 2);
  const blob = new Blob([backup], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gemawi-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

export const restoreBackup = (file: File): Promise<void> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        Object.keys(data).forEach(key => {
          if (key !== 'timestamp' && data[key]) {
            localStorage.setItem(key, data[key]);
          }
        });
        resolve();
      } catch (error) {
        reject(error);
      }
    };
    reader.readAsText(file);
  });
};

export const autoBackup = () => {
  const lastBackup = localStorage.getItem('last-backup');
  const now = new Date().getTime();
  const dayInMs = 24 * 60 * 60 * 1000;

  if (!lastBackup || now - parseInt(lastBackup) > dayInMs) {
    createBackup();
    localStorage.setItem('last-backup', now.toString());
  }
};
