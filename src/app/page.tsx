import type { Metadata } from "next";
import { Hero } from "@/components/home/Hero";
import { Institutional } from "@/components/home/Institutional";
import { Launches } from "@/components/home/Launches";
import { Regions } from "@/components/home/Regions";
import { Selected } from "@/components/home/Selected";
import { Footer } from "@/components/layout/Footer";
import { ogPadrao } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { ...ogPadrao, url: "/" },
};

export default function Home() {
  return (
    <>
      <main>
        <Hero />
        <Regions />
        <Launches />
        <Institutional />
        <Selected />
      </main>
      <Footer />
    </>
  );
}
