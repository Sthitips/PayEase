
export default function AuthToggle({ mode, setMode }) {
  const options = [
    { label: "Login", value: "login" },
    { label: "Sign Up", value: "signup" },
  ];

  return (
    <div
      className="mt-8 flex rounded-xl bg-[#FFF4DE] p-1.5"
      role="tablist"
      aria-label="Authentication mode"
    >
      {options.map((option) => {
        const isActive = mode === option.value;

        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => setMode(option.value)}
            className={`
              flex-1 rounded-lg px-4 py-3
              text-sm font-semibold transition-all duration-150
              ${
                isActive
                  ? "bg-[#FF684F] text-white shadow-sm"
                  : "text-[#182D43] hover:bg-white/70"
              }
            `}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
