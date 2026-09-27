import { useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import toast from "react-hot-toast";
import { CheckIcon, LogOutIcon, PencilIcon, UserPlusIcon, UsersIcon, XIcon } from "lucide-react";
import {
  addGroupMembers,
  getGroupInfo,
  getUserFriends,
  removeGroupMember,
  renameGroup,
} from "../lib/api";
import useAuthUser from "../hooks/useAuthUser";
import useEscapeKey from "../hooks/useEscapeKey";

const GroupInfoPanel = ({ channelId, onClose }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { authUser } = useAuthUser();
  useEscapeKey(onClose);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [isRenaming, setIsRenaming] = useState(false);
  const [name, setName] = useState("");

  const { data: info, isLoading } = useQuery({
    queryKey: ["groupInfo", channelId],
    queryFn: () => getGroupInfo(channelId),
  });

  const { data: friends = [] } = useQuery({
    queryKey: ["friends"],
    queryFn: getUserFriends,
    enabled: isAdding,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["groupInfo", channelId] });

  const { mutate: addMembersMutation, isPending: isAddingMembers } = useMutation({
    mutationFn: (memberIds) => addGroupMembers(channelId, memberIds),
    onSuccess: () => {
      toast.success("Members added");
      setIsAdding(false);
      setSelectedIds(new Set());
      invalidate();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Could not add members");
    },
  });

  const { mutate: removeMemberMutation } = useMutation({
    mutationFn: (userId) => removeGroupMember(channelId, userId),
    onSuccess: () => {
      toast.success("Member removed");
      invalidate();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Could not remove member");
    },
  });

  const { mutate: leaveGroupMutation, isPending: isLeaving } = useMutation({
    mutationFn: (userId) => removeGroupMember(channelId, userId),
    onSuccess: () => {
      toast.success("You left the group");
      onClose();
      navigate("/");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Could not leave the group");
    },
  });

  const { mutate: renameMutation, isPending: isSavingName } = useMutation({
    mutationFn: (newName) => renameGroup(channelId, newName),
    onSuccess: () => {
      toast.success("Group renamed");
      setIsRenaming(false);
      invalidate();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Could not rename group");
    },
  });

  const toggleSelected = (id) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const memberIds = new Set((info?.members || []).map((member) => String(member._id)));
  const addableFriends = friends.filter((friend) => !memberIds.has(String(friend._id)));

  return createPortal(
    <div className="starred-panel" role="dialog" aria-modal="true" aria-label="Group info">
      <button
        type="button"
        className="starred-panel__backdrop"
        onClick={onClose}
        aria-label="Close group info"
      />
      <aside className="starred-panel__content">
        <header className="starred-panel__header">
          <h2>Group info</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            <XIcon aria-hidden="true" />
          </button>
        </header>

        {isLoading || !info ? (
          <div className="flex justify-center py-8">
            <span className="loading loading-spinner" />
          </div>
        ) : (
          <div className="media-gallery__body">
            <div className="flex items-center gap-3 mb-4">
              <div className="conversation-avatar conversation-avatar--group">
                <UsersIcon aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                {isRenaming ? (
                  <form
                    className="flex items-center gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (name.trim()) renameMutation(name.trim());
                    }}
                  >
                    <input
                      type="text"
                      className="input input-bordered input-sm flex-1 min-w-0"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={80}
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="icon-button"
                      disabled={isSavingName}
                      aria-label="Save name"
                    >
                      <CheckIcon aria-hidden="true" />
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center gap-2 min-w-0">
                    <h3 className="font-bold truncate min-w-0">{info.name}</h3>
                    {info.isCreator && (
                      <button
                        type="button"
                        className="icon-button shrink-0"
                        onClick={() => {
                          setName(info.name);
                          setIsRenaming(true);
                        }}
                        aria-label="Rename group"
                        title="Rename group"
                      >
                        <PencilIcon aria-hidden="true" />
                      </button>
                    )}
                  </div>
                )}
                <p className="text-xs opacity-70">{info.members.length} members</p>
              </div>
            </div>

            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold opacity-70">Members</h4>
              {info.isCreator && (
                <button
                  type="button"
                  className="btn btn-ghost btn-xs gap-1"
                  onClick={() => setIsAdding((prev) => !prev)}
                >
                  <UserPlusIcon className="size-3.5" aria-hidden="true" />
                  Add
                </button>
              )}
            </div>

            {isAdding && (
              <div className="mb-3 border border-base-300 rounded-lg p-2 space-y-2">
                {addableFriends.length === 0 ? (
                  <p className="text-xs opacity-70 px-1">
                    All your connections are already in this group.
                  </p>
                ) : (
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {addableFriends.map((friend) => (
                      <label
                        key={friend._id}
                        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-base-200 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          className="checkbox checkbox-xs checkbox-primary"
                          checked={selectedIds.has(friend._id)}
                          onChange={() => toggleSelected(friend._id)}
                        />
                        <span className="text-sm truncate min-w-0 flex-1">{friend.fullName}</span>
                      </label>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  className="btn btn-primary btn-xs w-full"
                  disabled={selectedIds.size === 0 || isAddingMembers}
                  onClick={() => addMembersMutation([...selectedIds])}
                >
                  {isAddingMembers ? "Adding..." : `Add ${selectedIds.size || ""} member(s)`}
                </button>
              </div>
            )}

            <ul className="space-y-1">
              {info.members.map((member) => (
                <li
                  key={member._id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-base-200"
                >
                  <div className="avatar size-9 rounded-full overflow-hidden bg-base-300 shrink-0">
                    <img src={member.profilePic} alt="" />
                  </div>
                  <span className="text-sm font-medium truncate min-w-0 flex-1">
                    {member.fullName}
                    {String(member._id) === String(info.creatorId) && (
                      <span className="ml-1.5 text-xs font-normal opacity-60">(creator)</span>
                    )}
                  </span>
                  {info.isCreator && String(member._id) !== String(info.creatorId) && (
                    <button
                      type="button"
                      className="icon-button shrink-0"
                      onClick={() => removeMemberMutation(member._id)}
                      aria-label={`Remove ${member.fullName}`}
                      title="Remove from group"
                    >
                      <XIcon aria-hidden="true" />
                    </button>
                  )}
                </li>
              ))}
            </ul>

            {!info.isCreator && (
              <button
                type="button"
                className="btn btn-outline btn-error btn-sm w-full mt-4 gap-2"
                disabled={isLeaving}
                onClick={() => {
                  if (window.confirm("Leave this group?")) {
                    leaveGroupMutation(authUser._id);
                  }
                }}
              >
                <LogOutIcon className="size-4" aria-hidden="true" />
                {isLeaving ? "Leaving..." : "Leave group"}
              </button>
            )}
          </div>
        )}
      </aside>
    </div>,
    document.body,
  );
};

export default GroupInfoPanel;
