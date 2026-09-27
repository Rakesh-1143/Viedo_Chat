import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router";
import { Toaster } from "react-hot-toast";
import Layout from "./components/Layout.jsx";
import PageLoader from "./components/PageLoader.jsx";
import useAuthUser from "./hooks/useAuthUser.js";
import { useGlobalNotifications } from "./hooks/useGlobalNotifications.js";
import { useThemeStore } from "./store/useThemeStore.js";

const HomePage = lazy(() => import("./pages/HomePage.jsx"));
const SignUpPage = lazy(() => import("./pages/SignUpPage.jsx"));
const LoginPage = lazy(() => import("./pages/LoginPage.jsx"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage.jsx"));
const CallPage = lazy(() => import("./pages/CallPage.jsx"));
const CallHistoryPage = lazy(() => import("./pages/CallHistoryPage.jsx"));
const ArchivedChatsPage = lazy(() => import("./pages/ArchivedChatsPage.jsx"));
const AdminReportsPage = lazy(() => import("./pages/AdminReportsPage.jsx"));
const ChatPage = lazy(() => import("./pages/ChatPage.jsx"));
const GroupChatPage = lazy(() => import("./pages/GroupChatPage.jsx"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage.jsx"));
const SettingsPage = lazy(() => import("./pages/SettingsPage.jsx"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage.jsx"));
const VideoProvider = lazy(() => import("./providers/VideoProvider.jsx"));

const GlobalNotifications = ({ authUser }) => {
  useGlobalNotifications(authUser);
  return null;
};

const ProtectedPage = ({ isAuthenticated, hasCompletedOnboarding, children }) => {
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (!hasCompletedOnboarding) return <Navigate to="/onboarding" />;
  return children;
};

const AppRoutes = ({ isAuthenticated, hasCompletedOnboarding }) => (
  <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route
        path="/"
        element={
          <ProtectedPage
            isAuthenticated={isAuthenticated}
            hasCompletedOnboarding={hasCompletedOnboarding}
          >
            <Layout showSidebar>
              <HomePage />
            </Layout>
          </ProtectedPage>
        }
      />
      <Route
        path="/signup"
        element={
          isAuthenticated ? (
            <Navigate to={hasCompletedOnboarding ? "/" : "/onboarding"} />
          ) : (
            <SignUpPage />
          )
        }
      />
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to={hasCompletedOnboarding ? "/" : "/onboarding"} />
          ) : (
            <LoginPage />
          )
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedPage
            isAuthenticated={isAuthenticated}
            hasCompletedOnboarding={hasCompletedOnboarding}
          >
            <Layout showSidebar>
              <NotificationsPage />
            </Layout>
          </ProtectedPage>
        }
      />
      <Route
        path="/call/:id"
        element={
          <ProtectedPage
            isAuthenticated={isAuthenticated}
            hasCompletedOnboarding={hasCompletedOnboarding}
          >
            <CallPage />
          </ProtectedPage>
        }
      />
      <Route
        path="/chat/:id"
        element={
          <ProtectedPage
            isAuthenticated={isAuthenticated}
            hasCompletedOnboarding={hasCompletedOnboarding}
          >
            <Layout showSidebar>
              <ChatPage />
            </Layout>
          </ProtectedPage>
        }
      />
      <Route
        path="/calls"
        element={
          <ProtectedPage
            isAuthenticated={isAuthenticated}
            hasCompletedOnboarding={hasCompletedOnboarding}
          >
            <Layout showSidebar>
              <CallHistoryPage />
            </Layout>
          </ProtectedPage>
        }
      />
      <Route
        path="/archived"
        element={
          <ProtectedPage
            isAuthenticated={isAuthenticated}
            hasCompletedOnboarding={hasCompletedOnboarding}
          >
            <Layout showSidebar>
              <ArchivedChatsPage />
            </Layout>
          </ProtectedPage>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <ProtectedPage
            isAuthenticated={isAuthenticated}
            hasCompletedOnboarding={hasCompletedOnboarding}
          >
            <Layout showSidebar>
              <AdminReportsPage />
            </Layout>
          </ProtectedPage>
        }
      />
      <Route
        path="/chat/group/:channelId"
        element={
          <ProtectedPage
            isAuthenticated={isAuthenticated}
            hasCompletedOnboarding={hasCompletedOnboarding}
          >
            <Layout showSidebar>
              <GroupChatPage />
            </Layout>
          </ProtectedPage>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedPage
            isAuthenticated={isAuthenticated}
            hasCompletedOnboarding={hasCompletedOnboarding}
          >
            <Layout showSidebar>
              <SettingsPage />
            </Layout>
          </ProtectedPage>
        }
      />
      <Route
        path="/onboarding"
        element={isAuthenticated ? <OnboardingPage /> : <Navigate to="/login" />}
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  </Suspense>
);

const App = () => {
  const { isLoading, authUser, error, retry } = useAuthUser();
  const { theme } = useThemeStore();

  if (isLoading) return <PageLoader />;
  if (error) {
    return (
      <div className="app-shell" data-theme={theme}>
        <main className="empty-page">
          <p className="empty-page__code">Connection error</p>
          <h1>Streamify is not reachable</h1>
          <p>Check your connection and confirm the server is running, then try again.</p>
          <button type="button" className="btn btn-primary" onClick={() => retry()}>
            Try again
          </button>
        </main>
      </div>
    );
  }

  const isAuthenticated = Boolean(authUser);
  const hasCompletedOnboarding = Boolean(authUser?.isOnboarding);
  const routes = (
    <AppRoutes
      isAuthenticated={isAuthenticated}
      hasCompletedOnboarding={hasCompletedOnboarding}
    />
  );

  return (
    <div className="app-shell" data-theme={theme}>
      {isAuthenticated ? (
        <Suspense fallback={<PageLoader />}>
          <VideoProvider authUser={authUser}>
            <GlobalNotifications authUser={authUser} />
            {routes}
          </VideoProvider>
        </Suspense>
      ) : (
        routes
      )}
      <Toaster position="top-right" toastOptions={{ duration: 4500 }} />
    </div>
  );
};

export default App;
