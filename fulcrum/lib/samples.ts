import type { SampleHypothesis } from "@/types";

export const SAMPLE_HYPOTHESES: SampleHypothesis[] = [
  {
    id: "hela-trehalose",
    domain: "Cell Biology",
    short: "HeLa trehalose cryopreservation",
    full: "Replacing sucrose with trehalose as a cryoprotectant in the freezing medium will increase post-thaw viability of HeLa cells by at least 15 percentage points compared to the standard DMSO protocol, due to trehalose's superior membrane stabilization at low temperatures.",
    plain:
      "Can we keep more cells alive when freezing them by swapping one preservative for another?",
  },
  {
    id: "crp-biosensor",
    domain: "Diagnostics",
    short: "Paper-based CRP biosensor",
    full: "A paper-based electrochemical biosensor functionalized with anti-CRP antibodies will detect C-reactive protein in whole blood at concentrations below 0.5 mg/L within 10 minutes, matching laboratory ELISA sensitivity without requiring sample preprocessing.",
    plain:
      "Can we build a cheap, fast blood test for inflammation that works without lab equipment?",
  },
  {
    id: "lgg-permeability",
    domain: "Gut Health",
    short: "L. rhamnosus GG gut permeability",
    full: "Supplementing C57BL/6 mice with Lactobacillus rhamnosus GG for 4 weeks will reduce intestinal permeability by at least 30% compared to controls, measured by FITC-dextran assay, due to upregulation of tight junction proteins claudin-1 and occludin.",
    plain:
      "Does a specific probiotic measurably strengthen the gut lining in mice?",
  },
  {
    id: "sporomusa-co2",
    domain: "Climate",
    short: "Sporomusa CO₂-to-acetate",
    full: "Introducing Sporomusa ovata into a bioelectrochemical system at a cathode potential of −400mV vs SHE will fix CO₂ into acetate at a rate of at least 150 mmol/L/day, outperforming current biocatalytic carbon capture benchmarks by at least 20%.",
    plain:
      "Can a specific microbe be used to convert CO₂ into a useful chemical compound more efficiently than current methods?",
  },
];
