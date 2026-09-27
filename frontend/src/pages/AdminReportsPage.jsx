import { Navigate } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ShieldAlertIcon, ShieldCheckIcon, ShieldXIcon } from "lucide-react";
import useAuthUser from "../hooks/useAuthUser";
import { banReportedUser, dismissReport, getReports, unbanUser } from "../lib/api";

const STATUS_LABEL = {
  open: "Open",
  dismissed: "Dismissed",
  actioned: "Actioned",
};

const AdminReportsPage = () => {
  const { authUser } = useAuthUser();
  const queryClient = useQueryClient();

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["adminReports"],
    queryFn: getReports,
    enabled: authUser?.role === "admin",
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["adminReports"] });

  const { mutate: dismissMutation } = useMutation({
    mutationFn: dismissReport,
    onSuccess: () => {
      toast.success("Report dismissed");
      invalidate();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Could not dismiss this report");
    },
  });

  const { mutate: banMutation } = useMutation({
    mutationFn: banReportedUser,
    onSuccess: () => {
      toast.success("User banned");
      invalidate();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Could not ban this user");
    },
  });

  const { mutate: unbanMutation } = useMutation({
    mutationFn: unbanUser,
    onSuccess: () => {
      toast.success("User unbanned");
      invalidate();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Could not unban this user");
    },
  });

  if (authUser && authUser.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="container mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-3">
          <ShieldAlertIcon className="size-8 text-primary" />
          <div>
            <p className="page-kicker mb-0">Moderation</p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">User Reports</h1>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg" />
          </div>
        ) : reports.length === 0 ? (
          <div className="card bg-base-200 p-8 sm:p-12 text-center border-2 border-dashed border-base-300">
            <p className="text-base-content opacity-70">No reports have been submitted.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {reports.map((report) => {
              const isBanned = Boolean(report.reportedUser?.banned);
              return (
                <div key={report._id} className="card bg-base-200 shadow-sm">
                  <div className="card-body p-4 gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm">
                        <span className="font-semibold">{report.reporter?.fullName || "Unknown"}</span>
                        <span className="opacity-60"> reported </span>
                        <span className="font-semibold">
                          {report.reportedUser?.fullName || "Unknown"}
                        </span>
                        {isBanned && (
                          <span className="badge badge-error badge-sm ml-2">Banned</span>
                        )}
                      </div>
                      <span className="badge badge-ghost badge-sm">
                        {STATUS_LABEL[report.status] || report.status}
                      </span>
                    </div>
                    <p className="text-sm bg-base-100 rounded-lg p-3 border border-base-300">
                      {report.reason}
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs opacity-50">
                        {new Date(report.createdAt).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {report.status === "open" && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost"
                            onClick={() => dismissMutation(report._id)}
                          >
                            Dismiss
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-error btn-outline gap-1.5"
                            onClick={() => banMutation(report._id)}
                          >
                            <ShieldXIcon className="size-3.5" aria-hidden="true" />
                            Ban user
                          </button>
                        </div>
                      )}
                      {report.status !== "open" && isBanned && report.reportedUser?._id && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline gap-1.5"
                          onClick={() => unbanMutation(report.reportedUser._id)}
                        >
                          <ShieldCheckIcon className="size-3.5" aria-hidden="true" />
                          Unban user
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminReportsPage;
