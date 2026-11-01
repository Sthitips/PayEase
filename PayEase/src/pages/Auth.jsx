import React from 'react'
import Navbar from '../components/Navbar'
import AuthForm from '../components/AuthForm'
import AuthToggle from '../components/AuthToggle'
import { useState } from "react";

const Auth = () => {
    const [mode, setMode] = useState("login");

  function handleSubmit(data) {
    // Connect your FastAPI authentication endpoint here.
    console.log("Form submitted:", mode, data);
  }

  const isSignup = mode === "signup";
  return (
  <div className="min-h-screen bg-[#FFF4DE]">
    <Navbar />

    <main className="min-h-[calc(100svh-4rem)] flex justify-center items-center px-4 py-4 sm:px-6 md:py-6">
      <section
        className="
          mx-auto grid w-full max-w-7xl
          grid-cols-1 gap-6
          md:grid-cols-1
          lg:grid-cols-2
          lg:items-stretch
        "
      >
        {/* Interactive panel */}
        <aside
          className="
            hidden
            rounded-2xl border bg-[#182D43]
            p-6 text-[#FFF4DE] shadow-lg
            md:flex md:min-h-[320px] md:flex-col md:justify-between
            lg:min-h-0
          "
        >
          {/* Keep your existing interactive panel content here */}
        </aside>

        {/* Authentication panel */}
        <section
          className="
            flex w-full min-w-0 items-center justify-center
            rounded-2xl border bg-white p-5 shadow-lg
            sm:p-8
            md:order-first
            lg:order-none lg:min-h-0 lg:p-10
          "
        >
          <div className="w-full max-w-md">
            <h1 className="text-center text-3xl font-bold text-[#182D43]">
            {isSignup ? "Create your account" : "Welcome back!"}
          </h1>

          <p className="text-center mt-2 text-sm text-slate-500">
            {isSignup
              ? "Get started with PayEase."
              : "Lets get back at it again."}
          </p>
            <AuthToggle mode={mode} setMode={setMode} />
          <AuthForm mode={mode} onSubmit={handleSubmit} />
          </div>
        </section>
      </section>
    </main>
  </div>
);
}

export default Auth