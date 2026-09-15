/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { AlsoFor } from "./sections/AlsoFor.js";
import { Compatibility } from "./sections/Compatibility.js";
import { DualPath } from "./sections/DualPath.js";
import { Faq } from "./sections/Faq.js";
import { FinalCta } from "./sections/FinalCta.js";
import { Footer } from "./sections/Footer.js";
import { Hero } from "./sections/Hero.js";
import { Loop } from "./sections/Loop.js";
import { Nav } from "./sections/Nav.js";
import { Network } from "./sections/Network.js";
import { Problem } from "./sections/Problem.js";
import { Product } from "./sections/Product.js";

export function App() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Problem />
        <DualPath />
        <Loop />
        <Product />
        <Compatibility />
        <AlsoFor />
        <Network />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
