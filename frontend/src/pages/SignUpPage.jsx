import { useState } from "react";
import { ShipWheelIcon, EyeIcon, EyeOffIcon } from "lucide-react";
import { Link } from "react-router";

import useSignUp from "../hooks/useSignUp";

const SignUpPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [signupData, setSignupData] = useState({
    fullName: "",
    email: "",
    password: "",
    phoneNumber: "",
  });

  // This is how we did it at first, without using our custom hook
  // const queryClient = useQueryClient();
  // const {
  //   mutate: signupMutation,
  //   isPending,
  //   error,
  // } = useMutation({
  //   mutationFn: signup,
  //   onSuccess: () => queryClient.invalidateQueries({ queryKey: ["authUser"] }),
  // });

  // This is how we did it using our custom hook - optimized version
  const { isPending, error, signupMutation } = useSignUp();

  const handleSignup = (e) => {
    e.preventDefault();
    signupMutation(signupData);
  };

  return (
    <main className="auth-page flex items-center">
      <div className="auth-panel">
        {/* SIGNUP FORM - LEFT SIDE */}
        <section className="auth-form">
          {/* LOGO */}
          <Link to="/" className="brand-mark" aria-label="Streamify home">
            <ShipWheelIcon aria-hidden="true" />
            <span>Streamify</span>
          </Link>

          {/* ERROR MESSAGE IF ANY */}
          {error && (
            <div className="alert alert-error mb-4">
              <span>{error.response?.data?.message || "Could not create your account"}</span>
            </div>
          )}

          <div className="w-full">
            <form onSubmit={handleSignup}>
              <div className="space-y-4">
                <div className="auth-form__intro">
                  <h1>Create your account</h1>
                  <p className="text-sm opacity-70">
                    Join Streamify and start your language learning adventure!
                  </p>
                </div>

                <div className="space-y-3">
                  {/* FULLNAME */}
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text">Full Name</span>
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      autoComplete="name"
                      placeholder="John Doe"
                      className="input input-bordered w-full"
                      value={signupData.fullName}
                      onChange={(e) => setSignupData({ ...signupData, fullName: e.target.value })}
                      required
                    />
                  </div>
                  {/* EMAIL */}
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text">Email</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      autoComplete="email"
                      placeholder="john@gmail.com"
                      className="input input-bordered w-full"
                      value={signupData.email}
                      onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                      required
                    />
                  </div>
                  {/* PHONE NUMBER */}
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text">Phone Number</span>
                    </label>
                    <input
                      type="tel"
                      name="phoneNumber"
                      autoComplete="tel"
                      placeholder="+1 234 567 8900"
                      className="input input-bordered w-full"
                      value={signupData.phoneNumber}
                      onChange={(e) => setSignupData({ ...signupData, phoneNumber: e.target.value })}
                    />
                  </div>
                  {/* PASSWORD */}
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text">Password</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        autoComplete="new-password"
                        placeholder="********"
                        className="input input-bordered w-full"
                        value={signupData.password}
                        onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                        minLength={8}
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
                    <p className="text-xs opacity-70 mt-1">
                      Use at least 8 characters with a letter and a number
                    </p>
                  </div>

                  <div className="form-control">
                    <label className="label cursor-pointer justify-start gap-2">
                      <input type="checkbox" className="checkbox checkbox-sm" required />
                      <span className="text-xs leading-tight">
                        I agree to follow the community guidelines
                      </span>
                    </label>
                  </div>
                </div>

                <button className="btn btn-primary w-full" type="submit" disabled={isPending}>
                  {isPending ? (
                    <>
                      <span className="loading loading-spinner loading-xs"></span>
                      Loading...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </button>

                <div className="text-center mt-4">
                  <p className="text-sm">
                    Already have an account?{" "}
                    <Link to="/login" className="text-primary hover:underline">
                      Sign in
                    </Link>
                  </p>
                </div>
              </div>
            </form>
          </div>
        </section>

        {/* SIGNUP FORM - RIGHT SIDE */}
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

export default SignUpPage;
