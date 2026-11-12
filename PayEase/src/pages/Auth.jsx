
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import AuthForm from "../components/AuthForm";
import AuthToggle from "../components/AuthToggle";
import api from "../lib/api";


const Auth = () => {
  const [mode, setMode] = useState("login");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { user, setUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Verifying your session...
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(data) {
    setError("");
    setSubmitting(true);

    try {
      if (mode === "signup") {
        await api.post("/api/auth/register", {
          name: data.name,
          email: data.email,
          password: data.password,
        });
      }

      const loginResponse = await api.post("/api/auth/login", {
        email: data.email,
        password: data.password,
      });

      const token = loginResponse.data.access_token;

      localStorage.setItem("payease_token", token);

      const profileResponse = await api.get("/api/auth/me");

      localStorage.setItem(
        "payease_user",
        JSON.stringify(profileResponse.data)
      );

      setUser(profileResponse.data);

      navigate("/dashboard", { replace: true });
    } catch (err) {
      localStorage.removeItem("payease_token");
      localStorage.removeItem("payease_user");
      setUser(null);

      const detail = err.response?.data?.detail;

      setError(
        typeof detail === "string"
          ? detail
          : "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const isSignup = mode === "signup";

  // Keep your existing JSX below this point.

  return (
    <div className="min-h-screen bg-[#FFF4DE]">
      <Navbar />

      <main className="min-h-[calc(100svh-4rem)] flex justify-center items-center px-4 py-4 sm:px-6 md:py-6">
        <section
          className="
            mx-auto grid w-full max-w-7xl
            grid-cols-1 gap-6
            lg:grid-cols-2 lg:items-stretch
          "
        >
          <aside
            className="
              hidden rounded-2xl border bg-black
              p-6 text-[#FFF4DE] shadow-lg
              md:flex md:min-h-[320px] md:flex-col md:justify-between
            "
          >
            {/* Interactive travel visual */}
            <div className="flex h-full flex-col justify-between gap-6">

              <div className="flex justify-center">
                  <img
                    src="/travel-img.png"
                    alt="Friends enjoying a trip together"
                  />
              </div>

            </div>
          </aside>

          <section
            className="
              flex w-full min-w-0 items-center justify-center
              rounded-2xl border bg-white p-5 shadow-lg
              sm:p-8 lg:p-10
            "
          >
            <div className="w-full max-w-md">
              <h1 className="text-center text-3xl font-bold text-[#182D43]">
                {isSignup ? "Create your account" : "Welcome back!"}
              </h1>

              <p className="mt-2 text-center text-sm text-slate-500">
                {isSignup
                  ? "Get started with PayEase."
                  : "Let's get back at it again."}
              </p>

              <AuthToggle mode={mode} setMode={setMode} />

              <AuthForm
                mode={mode}
                onSubmit={handleSubmit}
                error={error}
                loading={submitting}
              />
            </div>
          </section>
        </section>
      </main>
    </div>
  );
};

export default Auth;
