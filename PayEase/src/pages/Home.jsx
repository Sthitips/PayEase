import Navbar from "../components/Navbar";
import Button from "../components/Button";
import {Volume} from "lucide-react";
import Microphone from "../assets/mic.png";
import Split from "../assets/split.png";
import PayPal from "../assets/social.png";
import Scan from "../assets/qr-code.png";
import FAQ from "../components/shadcn-studio/blocks/faq-component-01/faq-component-01.jsx";

const faqItems = [
  {
    question: 'Do you charge for each upgrade?',
    answer:
      'Some upgrades are free, while others may have an additional cost, depending on the type of upgrade and your current plan. For specific pricing details, please check our pricing page or contact our support team.'
  },
  {
    question: 'Do I need to purchase a license for each website?',
    answer:
      'Yes, you need to purchase a separate license for each website where you plan to use our components. Each license is tied to a single domain and its subdomains. This ensures proper licensing compliance and helps us maintain and improve our products for all users.'
  }
];

const features = [
  { icon: Scan, title: "Scan", text: "Scan the merchant QR" },
  { icon: PayPal, title: "Pay", text: "Pay securely with PayPal" },
  { icon: Microphone, title: "Say it", text: "Tell us who had what" },
  { icon: Split, title: "Split", text: "Let us handle the math" },
];

export default function Home() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#FFF4DE]">
      <Navbar />

      <main>
        <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 md:grid-cols-2 md:px-10 md:py-24">
          {/* Left: hero copy */}
          <div>

            <h1 className="max-w-xl text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
              Split the bill,
              <br />
              not the
              <br />
              <span className="relative inline-block">
                <span className="relative z-10">friendship.</span>
                <span className="absolute inset-x-0 bottom-0 -z-0 h-[45%] rounded-md bg-[#FFC83D]" />
              </span>
            </h1>

            <p className="text-xl font-bold mt-6 max-w-md text-base leading-7 text-[#425166]">
              You handle the fun. We handle the math.
            </p>

            <div id="get-started" className="mt-7 flex flex-wrap gap-4">
              <Button onClick={() => console.log("Start a group")}>
                Start a group
              </Button>
              <a href="#how-it-works">
                <Button variant="secondary">See how it works</Button>
              </a>
            </div>

            <div
              id="features"
              className="mt-12 grid grid-cols-2 gap-x-5 gap-y-6 sm:grid-cols-4"
            >
              {features.map((feature) => (
                <div key={feature.title} className="flex flex-col gap-1">
                  <span className="text-3xl font-bold text-[#FF684F]">
                    <img src={feature.icon} alt={feature.title} className="h-8 w-8" />
                  </span>
                  <h3 className="font-extrabold">{feature.title}</h3>
                  <p className="text-xs leading-5 text-black">
                    {feature.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: illustration placeholder */}
          <div className="relative mx-auto w-full max-w-lg">
            <div className="relative rotate-2 overflow-hidden rounded-3xl border-2 border-[#182D43] bg-white p-5 shadow-[8px_8px_0px_#182D43]">
              <div className="flex items-center justify-between border-b border-dashed border-[#D7C9AF] pb-4">
                <div>
                  <p className="font-extrabold">Blue Tokai Cafe</p>
                  <p className="text-xs text-[#7A8490]">Goa, day 3</p>
                </div>
                <span className="rounded-full bg-[#FFC83D] px-3 py-2 font-bold text-sm border">
                  just say it!
                </span>
              </div>

              <div className="space-y-3 py-5 text-sm">
                <div className="flex justify-between">
                  <span>Cold brew ×2</span><span>$20</span>
                </div>
                <div className="flex justify-between">
                  <span>Brownie</span><span>$9</span>
                </div>
                <div className="flex justify-between">
                  <span>Veg sandwich</span><span>$13</span>
                </div>
              </div>

              <div className="flex justify-between border-t border-dashed border-[#D7C9AF] pt-4 font-extrabold">
                <span>Total</span><span>$42</span>
              </div>
              <div className="mt-3">
                <Volume className="inline-block text-[#E84F38]"/>
                <span className="mt-5 font-bold text-[#E84F38]">"I got the brownie for $9, split the rest equally!"</span>
              </div>
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className="border-t border-[#182D43]/10 bg-[#FFECC9] px-5 py-12 md:px-10"
        >
           <FAQ faqItems={faqItems} />
        </section>

        <footer id="about" className="px-5 py-8 text-center text-sm text-[#425166]">
          Made for the memories, not the money math. ✳
        </footer>
      </main>
    </div>
  );
}