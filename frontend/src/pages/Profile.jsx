import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Profile() {
  const { showToast } = useToast();
  const { user, editProfile, changePassword, deleteAccount } = useContext(AuthContext);

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profilePhoto, setProfilePhoto] = useState(user?.profile_photo || '');
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleEditProfile = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    if (!name.trim() || !email.trim()) {
      setProfileError('Name and Email are required.');
      return;
    }

    setProfileLoading(true);
    try {
      await editProfile(name.trim(), email.trim(), profilePhoto.trim());
      setProfileSuccess('Profile updated successfully.');
      showToast('Profile details updated successfully.', 'success');
    } catch (err) {
      setProfileError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwdError('Please fill in all password fields.');
      return;
    }

    if (newPassword.length < 6) {
      setPwdError('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwdError('Passwords do not match.');
      return;
    }

    setPwdLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPwdSuccess('Password changed successfully.');
      showToast('Password updated successfully.', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPwdError(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setPwdLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      await deleteAccount();
      showToast('Account permanently deleted.', 'info');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete account.', 'error');
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="flex-grow bg-bg-main text-text-primary p-6 md:p-12 relative overflow-hidden flex flex-col min-h-0 animate-fade-in">
      <div className="max-w-4xl mx-auto w-full relative z-10 space-y-8 flex flex-col flex-grow min-h-0 animate-slide-up">
        
        {/* Header Title */}
        <header className="border-b border-border-main pb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">Account Profile</h1>
          <p className="text-text-secondary mt-1 text-sm">Update account details, security credentials, and settings</p>
        </header>

        {/* Profile Card & Editing grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Card Left: Profile summary */}
          <div className="card-premium p-6 text-center shadow-sm h-fit bg-white">
            <div className="relative inline-block mb-4">
              {profilePhoto ? (
                <img
                  src={profilePhoto}
                  alt="Profile Avatar"
                  className="w-28 h-28 rounded-full object-cover mx-auto border-2 border-accent-blue shadow-sm"
                />
              ) : (
                <div className="w-28 h-28 bg-accent-blue rounded-full flex items-center justify-center font-bold text-4xl text-white mx-auto shadow-sm border-2 border-border-main">
                  {user?.name ? user.name[0].toUpperCase() : 'U'}
                </div>
              )}
            </div>
            
            <h2 className="text-xl font-bold tracking-tight text-text-primary">{user?.name}</h2>
            <p className="text-text-secondary text-sm mt-1">@{user?.username}</p>
            
            <div className="mt-6 pt-6 border-t border-border-main text-left space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">Email:</span>
                <span className="text-text-primary font-medium truncate max-w-[150px]">{user?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Joined Date:</span>
                <span className="text-text-primary font-medium">{user?.created_at?.split(' ')[0] || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Card Right: Forms */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Form 1: Edit Profile Details */}
            <section className="card-premium p-6 shadow-sm bg-white">
              <h3 className="text-lg font-bold text-text-primary mb-6">Profile Settings</h3>
              
              {profileError && (
                <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm animate-fade-in">
                  {profileError}
                </div>
              )}
              {profileSuccess && (
                <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm animate-fade-in">
                  {profileSuccess}
                </div>
              )}

              <form onSubmit={handleEditProfile} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-text-secondary text-xs font-semibold uppercase tracking-wider" htmlFor="edit-name">
                      Full Name
                    </label>
                    <input
                      id="edit-name"
                      type="text"
                      className="w-full input-premium"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-text-secondary text-xs font-semibold uppercase tracking-wider" htmlFor="edit-email">
                      Email Address
                    </label>
                    <input
                      id="edit-email"
                      type="email"
                      className="w-full input-premium"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-text-secondary text-xs font-semibold uppercase tracking-wider" htmlFor="edit-photo">
                    Profile Photo URL
                  </label>
                  <input
                    id="edit-photo"
                    type="text"
                    placeholder="https://images.example.com/avatar.jpg"
                    className="w-full input-premium"
                    value={profilePhoto}
                    onChange={(e) => setProfilePhoto(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={profileLoading}
                  className="btn-base btn-primary cursor-pointer"
                >
                  {profileLoading ? 'Saving...' : 'Save Profile'}
                </button>
              </form>
            </section>

            {/* Form 2: Change Password */}
            <section className="card-premium p-6 shadow-sm bg-white">
              <h3 className="text-lg font-bold text-text-primary mb-6">Security Settings (Password)</h3>

              {pwdError && (
                <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm animate-fade-in">
                  {pwdError}
                </div>
              )}
              {pwdSuccess && (
                <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm animate-fade-in">
                  {pwdSuccess}
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-text-secondary text-xs font-semibold uppercase tracking-wider" htmlFor="curr-password">
                    Current Password
                  </label>
                  <input
                    id="curr-password"
                    type="password"
                    placeholder="••••••••"
                    className="w-full input-premium"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-text-secondary text-xs font-semibold uppercase tracking-wider" htmlFor="n-password">
                      New Password
                    </label>
                    <input
                      id="n-password"
                      type="password"
                      placeholder="••••••••"
                      className="w-full input-premium"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-text-secondary text-xs font-semibold uppercase tracking-wider" htmlFor="conf-password">
                      Confirm New Password
                    </label>
                    <input
                      id="conf-password"
                      type="password"
                      placeholder="••••••••"
                      className="w-full input-premium"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={pwdLoading}
                  className="btn-base btn-primary cursor-pointer"
                >
                  {pwdLoading ? 'Updating...' : 'Change Password'}
                </button>
              </form>
            </section>

            {/* Danger Zone: Delete Account */}
            <section className="border border-btn-absent/20 bg-rose-50/20 rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-btn-absent mb-2">Danger Zone</h3>
              <p className="text-text-secondary text-sm mb-6 opacity-85">
                Deleting your account will permanently wipe your profile information, settings, and all attendance logs. This action cannot be undone.
              </p>

              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="btn-base btn-absent cursor-pointer"
                >
                  Delete Account...
                </button>
              ) : (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in">
                  <span className="text-sm font-semibold text-rose-700">Are you absolutely sure you want to proceed?</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="btn-base btn-cancel h-[36px] px-4 cursor-pointer text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleteLoading}
                      className="btn-base btn-absent h-[36px] px-4 cursor-pointer text-xs"
                    >
                      {deleteLoading ? 'Deleting...' : 'Yes, Delete Account'}
                    </button>
                  </div>
                </div>
              )}
            </section>

          </div>
        </div>

      </div>
    </div>
  );
}
