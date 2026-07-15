import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion as Motion } from "framer-motion";
import AuthShell from "../components/AuthShell";
import { useAuth } from "../contexts/AuthContext";

const Login = () => {
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    const result = await login(form.username, form.password);
    
    if (result.success) {
      navigate("/dashboard");
    } else {
      setError(result.error);
    }
  };

  return (
    <AuthShell title="Welcome Back" subtitle="Sign in to access your virtual rooms">
      <Motion.form
        onSubmit={handleLogin}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: .55, ease: [0.4, 0.8, 0.3, 1] }}
        className="space-y-5"
        aria-describedby={error ? 'login-error' : undefined}
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium mb-1 text-theme-secondary">Email Address</label>
            <input
              id="username"
              name="username"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className={`input-base ${error ? 'input-error' : ''}`}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1 text-theme-secondary">Password</label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                className={`input-base ${error ? 'input-error' : ''} pr-10`}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm text-theme-secondary hover:text-theme-primary"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {error && <p id="login-error" role="alert" className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2">{error}</p>}

        <div className="pt-2">
          <Motion.button
            type="submit"
            className="w-full btn-base btn-primary"
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.96 }}
          >
            Sign In
          </Motion.button>
        </div>

        <p className="text-xs text-theme-secondary text-center pt-2">Don't have an account? <Link to="/signup" className="text-accent-gradient hover:opacity-80">Create one</Link></p>
      </Motion.form>
    </AuthShell>
  );
};

export default Login;
