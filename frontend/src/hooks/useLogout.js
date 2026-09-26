import { useMutation, useQueryClient } from "@tanstack/react-query";
import { logout } from "../lib/api";
import { streamClient } from "../lib/stream";

const useLogout = () => {
  const queryClient = useQueryClient();

  const {
    mutate: logoutMutation,
    isPending,
    error,
  } = useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      if (streamClient?.userID) {
        await streamClient.disconnectUser().catch((disconnectError) => {
          console.error("Failed to close the chat connection", disconnectError);
        });
      }
      queryClient.removeQueries();
      window.location.assign("/login");
    },
  });

  return { logoutMutation, isPending, error };
};
export default useLogout;
