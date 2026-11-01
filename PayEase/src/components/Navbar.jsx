
import Button from "./Button";
import travelLogo from "../assets/travel.png";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { User2Icon } from "lucide-react";


export default function Navbar({user, setIsSideBarOpen, IsSideBarOpen}) {
  const navigate = useNavigate();
  const handleLogoClick = ()=> {
    if(user){
      setIsSideBarOpen(!IsSideBarOpen);
    }
    else{
      navigate("/");
    }
  }

  const handleGetStartedClick = () => {
    if(user){
      navigate("/profile");
    }
    else{
      navigate("/auth");
    }
  };

  return (
    <header className="bg-[#FFFFFF]/50 backdrop-blur-xl relative z-20 border-b border-[#182D43]/40">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-10">
        <div
          onClick={handleLogoClick}
          className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl md:text-4xl hover:cursor-pointer select-none flex items-center gap-1"
        >
          <img src={travelLogo} alt="PayEase Logo" className="h-10 w-10 sm:h-10 inline-block mx-1" />
          <span className="text-[#182D43]">Pay</span>
          <span className="text-[#FF684F]">Ease</span>
        </div>

        <div className="hidden items-center gap-8 md:flex">
          <Link to="#features" className="font-semibold hover:text-[#FF684F]">
            Features
          </Link>
          <Link to="#how-it-works" className="font-semibold hover:text-[#FF684F]">
            How it works
          </Link>
          <Link to="#about" className="font-semibold hover:text-[#FF684F]">
            About
          </Link>
        </div>

        <div onClick={handleGetStartedClick} className="hover:cursor-pointer">
          {!user ? <Button className="px-4 py-2 text-sm">
            Get started
          </Button> : 
          <div>
              <User2Icon size={40} className="inline-block mr-2 bg-white rounded-full p-1 border-2 border-black" />
              <span className="font-semibold text-lg">{user.name}</span>
            </div>}
        </div>
      </nav>
    </header>
  );
}
