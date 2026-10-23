
import Button from "./Button";
import travelLogo from "../assets/travel.png";

export default function Navbar() {
  return (
    <header className="bg-[#FFFFFF]/50 backdrop-blur-xl relative z-20 border-b border-[#182D43]/40">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-10">
        <a
          href="/"
          className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl md:text-4xl"
        >
          <img src={travelLogo} alt="PayEase Logo" className="h-10 w-10 sm:h-10 inline-block mx-1" />
          <span className="text-[#182D43]">Pay</span>
          <span className="text-[#FF684F]">Ease</span>
        </a>

        <div className="hidden items-center gap-8 md:flex">
          <a href="#features" className="font-semibold hover:text-[#FF684F]">
            Features
          </a>
          <a href="#how-it-works" className="font-semibold hover:text-[#FF684F]">
            How it works
          </a>
          <a href="#about" className="font-semibold hover:text-[#FF684F]">
            About
          </a>
        </div>

        <a href="#get-started">
          <Button className="px-4 py-2 text-sm">
            Get started
          </Button>
        </a>
      </nav>
    </header>
  );
}
