import type { Workflow } from "@/types";

// This is the canonical demo workflow. In production, this is what
// POST /api/workflows/compile returns. The frontend treats it as
// opaque server data, so swapping in a real fetch call later requires
// no UI changes.
export const HELA_TREHALOSE_WORKFLOW: Workflow = {
  workflow_id: "wf_hela_trehalose_001",
  hypothesis:
    "Replacing sucrose with trehalose as a cryoprotectant in the freezing medium will increase post-thaw viability of HeLa cells by at least 15 percentage points compared to the standard DMSO protocol, due to trehalose's superior membrane stabilization at low temperatures.",
  created_at: "2026-04-25T18:00:00Z",
  updated_at: "2026-04-25T18:00:00Z",
  open_decision_count: 2,

  structured_intent: {
    hypothesis: "Replacing sucrose with trehalose as a cryoprotectant…",
    experiment_type: "cell_cryopreservation",
    model_system: "HeLa cells",
    intervention: "Trehalose-based cryoprotectant formulation",
    comparator: "Standard 10% DMSO freezing medium",
    outcome: "Post-thaw viability",
    success_threshold: "≥15 percentage point increase",
    mechanism: "Trehalose membrane stabilization at low temperatures",
    likely_assays: [
      "Trypan blue exclusion",
      "CellTiter-Glo luminescent assay",
      "Resazurin viability assay",
    ],
    controls: [
      "Standard 10% DMSO control",
      "Untreated fresh HeLa cells (baseline)",
      "Vehicle-only freezing medium",
    ],
    keywords: [
      "HeLa",
      "trehalose",
      "cryopreservation",
      "DMSO",
      "post-thaw viability",
      "membrane stabilization",
    ],
  },

  sop_match: {
    best_match_name: "Mammalian Cell Freezing SOP",
    match_confidence: 0.78,
    reason:
      "The internal SOP covers standard mammalian cell freezing using DMSO and controlled-rate cooling, but does not specify trehalose loading or alternative cryoprotectant comparison protocols.",
    exact_reuse_candidates: [
      "Cell harvest and counting",
      "Freezing container preparation",
      "Controlled-rate freezer setup",
      "Liquid nitrogen transfer",
    ],
    adaptation_candidates: [
      "Cryoprotectant formulation",
      "Post-thaw viability assessment",
      "Equilibration time",
    ],
    missing_context: [
      "Trehalose delivery method (intra- vs extracellular)",
      "Intracellular loading verification protocol",
    ],
  },

  qc: {
    signal: "similar_work_exists",
    summary:
      "Trehalose has been investigated as a mammalian cell cryoprotectant since the early 2000s, with several papers reporting improved viability at varying loading conditions. No exact match for the HeLa-specific 15pp threshold comparison was found, suggesting genuine experimental novelty in the parameter space.",
    references: [
      {
        title:
          "Intracellular trehalose improves the survival of cryopreserved mammalian cells",
        authors: "Eroglu A, Russo MJ, Bieganski R, et al.",
        venue: "Nature Biotechnology",
        year: 2000,
        url: "https://www.nature.com/articles/nbt0200_163",
        relevance:
          "Foundational work establishing trehalose as an intracellular cryoprotectant; reports viability improvements but uses 3T3 fibroblasts, not HeLa.",
      },
      {
        title:
          "Trehalose, a cryoprotectant agent for human cells: literature analysis",
        authors: "Stewart S, He X.",
        venue: "Cryobiology",
        year: 2019,
        url: "https://doi.org/10.1016/j.cryobiol.2019.05.004",
        relevance:
          "Recent review covering loading methods and outcomes across cell types. Good comparator for tradeoff analysis.",
      },
      {
        title:
          "Improved post-thaw recovery of HeLa using DMSO-trehalose combination cryoprotectant",
        authors: "Nakamura T, Kojima H.",
        venue: "Cryo Letters",
        year: 2014,
        url: "https://www.cryoletters.org/",
        relevance:
          "Reports DMSO+trehalose combination protocol for HeLa specifically. Similar but not identical — does not isolate trehalose-only condition with the threshold proposed.",
      },
    ],
  },

  steps: [
    {
      step_id: "step_001",
      order: 1,
      title: "Culture and expand HeLa cells to 80% confluence",
      classification: "exact_reuse",
      status: "ready",
      depends_on: [],
      rationale:
        "Internal HeLa Cell Culture SOP defines the standard expansion protocol used by the lab. No deviation needed for this experiment.",
      instructions: [
        "Thaw working stock per HeLa Cell Culture SOP §2.1.",
        "Maintain in DMEM + 10% FBS + 1% Pen-Strep at 37°C, 5% CO₂.",
        "Passage at 70–80% confluence using 0.25% trypsin-EDTA.",
        "Expand to T-175 flasks; minimum 4 flasks per condition group.",
      ],
      source_refs: [
        {
          chunk_id: "internal_hela_sop_002",
          source_name: "HeLa Cell Culture SOP",
          source_type: "internal_sop",
          section: "§2.1 Routine maintenance",
        },
      ],
    },
    {
      step_id: "step_002",
      order: 2,
      title: "Harvest and count cells; prepare condition aliquots",
      classification: "exact_reuse",
      status: "ready",
      depends_on: ["step_001"],
      rationale:
        "Standard harvest workflow from internal SOP. Cell count target adjusted for replicate plan (n=6 per condition).",
      instructions: [
        "Trypsinize at 80% confluence; neutralize with complete medium.",
        "Pellet at 200×g for 5 min; resuspend in fresh medium.",
        "Count via hemocytometer or automated counter; verify >90% viability pre-freeze.",
        "Aliquot into 1×10⁶ cells per cryovial; minimum 18 vials (3 conditions × 6 replicates).",
      ],
      source_refs: [
        {
          chunk_id: "internal_mammalian_freezing_002",
          source_name: "Mammalian Cell Freezing SOP",
          source_type: "internal_sop",
          section: "§3.1 Harvest",
        },
      ],
    },
    {
      step_id: "step_003",
      order: 3,
      title: "Prepare cryoprotectant formulations",
      classification: "adapted_from_sop",
      status: "ready",
      depends_on: ["step_002"],
      rationale:
        "Internal SOP provides the base DMSO freezing medium recipe. The trehalose formulation is adapted from external literature (Eroglu et al. 2000; Stewart & He 2019) and must be prepared fresh.",
      instructions: [
        "CONTROL — DMSO: Prepare 10% DMSO + 90% complete medium (chilled to 4°C).",
        "TEST — Trehalose: Prepare 0.2 M trehalose in complete medium, sterile-filtered (0.22 µm).",
        "COMBINATION (if selected in step 4): 5% DMSO + 0.2 M trehalose in complete medium.",
        "Verify osmolality of all formulations is between 290–320 mOsm/kg.",
      ],
      source_refs: [
        {
          chunk_id: "internal_mammalian_freezing_005",
          source_name: "Mammalian Cell Freezing SOP",
          source_type: "internal_sop",
          section: "§3.2 Cryoprotectant prep",
        },
        {
          chunk_id: "external_eroglu_2000_001",
          source_name: "Eroglu et al., Nature Biotechnology 2000",
          source_type: "external_paper",
          source_url: "https://www.nature.com/articles/nbt0200_163",
          section: "Methods — trehalose loading",
        },
      ],
    },
    {
      step_id: "decision_001",
      order: 4,
      title: "Select trehalose delivery method",
      classification: "decision_required",
      status: "needs_user_choice",
      depends_on: ["step_003"],
      reason:
        "Internal SOP supports DMSO freezing but does not specify how trehalose should be delivered. Multiple valid approaches exist with different operational and scientific tradeoffs. This decision affects downstream materials, timeline, and validation.",
      rationale:
        "The mechanism in the hypothesis (membrane stabilization) is most directly tested with intracellular loading, but extracellular supplementation is operationally simpler.",
      instructions: [],
      selected_option_id: null,
      scientist_note: null,
      options: [
        {
          option_id: "extracellular",
          label: "Extracellular trehalose only",
          summary:
            "Add trehalose to freezing medium without any intracellular loading step. Simplest workflow.",
          tradeoffs: [
            "Simpler protocol — no additional incubation",
            "Lower mechanistic alignment with hypothesis",
            "May undertest the membrane-stabilization mechanism",
          ],
          cost_impact: "Low",
          timeline_impact: "+0 days",
          risks: [
            "Limited intracellular trehalose uptake may produce null result",
          ],
          supporting_refs: [
            {
              chunk_id: "external_stewart_2019_002",
              source_name: "Stewart & He, Cryobiology 2019",
              source_type: "external_paper",
              section: "Loading method comparison",
            },
          ],
          recommended: false,
        },
        {
          option_id: "intracellular_loading",
          label: "Pre-freeze intracellular loading",
          summary:
            "Pre-incubate cells with trehalose for 4–6 hours at 37°C before freezing to enable intracellular accumulation.",
          tradeoffs: [
            "Best mechanistic alignment with hypothesis",
            "Requires loading optimization run",
            "Adds osmotic stress consideration",
          ],
          cost_impact: "Medium",
          timeline_impact: "+1 day per batch",
          risks: [
            "Osmotic stress during loading",
            "Loading efficiency may vary between batches",
          ],
          supporting_refs: [
            {
              chunk_id: "external_eroglu_2000_002",
              source_name: "Eroglu et al., Nature Biotechnology 2000",
              source_type: "external_paper",
              section: "Methods",
            },
            {
              chunk_id: "internal_prior_run_003",
              source_name: "Prior Run #003 — pilot trehalose study",
              source_type: "prior_run",
              section: "Loading optimization",
            },
          ],
          recommended: true,
        },
        {
          option_id: "combination",
          label: "DMSO + trehalose combination",
          summary:
            "Use 5% DMSO with 0.2M trehalose in a single condition. Tests synergy rather than substitution.",
          tradeoffs: [
            "May not isolate trehalose effect",
            "Reported elsewhere for HeLa specifically",
            "Doesn't directly test the hypothesis as written",
          ],
          cost_impact: "Low",
          timeline_impact: "+0 days",
          risks: ["Cannot attribute viability difference to trehalose alone"],
          supporting_refs: [
            {
              chunk_id: "external_nakamura_2014_001",
              source_name: "Nakamura & Kojima, Cryo Letters 2014",
              source_type: "external_paper",
              section: "Combination protocol",
            },
          ],
          recommended: false,
        },
      ],
      source_refs: [],
    },
    {
      step_id: "step_005",
      order: 5,
      title: "Load cells into cryoprotectant; equilibrate",
      classification: "adapted_from_sop",
      status: "ready",
      depends_on: ["decision_001"],
      rationale:
        "Equilibration time depends on delivery method selected. Default values from SOP apply for DMSO-only; trehalose-loaded conditions follow extended protocol.",
      instructions: [
        "Resuspend each aliquot in respective pre-chilled cryoprotectant formulation.",
        "Equilibrate on ice — DMSO control: 10 min; trehalose conditions: 15 min.",
        "Transfer to labeled cryovials; verify all caps sealed.",
      ],
      source_refs: [
        {
          chunk_id: "internal_mammalian_freezing_007",
          source_name: "Mammalian Cell Freezing SOP",
          source_type: "internal_sop",
          section: "§4 Equilibration",
        },
      ],
    },
    {
      step_id: "step_006",
      order: 6,
      title: "Controlled-rate freezing to −80°C",
      classification: "facility_constraint",
      status: "ready",
      depends_on: ["step_005"],
      rationale:
        "Lab Facility Constraint document specifies the only available controlled-rate freezer is the CryoMed unit on Bench 4, with a fixed cooling profile of −1°C/min to −80°C. Mr. Frosty isopropanol containers may be used as backup.",
      instructions: [
        "Place vials in CryoMed CRF (Bench 4) with profile: hold 4°C → −1°C/min → −80°C.",
        "Run takes ~90 min. Do not interrupt.",
        "Backup: Mr. Frosty container at −80°C overnight (note: less reproducible cooling rate).",
        "Transfer to LN₂ vapor phase storage within 24h.",
      ],
      source_refs: [
        {
          chunk_id: "internal_freezer_manual_001",
          source_name: "Controlled-Rate Freezer Manual (CryoMed)",
          source_type: "equipment_manual",
        },
        {
          chunk_id: "internal_facility_001",
          source_name: "Lab Facility Constraints",
          source_type: "facility_constraint",
        },
      ],
    },
    {
      step_id: "step_007",
      order: 7,
      title: "Storage interval — minimum 7 days at −196°C",
      classification: "exact_reuse",
      status: "ready",
      depends_on: ["step_006"],
      rationale:
        "Standard storage period from internal SOP. Minimum 7 days ensures the experiment captures realistic post-thaw stress, not just immediate equilibration recovery.",
      instructions: [
        "Store all vials in LN₂ vapor phase for minimum 7 days, maximum 30 days, before thaw.",
        "Log storage location and timestamps in lab inventory system.",
      ],
      source_refs: [
        {
          chunk_id: "internal_mammalian_freezing_009",
          source_name: "Mammalian Cell Freezing SOP",
          source_type: "internal_sop",
          section: "§5 Storage",
        },
      ],
    },
    {
      step_id: "step_008",
      order: 8,
      title: "Thaw and recover cells",
      classification: "exact_reuse",
      status: "ready",
      depends_on: ["step_007"],
      rationale: "Standard rapid-thaw protocol from internal SOP.",
      instructions: [
        "Remove vials from LN₂ one at a time.",
        "Thaw rapidly in 37°C water bath (~90 sec, until small ice crystal remains).",
        "Transfer immediately to 9 mL pre-warmed complete medium.",
        "Centrifuge 200×g, 5 min; resuspend pellet in fresh medium.",
      ],
      source_refs: [
        {
          chunk_id: "internal_mammalian_freezing_010",
          source_name: "Mammalian Cell Freezing SOP",
          source_type: "internal_sop",
          section: "§6 Thaw",
        },
      ],
    },
    {
      step_id: "step_009",
      order: 9,
      title: "Post-thaw viability assessment",
      classification: "historically_modified",
      status: "ready",
      depends_on: ["step_008"],
      modification_signal:
        "87% of prior cryopreservation runs replaced manual trypan blue counting with 96-well plate reader assay (CellTiter-Glo). Recommendation: use plate reader as primary assay.",
      rationale:
        "The internal Viability Assay Runbook §3 specifies manual trypan blue counting as the default. However, prior run history shows scientists consistently switch to CellTiter-Glo for comparative cryoprotection studies due to throughput and lower operator variability. This step is flagged for SOP update.",
      instructions: [
        "PRIMARY (recommended) — CellTiter-Glo: plate 1×10⁴ cells/well, 96-well opaque plate, n=6 wells/condition. Read luminescence at 0h, 24h, 48h post-thaw.",
        "SECONDARY — Trypan blue exclusion: 1:1 dilution with 0.4% trypan blue, count immediately on hemocytometer or automated counter.",
        "Compare to baseline (untreated fresh cells) and DMSO control.",
      ],
      source_refs: [
        {
          chunk_id: "internal_viability_runbook_003",
          source_name: "Viability Assay Runbook",
          source_type: "internal_runbook",
          section: "§3 Comparative viability",
        },
        {
          chunk_id: "external_promega_ctg_001",
          source_name: "Promega CellTiter-Glo Technical Bulletin",
          source_type: "supplier_doc",
          source_url:
            "https://www.promega.com/resources/protocols/technical-bulletins/0/celltiter-glo-luminescent-cell-viability-assay-protocol/",
        },
        {
          chunk_id: "internal_prior_run_002",
          source_name: "Prior Run #002 — cryoprotectant comparison",
          source_type: "prior_run",
        },
      ],
    },
    {
      step_id: "decision_002",
      order: 10,
      title: "Select statistical analysis plan",
      classification: "decision_required",
      status: "needs_user_choice",
      depends_on: ["step_009"],
      reason:
        "Threshold of '≥15pp viability increase' can be tested under different statistical frameworks. Choice affects required sample size and power.",
      rationale:
        "The hypothesis specifies a directional, threshold-based outcome — multiple valid frameworks exist.",
      instructions: [],
      selected_option_id: null,
      scientist_note: null,
      options: [
        {
          option_id: "ttest_onesided",
          label: "One-sided t-test, n=6",
          summary:
            "Standard one-sided t-test against DMSO control. Power ~0.85 to detect 15pp difference assuming SD=8pp.",
          tradeoffs: [
            "Simpler analysis",
            "Assumes normality",
            "Reviewers may prefer two-sided",
          ],
          cost_impact: "Low",
          timeline_impact: "+0 days",
          risks: ["Underpowered if variance higher than estimated"],
          supporting_refs: [],
          recommended: true,
        },
        {
          option_id: "tost_equivalence",
          label: "TOST equivalence + threshold test, n=10",
          summary:
            "Two one-sided tests for non-inferiority plus directional threshold test. More rigorous.",
          tradeoffs: [
            "Higher sample size required",
            "More defensible for publication",
            "Adds 1 week to thaw schedule",
          ],
          cost_impact: "Medium",
          timeline_impact: "+1 week",
          risks: [],
          supporting_refs: [],
          recommended: false,
        },
      ],
      source_refs: [],
    },
  ],

  plan: {
    materials: [
      {
        name: "D-(+)-Trehalose dihydrate, ≥99%",
        purpose: "Test cryoprotectant",
        supplier: "Sigma-Aldrich",
        catalog: "T9531",
        quantity: "100 g",
        unit_cost: 184.0,
        total: 184.0,
        confidence: "high",
        source_ref: {
          chunk_id: "external_sigma_t9531",
          source_name: "Sigma-Aldrich product page",
          source_type: "supplier_doc",
          source_url: "https://www.sigmaaldrich.com/US/en/product/sigma/t9531",
        },
      },
      {
        name: "DMSO, Hybri-Max, sterile-filtered",
        purpose: "Control cryoprotectant",
        supplier: "Sigma-Aldrich",
        catalog: "D2650",
        quantity: "100 mL",
        unit_cost: 92.0,
        total: 92.0,
        confidence: "high",
      },
      {
        name: "DMEM, high glucose, GlutaMAX",
        purpose: "Base culture medium",
        supplier: "Thermo Fisher",
        catalog: "10566016",
        quantity: "2 × 500 mL",
        unit_cost: 38.5,
        total: 77.0,
        confidence: "high",
      },
      {
        name: "Fetal Bovine Serum, qualified",
        purpose: "Medium supplement",
        supplier: "Thermo Fisher",
        catalog: "26140079",
        quantity: "100 mL",
        unit_cost: 295.0,
        total: 295.0,
        confidence: "high",
      },
      {
        name: "CellTiter-Glo Luminescent Viability Assay",
        purpose: "Primary viability readout",
        supplier: "Promega",
        catalog: "G7570",
        quantity: "10 mL kit",
        unit_cost: 412.0,
        total: 412.0,
        confidence: "high",
        source_ref: {
          chunk_id: "external_promega_g7570",
          source_name: "Promega catalog",
          source_type: "supplier_doc",
          source_url:
            "https://www.promega.com/products/cell-health-assays/cell-viability-and-cytotoxicity-assays/celltiter_glo-luminescent-cell-viability-assay/",
        },
      },
      {
        name: "Cryovials, 2 mL externally threaded",
        purpose: "Storage vessel",
        supplier: "Corning",
        catalog: "430659",
        quantity: "1 × 500 vials",
        unit_cost: 178.0,
        total: 178.0,
        confidence: "high",
      },
      {
        name: "96-well white opaque plates",
        purpose: "Luminescence assay",
        supplier: "Corning",
        catalog: "3917",
        quantity: "1 × 50 plates",
        unit_cost: 245.0,
        total: 245.0,
        confidence: "high",
      },
      {
        name: "Trypan Blue solution, 0.4%",
        purpose: "Secondary viability readout",
        supplier: "Thermo Fisher",
        catalog: "15250061",
        quantity: "100 mL",
        unit_cost: 42.0,
        total: 42.0,
        confidence: "high",
      },
      {
        name: "0.22 µm syringe filters, sterile",
        purpose: "Sterile filtration",
        supplier: "Millipore",
        catalog: "SLGV033RS",
        quantity: "50 ct",
        unit_cost: 89.0,
        total: 89.0,
        confidence: "medium",
      },
    ],

    budget: [
      {
        item: "Reagents (cryoprotectants, media, FBS)",
        category: "Reagents",
        quantity: "1 set",
        total: 648,
        basis: "Itemized supplier catalog",
        confidence: "high",
      },
      {
        item: "Assay kits (CellTiter-Glo + trypan blue)",
        category: "Reagents",
        quantity: "1 set",
        total: 454,
        basis: "Itemized supplier catalog",
        confidence: "high",
      },
      {
        item: "Consumables (cryovials, plates, filters)",
        category: "Consumables",
        quantity: "1 set",
        total: 512,
        basis: "Itemized supplier catalog",
        confidence: "high",
      },
      {
        item: "Liquid nitrogen (storage + transfer)",
        category: "Consumables",
        quantity: "60 L",
        total: 180,
        basis: "Lab facility rate, internal",
        confidence: "medium",
      },
      {
        item: "Researcher time (postdoc, ~80 h)",
        category: "Personnel",
        quantity: "80 h",
        total: 4800,
        basis: "Loaded rate $60/h",
        confidence: "medium",
      },
      {
        item: "Equipment usage (CryoMed CRF, plate reader)",
        category: "Equipment",
        quantity: "—",
        total: 350,
        basis: "Internal core facility billing",
        confidence: "medium",
      },
      {
        item: "Indirect / overhead (15%)",
        category: "Overhead",
        quantity: "—",
        total: 1041,
        basis: "Institutional rate",
        confidence: "medium",
      },
    ],

    timeline: [
      {
        phase: "Procurement & QC",
        duration: "1 week",
        start_week: 1,
        end_week: 1,
        dependencies: [],
        critical_path: true,
        notes: "Order trehalose, kits, vials. Verify FBS lot.",
      },
      {
        phase: "Cell expansion",
        duration: "1.5 weeks",
        start_week: 1,
        end_week: 2,
        dependencies: ["Procurement & QC"],
        critical_path: true,
        notes: "Expand HeLa to 4× T-175; passage 2 max.",
      },
      {
        phase: "Loading optimization (if intracellular)",
        duration: "1 week",
        start_week: 3,
        end_week: 3,
        dependencies: ["Cell expansion"],
        critical_path: false,
        notes: "Pilot 4h vs 6h trehalose loading; pick optimal.",
      },
      {
        phase: "Freezing run",
        duration: "2 days",
        start_week: 4,
        end_week: 4,
        dependencies: ["Cell expansion", "Loading optimization (if intracellular)"],
        critical_path: true,
      },
      {
        phase: "Storage interval",
        duration: "1 week (min)",
        start_week: 4,
        end_week: 5,
        dependencies: ["Freezing run"],
        critical_path: true,
      },
      {
        phase: "Thaw, viability, analysis",
        duration: "1.5 weeks",
        start_week: 5,
        end_week: 6,
        dependencies: ["Storage interval"],
        critical_path: true,
        notes: "Thaw groups staggered to allow plate reader windows.",
      },
      {
        phase: "Statistical analysis & writeup",
        duration: "1 week",
        start_week: 7,
        end_week: 7,
        dependencies: ["Thaw, viability, analysis"],
        critical_path: false,
      },
    ],

    validation: [
      {
        endpoint: "Post-thaw viability at 24h",
        type: "primary",
        assay: "CellTiter-Glo luminescence (RLU)",
        controls: ["DMSO standard", "Untreated fresh cells", "Vehicle-only"],
        threshold: "≥15 percentage point increase vs DMSO control (p<0.05)",
        source_ref: {
          chunk_id: "internal_viability_runbook_001",
          source_name: "Viability Assay Runbook",
          source_type: "internal_runbook",
        },
      },
      {
        endpoint: "Post-thaw viability at 48h (recovery)",
        type: "secondary",
        assay: "CellTiter-Glo luminescence",
        controls: ["DMSO standard", "Untreated fresh cells"],
        threshold: "Maintained or improved vs 24h reading",
      },
      {
        endpoint: "Membrane integrity at thaw (0h)",
        type: "secondary",
        assay: "Trypan blue exclusion",
        controls: ["DMSO standard"],
        threshold: "≥10pp increase vs DMSO; cross-validates primary endpoint",
      },
      {
        endpoint: "Re-plating efficiency at 7 days",
        type: "secondary",
        assay: "Crystal violet colony formation",
        controls: ["Untreated fresh cells"],
        threshold: "Comparable colony morphology and number",
      },
    ],

    risks: [
      {
        category: "scientific",
        risk: "Insufficient intracellular trehalose loading produces null result",
        mitigation:
          "Run loading optimization pilot (step 4 branch); verify with intracellular trehalose quantification if possible",
        severity: "high",
      },
      {
        category: "operational",
        risk: "CryoMed CRF availability conflicts (single unit on Bench 4)",
        mitigation:
          "Reserve unit 2 weeks in advance; backup Mr. Frosty protocol available with documented variability",
        severity: "medium",
      },
      {
        category: "scientific",
        risk: "FBS lot variation affects baseline viability",
        mitigation:
          "Use single FBS lot for entire experiment; record lot # in trace",
        severity: "medium",
      },
      {
        category: "operational",
        risk: "Plate reader scheduling delays 24h/48h reads",
        mitigation: "Pre-book 4 plate reader windows during thaw week",
        severity: "low",
      },
      {
        category: "safety",
        risk: "LN₂ exposure during transfer",
        mitigation:
          "Cryo-PPE per facility constraints document; two-person rule for LN₂ dewar transfers",
        severity: "low",
      },
    ],
  },

  trace: [
    {
      event_id: "trace_001",
      event_type: "workflow_compiled",
      summary:
        "Hypothesis ingested. Structured intent extracted (experiment_type: cell_cryopreservation).",
      timestamp: "2026-04-25T18:00:00Z",
    },
    {
      event_id: "trace_002",
      event_type: "internal_sources_retrieved",
      summary:
        "Retrieved 14 chunks across 5 internal sources (HeLa Culture SOP, Mammalian Cell Freezing SOP, Viability Assay Runbook, CryoMed Manual, Lab Facility Constraints).",
      timestamp: "2026-04-25T18:00:02Z",
    },
    {
      event_id: "trace_003",
      event_type: "sop_match_scored",
      summary:
        "Best match: Mammalian Cell Freezing SOP (confidence 0.78). 4 exact-reuse candidates, 3 adaptation candidates, 2 missing-context items identified.",
      timestamp: "2026-04-25T18:00:03Z",
    },
    {
      event_id: "trace_004",
      event_type: "external_sources_retrieved",
      summary:
        "Tavily returned 9 candidate sources across protocols.io, Nature Protocols, Sigma, Promega, ATCC. Retained 6 after relevance filter.",
      timestamp: "2026-04-25T18:00:08Z",
    },
    {
      event_id: "trace_005",
      event_type: "decision_node_created",
      summary:
        "Decision node 'Select trehalose delivery method' generated with 3 options. Recommendation: pre-freeze intracellular loading.",
      timestamp: "2026-04-25T18:00:11Z",
    },
    {
      event_id: "trace_006",
      event_type: "decision_node_created",
      summary:
        "Decision node 'Select statistical analysis plan' generated with 2 options.",
      timestamp: "2026-04-25T18:00:11Z",
    },
    {
      event_id: "trace_007",
      event_type: "sop_improvement_recommended",
      summary:
        "Step 9 (Post-thaw viability) flagged as historically_modified. 87% of prior runs replaced trypan blue with CellTiter-Glo.",
      timestamp: "2026-04-25T18:00:12Z",
    },
  ],

  sop_recommendations: [
    {
      recommendation_id: "sop_rec_001",
      sop_name: "Viability Assay Runbook",
      step_reference: "§3 Step 3 — Post-thaw viability",
      signal: "87% of prior cryopreservation runs modified this step",
      common_modification:
        "Manual trypan blue counting → 96-well CellTiter-Glo luminescence assay",
      recommendation:
        "Update §3 to make plate-reader luminescence the default for comparative cryoprotection studies. Retain trypan blue as optional secondary readout.",
    },
    {
      recommendation_id: "sop_rec_002",
      sop_name: "Mammalian Cell Freezing SOP",
      step_reference: "§3.2 Cryoprotectant prep",
      signal: "5 prior runs introduced non-DMSO cryoprotectant variants",
      common_modification:
        "Trehalose, glycerol, and PEG-based formulations added without SOP guidance",
      recommendation:
        "Add §3.2.1 'Alternative cryoprotectants' covering trehalose, glycerol, and combination formulations with osmolality targets.",
    },
  ],
};
