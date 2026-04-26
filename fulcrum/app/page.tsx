"use client";

import { useEffect, useState } from "react";
import { Wordmark } from "@/components/landing/Wordmark";
import { HeroOperon } from "@/components/landing/HeroOperon";
import { Bottleneck } from "@/components/landing/Bottleneck";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { WorkedExample } from "@/components/landing/WorkedExample";
import { Personalized } from "@/components/landing/Personalized";
import { CompoundingLoop } from "@/components/landing/CompoundingLoop";
import { BuiltFor } from "@/components/landing/BuiltFor";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <main className="relative">
      <Wordmark scrolled={scrolled} />
      <HeroOperon />
      <Bottleneck />
      <HowItWorks />
      <WorkedExample />
      <Personalized />
      <CompoundingLoop />
      <BuiltFor />
      <FinalCTA />
      <LandingFooter />
    </main>
  );
}
