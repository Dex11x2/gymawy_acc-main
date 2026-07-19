import React, { useState, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { useDataStore } from '../store/dataStore';
import { Pencil, LogOut, Save, X, ChevronRight, Camera, Loader2 } from 'lucide-react';
import Toast from '../components/Toast';
import api from '../services/api';

// Downscale the picked image to a 256px square JPEG data-URL so the upload
// stays tiny regardless of the original photo size.
const fileToAvatarDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const SIZE = 256;
      const canvas = document.createElement('canvas');
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('canvas'));
      const scale = Math.max(SIZE / img.width, SIZE / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (SIZE - w) / 2, (SIZE - h) / 2, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('load')); };
    img.src = url;
  });

const Profile: React.FC = () => {
  const { user, updateUser, logout, setUser } = useAuthStore();
  const { departments } = useDataStore();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleAvatarPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user) return;
    try {
      setUploadingAvatar(true);
      const avatar = await fileToAvatarDataUrl(file);
      await api.patch('/auth/me/avatar', { avatar });
      setUser({ ...(user as any), avatar });
      setToast({ message: 'تم تحديث صورة البروفايل', type: 'success', isOpen: true });
    } catch {
      setToast({ message: 'فشل رفع الصورة — جرب صورة أخرى', type: 'error', isOpen: true });
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Profile page always renders the LOGGED-IN user's own profile, so no
  // permission gate is needed. Permissions decide cross-user access elsewhere.
  const canEditProfile = true;
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
      'dev': 'Dev',
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
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    title="تغيير صورة البروفايل"
                    className="absolute bottom-0 left-0 flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-white shadow-lg hover:bg-brand-600 disabled:opacity-60"
                  >
                    {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarPick}
                    className="hidden"
                  />
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

              {/* Edit Button */}
              <div className="flex flex-wrap items-center justify-center gap-3 xl:gap-4">
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stroke px-6 py-5 dark:border-strokedark lg:px-8">
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
                <p className="text-base font-medium text-black dark:text-white break-words">
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
