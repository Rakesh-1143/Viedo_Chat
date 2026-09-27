import { useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteAccount, getBlockedUsers, unblockUser, updatePassword } from "../lib/api";
import { streamClient } from "../lib/stream";
import useLogout from "../hooks/useLogout";
import toast from "react-hot-toast";
import { useNavigate } from "react-router";
import {
  BellIcon,
  LockIcon,
  ShieldBanIcon,
  Trash2Icon,
  LogOutIcon,
  EyeIcon,
  EyeOffIcon,
  SettingsIcon,
} from "lucide-react";
import {
  getNotificationPermission,
  isNotificationSupported,
  requestNotificationPermission,
} from "../lib/notifications";

const SettingsPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { logoutMutation } = useLogout();

  // Modals state
  const [activeTab, setActiveTab] = useState("password"); // 'password', 'notifications', 'blocked', 'danger'
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");

  const [notificationPermission, setNotificationPermission] = useState(() =>
    getNotificationPermission(),
  );

  const { data: blockedUsers = [], isLoading: blockedLoading } = useQuery({
    queryKey: ["blockedUsers"],
    queryFn: getBlockedUsers,
    enabled: activeTab === "blocked",
  });

  const { mutate: unblockMutation, isPending: isUnblocking } = useMutation({
    mutationFn: unblockUser,
    onSuccess: () => {
      toast.success("User unblocked");
      queryClient.invalidateQueries({ queryKey: ["blockedUsers"] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to unblock user");
    },
  });

  const handleEnableNotifications = async () => {
    const result = await requestNotificationPermission();
    setNotificationPermission(result);
    if (result === "granted") toast.success("Notifications enabled");
    else if (result === "denied") toast.error("Notifications were blocked in your browser");
  };

  // Update Password State
  const [showPass, setShowPass] = useState(false);
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
  });

  const { mutate: deleteAccountMutation, isPending: isDeleting } = useMutation({
    mutationFn: () => deleteAccount(deleteReason),
    onSuccess: async () => {
      if (streamClient?.userID) {
        await streamClient.disconnectUser().catch(() => undefined);
      }
      toast.success("Account deleted permanently");
      queryClient.setQueryData(["authUser"], null);
      navigate("/login");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to delete account");
    },
  });

  const { mutate: updatePassMutation, isPending: isUpdatingPass } = useMutation(
    {
      mutationFn: updatePassword,
      onSuccess: () => {
        toast.success("Password updated successfully");
        setPasswords({ currentPassword: "", newPassword: "" });
      },
      onError: (error) => {
        toast.error(
          error.response?.data?.message || "Failed to update password",
        );
      },
    },
  );

  return (
    <div className="container mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-8">
        <SettingsIcon className="size-8 text-primary" />
        <div>
          <p className="page-kicker mb-0">Account</p>
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* SIDEBAR TABS */}
        <div className="lg:col-span-1 space-y-1">
          <button
            onClick={() => setActiveTab("password")}
            className={`btn btn-ghost w-full justify-start gap-3 ${activeTab === "password" ? "btn-active" : ""}`}
          >
            <LockIcon className="size-4" />
            Password
          </button>
          <button
            onClick={() => setActiveTab("notifications")}
            className={`btn btn-ghost w-full justify-start gap-3 ${activeTab === "notifications" ? "btn-active" : ""}`}
          >
            <BellIcon className="size-4" />
            Notifications
          </button>
          <button
            onClick={() => setActiveTab("blocked")}
            className={`btn btn-ghost w-full justify-start gap-3 ${activeTab === "blocked" ? "btn-active" : ""}`}
          >
            <ShieldBanIcon className="size-4" />
            Blocked Users
          </button>
          <button
            onClick={() => setActiveTab("danger")}
            className={`btn btn-ghost w-full justify-start gap-3 text-error ${activeTab === "danger" ? "bg-error/10" : ""}`}
          >
            <Trash2Icon className="size-4" />
            Delete Account
          </button>
          <div className="divider opacity-50"></div>
          <button
            onClick={() => logoutMutation()}
            className="btn btn-ghost w-full justify-start gap-3 text-error"
          >
            <LogOutIcon className="size-4" />
            Logout
          </button>
        </div>

        {/* CONTENT AREA */}
        <div className="lg:col-span-3 card bg-base-200 shadow-sm border border-base-300">
          <div className="card-body">
            {activeTab === "password" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div>
                  <h2 className="text-xl font-bold mb-1">Update Password</h2>
                  <p className="text-sm opacity-70">
                    Ensure your account is using a long, random password to stay
                    secure.
                  </p>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    updatePassMutation(passwords);
                  }}
                  className="space-y-4 max-w-md"
                >
                  <div className="form-control w-full">
                   <label className="label">
                     <span className="label-text font-semibold">
                       Current Password
                     </span>
                   </label>
                   <div className="relative">
                     <input
                       type={showPass ? "text" : "password"}
                       className="input input-bordered w-full bg-base-100"
                       required
                       value={passwords.currentPassword}
                       onChange={(e) =>
                         setPasswords({
                           ...passwords,
                           currentPassword: e.target.value,
                         })
                       }
                     />
                     <button
                       type="button"
                       className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition-opacity"
                       onClick={() => setShowPass(!showPass)}
                     >
                       {showPass ? (
                         <EyeOffIcon size={18} />
                       ) : (
                         <EyeIcon size={18} />
                       )}
                     </button>
                   </div>
                  </div>
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-semibold">
                        New Password
                      </span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPass ? "text" : "password"}
                        className="input input-bordered w-full bg-base-100"
                        required
                        minLength={8}
                        maxLength={128}
                        pattern="(?=.*[A-Za-z])(?=.*\d).{8,128}"
                        title="Use 8 to 128 characters with at least one letter and one number"
                        value={passwords.newPassword}
                        onChange={(e) =>
                          setPasswords({
                            ...passwords,
                            newPassword: e.target.value,
                          })
                        }
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition-opacity"
                        onClick={() => setShowPass(!showPass)}
                      >
                        {showPass ? (
                          <EyeOffIcon size={18} />
                        ) : (
                          <EyeIcon size={18} />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isUpdatingPass}
                    >
                      {isUpdatingPass ? "Updating..." : "Update Password"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === "notifications" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div>
                  <h2 className="text-xl font-bold mb-1">Browser Notifications</h2>
                  <p className="text-sm opacity-70">
                    Get notified about new messages, friend requests, and incoming calls even
                    when this tab isn't focused.
                  </p>
                </div>

                {!isNotificationSupported() ? (
                  <p className="text-sm opacity-70">
                    Your browser doesn't support notifications.
                  </p>
                ) : notificationPermission === "granted" ? (
                  <div className="p-4 border border-success/20 rounded-xl bg-success/5">
                    <p className="text-sm font-semibold text-success">Notifications are enabled</p>
                  </div>
                ) : notificationPermission === "denied" ? (
                  <div className="p-4 border border-error/20 rounded-xl bg-error/5">
                    <p className="text-sm font-semibold text-error">Notifications are blocked</p>
                    <p className="text-xs opacity-70 mt-1">
                      Enable them for this site in your browser's settings.
                    </p>
                  </div>
                ) : (
                  <button className="btn btn-primary" onClick={handleEnableNotifications}>
                    Enable Notifications
                  </button>
                )}
              </div>
            )}

            {activeTab === "blocked" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div>
                  <h2 className="text-xl font-bold mb-1">Blocked Users</h2>
                  <p className="text-sm opacity-70">
                    Blocked users can't send you friend requests or message you.
                  </p>
                </div>

                {blockedLoading ? (
                  <div className="flex justify-center py-6">
                    <span className="loading loading-spinner" />
                  </div>
                ) : blockedUsers.length === 0 ? (
                  <p className="text-sm opacity-70">You haven't blocked anyone.</p>
                ) : (
                  <ul className="space-y-2">
                    {blockedUsers.map((user) => (
                      <li
                        key={user._id}
                        className="flex items-center gap-3 p-3 rounded-xl border border-base-300"
                      >
                        <div className="avatar size-10 rounded-full overflow-hidden bg-base-300 shrink-0">
                          <img src={user.profilePic} alt="" />
                        </div>
                        <span className="font-medium truncate min-w-0 flex-1">
                          {user.fullName}
                        </span>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline shrink-0"
                          disabled={isUnblocking}
                          onClick={() => unblockMutation(user._id)}
                        >
                          Unblock
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {activeTab === "danger" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div>
                  <h2 className="text-xl font-bold text-error mb-1">
                    Delete Account
                  </h2>
                  <p className="text-sm opacity-70">
                    Once you delete your account, there is no going back. Please
                    be certain.
                  </p>
                </div>

                <div className="p-4 border border-error/20 rounded-xl bg-error/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-bold">Delete this account</h3>
                    <p className="text-xs opacity-70">
                      Permanently remove your Personal Account and all of its
                      contents from the Streamify platform.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="btn btn-error btn-outline w-full sm:w-auto shrink-0"
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DELETE ACCOUNT MODAL */}
      {isDeleteModalOpen &&
        createPortal(
          <div className="app-dialog" role="dialog" aria-modal="true" aria-label="Delete account">
            <button
              type="button"
              className="app-dialog__backdrop"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setDeleteReason("");
              }}
              aria-label="Close"
            />
            <div className="app-dialog__box">
            <h3 className="font-bold text-lg text-error flex items-center gap-2">
              <Trash2Icon className="size-6" />
              Delete Account Permanently?
            </h3>
            <p className="py-4 text-sm opacity-70">
              This action is irreversible. All your messages, friends, and
              profile data will be lost.
            </p>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">
                  Why are you leaving? (Optional)
                </span>
              </label>
              <textarea
                className="textarea textarea-bordered h-24"
                placeholder="Share your reason..."
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
              ></textarea>
            </div>

            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeleteReason("");
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-error"
                disabled={isDeleting}
                onClick={() => deleteAccountMutation()}
              >
                {isDeleting ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default SettingsPage;
