import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteAccount, updatePassword } from "../lib/api";
import { streamClient } from "../lib/stream";
import useLogout from "../hooks/useLogout";
import toast from "react-hot-toast";
import { useNavigate } from "react-router";
import {
  LockIcon,
  Trash2Icon,
  LogOutIcon,
  EyeIcon,
  EyeOffIcon,
  SettingsIcon,
  ChevronRightIcon,
} from "lucide-react";

const SettingsPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { logoutMutation } = useLogout();

  // Modals state
  const [activeTab, setActiveTab] = useState("password"); // 'password', 'danger', 'account'
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");

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
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* SIDEBAR TABS */}
        <div className="md:col-span-1 space-y-1">
          <button
            onClick={() => setActiveTab("password")}
            className={`btn btn-ghost w-full justify-start gap-3 ${activeTab === "password" ? "btn-active" : ""}`}
          >
            <LockIcon className="size-4" />
            Password
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
        <div className="md:col-span-3 card bg-base-200 shadow-sm border border-base-300">
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
      {isDeleteModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box">
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
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
