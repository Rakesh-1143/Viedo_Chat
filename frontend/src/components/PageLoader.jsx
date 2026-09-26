import { LoaderIcon } from "lucide-react";
import { useThemeStore } from "../store/useThemeStore";

const PageLoader = () => {
  const { theme } = useThemeStore();
  return (
    <div className="flex min-h-[100dvh] items-center justify-center" data-theme={theme}>
      <LoaderIcon className="animate-spin size-10 text-primary" />
    </div>
  );
};
export default PageLoader;
