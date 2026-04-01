import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useDataStore } from '../store/dataStore';
import { usePermissions } from '../hooks/usePermissions';
import { Pencil, LogOut, Save, X, ChevronRight } from 'lucide-react';
import Toast from '../components/Toast';

const Profile: React.FC = () => {
  const { user, updateUser, logout } = useAuthStore();
  const { departments } = useDataStore();
  const { canRead, canWrite } = usePermissions();

  const canViewProfile = canRead('profile');
  const canEditProfile = canWrite('profile');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [toast, setToast] = useState<{message: string; type: 'success' | 'error' | 'info' | 'warning'; isOpen: boolean}>({message: '', type: 'success', isOpen: false});

  const [editData, setEditData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    birthDate: (user as any)?.birthDate || '',
    position: (user as any)?.position || '',
    bio: (user as any)?.bio || ''
  });

  const handleSave = async () => {
    if (!user) return;

    try {
      await updateUser(user.id, editData);
      setToast({message: 'تم حفظ التغييرات بنجاح', type: 'success', isOpen: true});
      setIsEditingProfile(false);
      setIsEditingPersonal(false);
    } catch (error) {
      setToast({message: 'فشل حفظ التغييرات', type: 'error', isOpen: true});
    }
  };

  const handleCancel = () => {
    setIsEditingProfile(false);
    setIsEditingPersonal(false);
    setEditData({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      birthDate: (user as any)?.birthDate || '',
      position: (user as any)?.position || '',
      bio: (user as any)?.bio || ''
    });
  };

  // Get role display name
  const getRoleDisplay = (role: string) => {
    const roles: Record<string, string> = {
      'super_admin': 'Super Admin',
      'general_manager': 'General Manager',
      'administrative_manager': 'Administrative Manager',
      'employee': 'Employee'
    };
    return roles[role] || role;
  };

  // Get avatar URL
  const getAvatarUrl = (name: string) => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3B82F6&color=fff&size=200`;
  };

  // Permission denied view
  if (!canViewProfile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-danger/10">
            <span className="text-3xl">🔒</span>
          </div>
          <h2 className="text-xl font-semibold text-black dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            You don't have permission to view this profile
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500 dark:text-gray-400">User not found</p>
      </div>
    );
  }

  // Split name for first/last name display
  const nameParts = user.name.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  return (
    <div className="mx-auto max-w-[970px]">
      {/* Breadcrumb */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-[26px] font-bold leading-[30px] text-black dark:text-white">
          Profile
        </h2>
        <nav>
          <ol className="flex items-center gap-2">
            <li className="text-sm text-gray-500 dark:text-gray-400">Home</li>
            <li>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </li>
            <li className="text-sm text-primary">Profile</li>
          </ol>
        </nav>
      </div>

      {/* Profile Section */}
      <div className="mb-6">
        <h3 className="mb-5 text-xl font-semibold text-black dark:text-white">
          Profile
        </h3>

        {/* Profile Card */}
        <div className="rounded-[10px] border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="p-6 lg:p-8">
            <div className="flex flex-col items-center gap-6 xl:flex-row xl:justify-between">
              {/* User Info */}
              <div className="flex flex-col items-center gap-5 xl:flex-row">
                {/* Avatar */}
                <div className="relative h-[100px] w-[100px] rounded-full">
                  <img
                    src={(user as any).avatar || getAvatarUrl(user.name)}
                    alt={user.name}
                    className="h-full w-full rounded-full object-cover"
                  />
                  <span className="absolute bottom-0 right-0 h-5 w-5 rounded-full border-[3px] border-white bg-meta-3 dark:border-boxdark"></span>
                </div>

                {/* Name & Role */}
                <div className="text-center xl:text-left">
                  <h4 className="mb-1 text-xl font-semibold text-black dark:text-white">
                    {user.name}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {(user as any).position || getRoleDisplay(user.role)}
                    {user.departmentId && (
                      <>
                        <span className="mx-2 text-gray-300 dark:text-gray-600">|</span>
                        {departments.find(d => d.id === user.departmentId)?.name || 'Department'}
                      </>
                    )}
                  </p>
                </div>
              </div>

              {/* Social & Edit Button */}
              <div className="flex flex-wrap items-center justify-center gap-3 xl:gap-4">
                {/* Social Icons */}
                <div className="flex items-center gap-2">
                  {/* Facebook */}
                  <button className="flex h-10 w-10 items-center justify-center rounded-full border border-stroke bg-gray-1 text-gray-600 transition-colors hover:border-primary hover:bg-primary hover:text-white dark:border-strokedark dark:bg-meta-4 dark:text-gray-300 dark:hover:border-primary dark:hover:bg-primary">
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                      <path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7v4h3V22h4v-8.5z"/>
                    </svg>
                  </button>

                  {/* X (Twitter) */}
                  <button className="flex h-10 w-10 items-center justify-center rounded-full border border-stroke bg-gray-1 text-gray-600 transition-colors hover:border-primary hover:bg-primary hover:text-white dark:border-strokedark dark:bg-meta-4 dark:text-gray-300 dark:hover:border-primary dark:hover:bg-primary">
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </button>

                  {/* LinkedIn */}
                  <button className="flex h-10 w-10 items-center justify-center rounded-full border border-stroke bg-gray-1 text-gray-600 transition-colors hover:border-primary hover:bg-primary hover:text-white dark:border-strokedark dark:bg-meta-4 dark:text-gray-300 dark:hover:border-primary dark:hover:bg-primary">
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                      <path d="M6.94 5a2 2 0 1 1-4-.002 2 2 0 0 1 4 .002zM7 8.48H3V21h4V8.48zm6.32 0H9.34V21h3.94v-6.57c0-3.66 4.77-4 4.77 0V21H22v-7.93c0-6.17-7.06-5.94-8.72-2.91l.04-1.68z"/>
                    </svg>
                  </button>

                  {/* Instagram */}
                  <button className="flex h-10 w-10 items-center justify-center rounded-full border border-stroke bg-gray-1 text-gray-600 transition-colors hover:border-primary hover:bg-primary hover:text-white dark:border-strokedark dark:bg-meta-4 dark:text-gray-300 dark:hover:border-primary dark:hover:bg-primary">
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2c2.717 0 3.056.01 4.122.06 1.065.05 1.79.217 2.428.465.66.254 1.216.598 1.772 1.153a4.908 4.908 0 0 1 1.153 1.772c.247.637.415 1.363.465 2.428.047 1.066.06 1.405.06 4.122 0 2.717-.01 3.056-.06 4.122-.05 1.065-.218 1.79-.465 2.428a4.883 4.883 0 0 1-1.153 1.772 4.915 4.915 0 0 1-1.772 1.153c-.637.247-1.363.415-2.428.465-1.066.047-1.405.06-4.122.06-2.717 0-3.056-.01-4.122-.06-1.065-.05-1.79-.218-2.428-.465a4.89 4.89 0 0 1-1.772-1.153 4.904 4.904 0 0 1-1.153-1.772c-.248-.637-.415-1.363-.465-2.428C2.013 15.056 2 14.717 2 12c0-2.717.01-3.056.06-4.122.05-1.066.217-1.79.465-2.428a4.88 4.88 0 0 1 1.153-1.772A4.897 4.897 0 0 1 5.45 2.525c.638-.248 1.362-.415 2.428-.465C8.944 2.013 9.283 2 12 2zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm6.5-.25a1.25 1.25 0 0 0-2.5 0 1.25 1.25 0 0 0 2.5 0zM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z"/>
                    </svg>
                  </button>
                </div>

                {/* Edit Button */}
                {canEditProfile && !isEditingProfile && (
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    className="flex items-center gap-2 rounded-md border border-stroke px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-gray-1 dark:border-strokedark dark:text-white dark:hover:bg-meta-4"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </button>
                )}

                {isEditingProfile && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSave}
                      className="flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
                    >
                      <Save className="h-4 w-4" />
                      Save
                    </button>
                    <button
                      onClick={handleCancel}
                      className="flex items-center gap-2 rounded-md border border-stroke px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-gray-1 dark:border-strokedark dark:text-white dark:hover:bg-meta-4"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Personal Information Section */}
      <div className="rounded-[10px] border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stroke px-6 py-5 dark:border-strokedark lg:px-8">
          <h4 className="text-xl font-semibold text-black dark:text-white">
            Personal Information
          </h4>
          {canEditProfile && !isEditingPersonal && (
            <button
              onClick={() => setIsEditingPersonal(true)}
              className="flex items-center gap-2 rounded-md border border-stroke px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-gray-1 dark:border-strokedark dark:text-white dark:hover:bg-meta-4"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </button>
          )}
          {isEditingPersonal && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
              >
                <Save className="h-4 w-4" />
                Save
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 rounded-md border border-stroke px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-gray-1 dark:border-strokedark dark:text-white dark:hover:bg-meta-4"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6 lg:p-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* First Name */}
            <div>
              <p className="mb-2.5 text-sm text-gray-500 dark:text-gray-400">
                First Name
              </p>
              {isEditingPersonal ? (
                <input
                  type="text"
                  value={editData.name.split(' ')[0] || ''}
                  onChange={(e) => {
                    const newFirstName = e.target.value;
                    const lastName = editData.name.split(' ').slice(1).join(' ');
                    setEditData({ ...editData, name: `${newFirstName} ${lastName}`.trim() });
                  }}
                  className="w-full rounded-md border border-stroke bg-gray-1 px-4 py-2.5 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                  placeholder="First Name"
                />
              ) : (
                <p className="text-base font-medium text-black dark:text-white">
                  {firstName || '-'}
                </p>
              )}
            </div>

            {/* Last Name */}
            <div>
              <p className="mb-2.5 text-sm text-gray-500 dark:text-gray-400">
                Last Name
              </p>
              {isEditingPersonal ? (
                <input
                  type="text"
                  value={editData.name.split(' ').slice(1).join(' ') || ''}
                  onChange={(e) => {
                    const firstName = editData.name.split(' ')[0] || '';
                    const newLastName = e.target.value;
                    setEditData({ ...editData, name: `${firstName} ${newLastName}`.trim() });
                  }}
                  className="w-full rounded-md border border-stroke bg-gray-1 px-4 py-2.5 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                  placeholder="Last Name"
                />
              ) : (
                <p className="text-base font-medium text-black dark:text-white">
                  {lastName || '-'}
                </p>
              )}
            </div>

            {/* Email Address */}
            <div>
              <p className="mb-2.5 text-sm text-gray-500 dark:text-gray-400">
                Email address
              </p>
              {isEditingPersonal ? (
                <input
                  type="email"
                  value={editData.email}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  className="w-full rounded-md border border-stroke bg-gray-1 px-4 py-2.5 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                  placeholder="Email address"
                />
              ) : (
                <p className="text-base font-medium text-black dark:text-white">
                  {user.email || '-'}
                </p>
              )}
            </div>

            {/* Phone */}
            <div>
              <p className="mb-2.5 text-sm text-gray-500 dark:text-gray-400">
                Phone
              </p>
              {isEditingPersonal ? (
                <input
                  type="tel"
                  value={editData.phone}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  className="w-full rounded-md border border-stroke bg-gray-1 px-4 py-2.5 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                  placeholder="Phone number"
                />
              ) : (
                <p className="text-base font-medium text-black dark:text-white">
                  {user.phone || '-'}
                </p>
              )}
            </div>

            {/* Bio */}
            <div className="md:col-span-2">
              <p className="mb-2.5 text-sm text-gray-500 dark:text-gray-400">
                Bio
              </p>
              {isEditingPersonal ? (
                <textarea
                  value={editData.bio}
                  onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                  rows={3}
                  className="w-full rounded-md border border-stroke bg-gray-1 px-4 py-2.5 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
                  placeholder="Write something about yourself..."
                />
              ) : (
                <p className="text-base font-medium text-black dark:text-white">
                  {(user as any).bio || (user as any).position || getRoleDisplay(user.role)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Account Actions */}
      <div className="mt-6">
        <button
          onClick={logout}
          className="flex items-center gap-2 rounded-md border border-danger px-4 py-2.5 text-sm font-medium text-danger transition-colors hover:bg-danger hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>

      {/* Toast */}
      <Toast
        message={toast.message}
        type={toast.type}
        isOpen={toast.isOpen}
        onClose={() => setToast({...toast, isOpen: false})}
      />
    </div>
  );
};

export default Profile;
