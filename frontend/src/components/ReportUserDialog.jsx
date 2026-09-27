import { useState } from "react";
import { createPortal } from "react-dom";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { FlagIcon, XIcon } from "lucide-react";
import { reportUser } from "../lib/api";
import useEscapeKey from "../hooks/useEscapeKey";

const ReportUserDialog = ({ targetUserId, targetName, onClose }) => {
  useEscapeKey(onClose);
  const [reason, setReason] = useState("");

  const { mutate: submitReport, isPending } = useMutation({
    mutationFn: () => reportUser(targetUserId, reason.trim()),
    onSuccess: () => {
      toast.success("Report submitted. Thanks for letting us know.");
      onClose();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Could not submit report");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error("Tell us what happened");
      return;
    }
    submitReport();
  };

  return createPortal(
    <div className="app-dialog" role="dialog" aria-modal="true" aria-label="Report user">
      <button type="button" className="app-dialog__backdrop" onClick={onClose} aria-label="Close" />
      <div className="app-dialog__box">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <FlagIcon className="size-5 text-error" aria-hidden="true" />
            Report {targetName || "user"}
          </h3>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            <XIcon aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">What's happening?</span>
            </label>
            <textarea
              className="textarea textarea-bordered h-28"
              placeholder="Describe what this user did..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              autoFocus
            />
          </div>

          <div className="modal-action">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-error" disabled={isPending}>
              {isPending ? "Submitting..." : "Submit Report"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
};

export default ReportUserDialog;
