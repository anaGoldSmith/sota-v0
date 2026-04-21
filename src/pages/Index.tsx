import landingBottomBg from "@/assets/landing-bottom-bg.jpg";
import LandingHeader from "@/components/landing/LandingHeader";
import HeroCarousel from "@/components/landing/HeroCarousel";
import StatsBar from "@/components/landing/StatsBar";
import HowItWorks from "@/components/landing/HowItWorks";
import ToolsGrid from "@/components/landing/ToolsGrid";
import EventsList from "@/components/landing/EventsList";
import LandingFooter from "@/components/landing/LandingFooter";

const Index = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <LandingHeader />

      <main className="container mx-auto px-4 py-8 flex-1">
        <HeroCarousel />
        <StatsBar />
        <HowItWorks />

        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 relative rounded-xl p-8 overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-[0.30] pointer-events-none"
            style={{ backgroundImage: `url(${landingBottomBg})` }}
          />
          <ToolsGrid />
          <EventsList />
        </section>
      </main>

      <LandingFooter />
    </div>
  );
};

export default Index;
