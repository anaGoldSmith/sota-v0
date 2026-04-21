import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const HeroCarousel = () => {
  const navigate = useNavigate();
  const [heroImages, setHeroImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const loadHeroImages = async () => {
      const { data, error } = await supabase.storage
        .from("landing-page-images")
        .list("", { limit: 20 });
      if (!error && data && data.length > 0) {
        const urls = data
          .filter((f) => f.name && !f.name.startsWith("."))
          .map(
            (f) =>
              supabase.storage.from("landing-page-images").getPublicUrl(f.name).data.publicUrl
          );
        setHeroImages(urls);
      }
    };
    loadHeroImages();
  }, []);

  useEffect(() => {
    if (heroImages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [heroImages.length]);

  return (
    <section className="mb-8 rounded-xl overflow-hidden shadow-lg relative">
      <div className="relative w-full h-[420px] md:h-[520px] bg-muted">
        {heroImages.map((url, index) => (
          <img
            key={url}
            src={url}
            alt={`Rhythmic gymnastics performance ${index + 1}`}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
              index === currentImageIndex ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}

        {/* Dark overlay for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/55 to-black/40 pointer-events-none" />

        {/* Hero content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4 max-w-3xl text-white [text-shadow:_0_2px_16px_rgb(0_0_0_/_70%)]">
            Master Your D-score with <span className="text-primary-foreground bg-primary px-3 py-1 rounded-md">Confidence</span>
          </h1>
          <p className="text-base md:text-lg text-white/95 max-w-2xl mb-6 [text-shadow:_0_1px_8px_rgb(0_0_0_/_60%)]">
            Build FIG-compliant rhythmic gymnastics routines in minutes — DA, DB, and R calculated for you.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button size="lg" onClick={() => navigate("/routine-calculator")}>
              Calculate My D-score
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/code-of-points")}>
              Browse the Code of Points
            </Button>
          </div>
        </div>

        {/* Dots indicator */}
        {heroImages.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
            {heroImages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                aria-label={`Go to slide ${index + 1}`}
                className="p-3 group"
              >
                <span
                  className={`block w-2.5 h-2.5 rounded-full transition-colors ${
                    index === currentImageIndex
                      ? "bg-primary"
                      : "bg-background/60 group-hover:bg-background"
                  }`}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default HeroCarousel;
