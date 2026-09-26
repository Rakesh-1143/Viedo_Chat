import { useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import toast from "react-hot-toast";
import { UsersIcon, XIcon } from "lucide-react";
import { createGroupChat, getUserFriends } from "../lib/api";

const NewGroupModal = ({ onClose }) => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const { data: friends = [], isLoading } = useQuery({
    queryKey: ["friends"],
    queryFn: getUserFriends,
  });

  const { mutate: submitGroup, isPending } = useMutation({
    mutationFn: createGroupChat,
    onSuccess: (data) => {
      onClose();
      navigate(`/chat/group/${data.channelId}`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Could not create this group");
    },
  });

  const toggleMember = (id) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Give your group a name");
      return;
    }
    if (selectedIds.size < 2) {
      toast.error("Pick at least two friends");
      return;
    }
    submitGroup({ name: name.trim(), memberIds: [...selectedIds] });
  };

  return createPortal(
    <div className="app-dialog" role="dialog" aria-modal="true" aria-label="New group">
      <button
        type="button"
        className="app-dialog__backdrop"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="app-dialog__box">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <UsersIcon className="size-5 text-primary" aria-hidden="true" />
            New Group
          </h3>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            <XIcon aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Group name</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Spanish practice squad"
              maxLength={80}
              autoFocus
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">
                Add friends ({selectedIds.size} selected)
              </span>
            </label>
            {isLoading ? (
              <div className="flex justify-center py-6">
                <span className="loading loading-spinner" />
              </div>
            ) : friends.length < 2 ? (
              <p className="text-sm opacity-70">
                You need at least two connections to start a group.
              </p>
            ) : (
              <div className="max-h-56 overflow-y-auto space-y-1 border border-base-300 rounded-lg p-2">
                {friends.map((friend) => (
                  <label
                    key={friend._id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-base-200 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm checkbox-primary"
                      checked={selectedIds.has(friend._id)}
                      onChange={() => toggleMember(friend._id)}
                    />
                    <div className="avatar size-8 rounded-full overflow-hidden bg-base-300 shrink-0">
                      <img src={friend.profilePic} alt="" />
                    </div>
                    <span className="text-sm font-medium truncate">{friend.fullName}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="modal-action">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isPending}>
              {isPending ? "Creating..." : "Create Group"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
};

export default NewGroupModal;
