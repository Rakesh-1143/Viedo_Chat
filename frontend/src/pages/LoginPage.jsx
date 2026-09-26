import { useState } from "react";
import { ShipWheelIcon, EyeIcon, EyeOffIcon } from "lucide-react";
import { Link } from "react-router";
import useLogin from "../hooks/useLogin";

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  const { isPending, error, loginMutation } = useLogin();

  const handleLogin = (e) => {
    e.preventDefault();
    loginMutation(loginData);
  };

  return (
    <main className="auth-page flex items-center">
      <div className="auth-panel">
        {/* LOGIN FORM SECTION */}
        <section className="auth-form">
          {/* LOGO */}
          <Link to="/" className="brand-mark" aria-label="Streamify home">
            <ShipWheelIcon aria-hidden="true" />
            <span>Streamify</span>
          </Link>

          {/* ERROR MESSAGE DISPLAY */}
          {error && (
            <div className="alert alert-error mb-4">
              <span>{error.response?.data?.message || "Login failed"}</span>
            </div>
          )}

          <div className="w-full">
            <form onSubmit={handleLogin}>
              <div className="space-y-4">
                <div className="auth-form__intro">
                  <h1>Welcome back</h1>
                  <p className="text-sm opacity-70">
                    Sign in to your account to continue your language journey
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="form-control w-full space-y-2">
                    <label className="label">
                      <span className="label-text">Email</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      autoComplete="email"
                      placeholder="hello@example.com"
                      className="input input-bordered w-full"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-control w-full space-y-2">
                    <label className="label">
                      <span className="label-text">Password</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        autoComplete="current-password"
                        placeholder="••••••••"
                        className="input input-bordered w-full"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition-opacity"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
                      </button>
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary w-full" disabled={isPending}>
                    {isPending ? (
                      <>
                        <span className="loading loading-spinner loading-xs"></span>
                        Signing in...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </button>

                  <div className="text-center mt-4">
                    <p className="text-sm">
                      Don't have an account?{" "}
                      <Link to="/signup" className="text-primary hover:underline">
                        Create one
                      </Link>
                    </p>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </section>

        {/* IMAGE SECTION */}
        <aside className="auth-media">
          <div className="max-w-md p-8">
            {/* Illustration */}
            <div className="relative aspect-square max-w-sm mx-auto">
              <img src="/i.png" alt="Language connection illustration" className="w-full h-full" />
            </div>

            <div className="text-center space-y-3 mt-6">
              <h2 className="text-xl font-semibold">Connect with language partners worldwide</h2>
              <p className="opacity-70">
                Practice conversations, make friends, and improve your language skills together
              </p>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
};
export default LoginPage;
