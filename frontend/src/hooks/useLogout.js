import { useMutation, useQueryClient } from "@tanstack/react-query";
import { logout } from "../lib/api";

const useLogout = () => {
  const queryClient = useQueryClient();

  const {
    mutate: logoutMutation,
    isPending,
    error,
  } = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.removeQueries();
      window.location.href = "/login";
    },
  });

  return { logoutMutation, isPending, error };
};
export default useLogout;
