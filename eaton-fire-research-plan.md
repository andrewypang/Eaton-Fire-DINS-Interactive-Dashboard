# Research Plan: Structural Characteristics and Damage Severity in the 2025 Eaton Fire

**Primary Research Question:** What structural characteristics recorded in CAL FIRE DINS are associated with differences in structure damage severity during the 2025 Eaton Fire?

**Secondary Methodological Question:** Can an agentic AI system construct and execute a reproducible wildfire data-analysis workflow, and where is human validation required?

---

## 1. Data Feasibility Assessment

### 1.1 CAL FIRE DINS (Damage Inspection Notes System)

**What it is:** CAL FIRE's field-level post-fire damage inspection database. Inspectors visit each structure after containment and record condition and structural attributes.

**How to access:** CAL FIRE publishes DINS as a hosted ArcGIS Feature Service. The Eaton Fire layer is expected at:
- ArcGIS REST base: `https://services1.arcgis.com/jUJYIo9tSA7EHvfZ/arcgis/rest/services`
- Also available via CAL FIRE's public viewer: `https://gis.fire.ca.gov`
- GeoJSON export endpoint pattern: `{service_url}/query?where=1%3D1&outFields=*&f=geojson`

**Known DINS field categories (standard schema):**
| Field Group | Example Fields |
|---|---|
| Damage outcome (dependent variable) | `damage_category` (Destroyed, Major, Minor, Affected, No Damage, Inaccessible) |
| Structure type | `structure_type` (Single Family, Multi-Family, Mobile Home, Commercial, etc.) |
| Construction era | `year_built` (often populated from assessor roll, not always present) |
| Roof characteristics | `roof_material` (Wood Shake, Tile, Composition Shingle, Metal, etc.) |
| Exterior siding | `eave_length`, `vent_type`, `siding_material` |
| Fire-resistant features | `deck_material`, `fence_attached`, `attached_structures` |
| Utility | `address`, `APN`, `lat`, `lon`, `inspection_date` |
| Vegetation context | `defensible_space_level` (0–100 ft compliance, may be absent or coarse) |

**Feasibility verdict:** DINS directly supports the primary research question. Damage category is the dependent variable. Structural attributes (roof material, siding, structure type) are candidate independent variables.

### 1.2 LA County Assessor Parcel Data (ArcGIS REST)

**What it is:** LA County's parcel database with assessed value, land use codes, year built, and address-matched to APNs.

**REST endpoint:** `https://arcgis.gis.lacounty.gov/arcgis/rest/services`

**Key joinable fields:** `APN` (matches DINS `APN`), `YearBuilt`, `LandUse`, `EffectiveYearBuilt`, `SQFootage`

**Feasibility verdict:** Parcel data adds year-built and building size where DINS records are incomplete. Join is non-trivial (APN format differences, address normalization). This is a **Phase 2 enrichment** step, not required for initial analysis.

---

## 2. Research Question Evaluation

### 2.1 Primary Question: Structural Characteristics vs. Damage Severity

**Is this supported by DINS?** YES, with important caveats.

DINS records both the outcome (damage category) and structural attributes for the same inspected structure. This is a direct match. The analysis is feasible as **descriptive statistics + inferential association testing**.

**However:**
- DINS was not designed as a research instrument. Field completion rates vary by incident, inspector team, and access conditions.
- The damage category is an ordinal outcome (ordered from No Damage → Destroyed), not a continuous variable. Analysis methods must respect this ordering.
- DINS captures **post-fire state**, not pre-fire state. Some fields (roof material visible after fire) may have measurement error.

### 2.2 Secondary Question: Agentic AI Workflow Evaluation

**Is this supported?** YES — this is methodologically novel and appropriate for a poster.

The research process itself becomes a data source for the second question. Bob's action log, revision history, and human intervention points are the evidence.

---

## 3. Candidate Variables

### Dependent Variable (Outcome)
| Variable | Type | Notes |
|---|---|---|
| `damage_category` | Ordinal, 5–6 levels | Primary outcome. Can be dichotomized (Destroyed vs. Not) for logistic regression, or analyzed ordinally. |

### Independent Variables (Structural Predictors)
| Variable | Type | Priority | Known Completeness Issue? |
|---|---|---|---|
| `roof_material` | Categorical | High | Generally well-captured |
| `structure_type` | Categorical | High | Generally well-captured |
| `siding_material` / `exterior_cladding` | Categorical | High | May have missing values |
| `deck_material` | Categorical | Medium | Often missing for structures without decks |
| `attached_structures` | Binary | Medium | Inspector-dependent |
| `vent_type` | Categorical | Medium | Important per WUI fire science |
| `year_built` | Numeric/Era | Medium | Frequently missing in DINS; parcel join helps |
| `defensible_space_level` | Ordinal | Medium | Coarse, not always recorded |
| `eave_length` | Categorical | Low | Sparse |

### Potential Confounders (to acknowledge, not fully model)
- Proximity to fire origin / fire perimeter edge
- Slope and topography (available from DEM, not DINS)
- Wind exposure during event (not in DINS)
- Neighboring structure damage (not in DINS)

---

## 4. Data Quality Concerns

### 4.1 Structural Concerns
1. **Missing data:** DINS fields for siding, vents, and eaves have historically high null rates in large urban-interface fires. Must quantify before analysis.
2. **Inspector variability:** Multiple teams inspect different zones; categorical field recording is not fully standardized.
3. **Inaccessible inspections:** Structures marked "Inaccessible" have no attribute data. These are **not missing at random** — inaccessible structures are often in the most severely burned zones, creating survivorship bias.
4. **Temporal gap:** Inspections occur over days to weeks post-fire. Structures inspected later may have additional clearance activity affecting attribute recording.
5. **Ordinal collapse:** "Destroyed" is the highest severity; the intermediate categories (Major, Minor, Affected) have less consistent field definitions across incidents.

### 4.2 Methodological Concerns
6. **Spatial autocorrelation:** Adjacent structures share exposure (fire spread). Statistical tests assuming independence are violated. This must be acknowledged.
7. **Ecological fallacy risk:** If analysis is done at aggregate level (e.g., block), individual-level inference is not valid.
8. **Selection of reference group:** Which damage category serves as the base level in comparisons matters for interpretation.

### 4.3 Causation vs. Association (Critical Distinction)
This study can establish **statistical association** between structural characteristics and damage severity. It **cannot establish causation** because:
- DINS is observational, not experimental.
- Structural characteristics co-vary with neighborhood age, socioeconomic status, and maintenance level (unmeasured confounders).
- Fire behavior (wind speed, ember density) is not uniform across the fire and is not captured in DINS.

All findings must be framed as: *"Structures with [characteristic X] were [more/less] likely to be classified as Destroyed, after accounting for structure type, adjusting for [covariates]."*

---

## 5. Proposed Analyses

### Phase 1: Data Acquisition and Quality Assessment
1. Retrieve DINS GeoJSON from CAL FIRE ArcGIS REST endpoint via Python (`requests`, `geopandas`)
2. Audit field completeness: count non-null rates for all candidate variables
3. Examine damage category distribution (frequency table and bar chart)
4. Map inspected structures by damage category (choropleth or dot map)

### Phase 2: Descriptive Analysis
1. Cross-tabulate structural characteristics by damage category
2. Calculate damage rates (% Destroyed) by roof material, structure type, siding
3. Produce stacked bar charts and summary tables
4. **Examine category frequencies:** If any intermediate category (Minor Damage, Affected) contains fewer than ~30 structures, collapse adjacent categories before proceeding to regression. Document the collapsing decision in the human review log — this is a researcher judgment call based on the observed distribution.

### Phase 3: Statistical Association Testing
1. **Chi-squared tests** for categorical predictors vs. damage category (omnibus test)
2. **Cramér's V** to quantify effect size for each categorical association
3. **Ordinal logistic regression** (proportional odds model) to test multiple predictors simultaneously, with damage category as ordered outcome. The number of ordinal levels used (5, 4, or 3) depends on the distribution observed in Phase 2.
4. Report odds ratios with 95% confidence intervals, not p-values alone
5. Check proportional odds assumption (Brant test or graphical check)

> **Note on machine learning:** ML (e.g., random forests) is not proposed. The sample size and research question are well-served by interpretable statistical models. ML would introduce unnecessary complexity, opaque feature importance, and overfitting risk without adding interpretive value for a poster.

### Phase 4: Geospatial Analysis
1. Plot DINS-inspected structures on a basemap with damage category coloring
2. Calculate Moran's I for spatial autocorrelation in damage outcomes (acknowledge, do not attempt to model)
3. Optional: buffer analysis around Eaton Fire perimeter to characterize edge vs. interior damage patterns

### Phase 5 (Optional, Data-Dependent): Parcel Enrichment
The primary DINS-only analysis must be complete and self-sufficient before this phase begins.

1. Download LA County Assessor parcel data for affected APN range
2. Normalize APN formats and join to DINS records
3. Report three diagnostic statistics:
   - Overall join rate (matched DINS records / total DINS records)
   - Join rate broken down by damage category (to detect systematic bias in which structures match)
   - Missingness rate of key parcel variables (`year_built`, `sq_footage`) among matched records
4. **Bias check:** Compare distribution of matched vs. unmatched DINS records across damage categories and structure types. If unmatched records are disproportionately concentrated in high-damage categories, note selection bias and do not generalize parcel-enriched findings.
5. If the matched subset is sufficiently complete and shows no systematic bias, add `year_built` (era-coded) and `sq_footage` to a secondary regression model.
6. Report parcel-enriched results as a secondary/sensitivity analysis, clearly distinguished from the primary DINS-only results.

---

## 6. Proposed Poster Figures

### Figure 1: Damage Category Distribution by Roof Material
- **Type:** Grouped bar chart (or 100% stacked bar chart)
- **X-axis:** Roof material categories (Wood Shake, Composition, Tile, Metal, Other)
- **Y-axis:** Proportion (%) of structures in each damage category
- **Why:** Directly addresses the research question; visually striking; communicates the central finding to a general audience
- **Bob's role:** Generate, iterate chart code; human reviews axis labels, color choices, category groupings

### Figure 2: Spatial Map of Damage Severity
- **Type:** Map (folium or geopandas static map) with fire perimeter overlay
- **Points:** Each DINS-inspected structure, colored by damage category
- **Basemap:** OpenStreetMap or ESRI light gray
- **Why:** Shows geographic distribution; reveals whether damage clustering aligns with fire spread; essential context for any wildfire study
- **Bob's role:** Generate map code, handle projection (EPSG:4326 → display); human validates geographic accuracy

### Figure 3: Odds Ratio Forest Plot (Ordinal Regression Results)
- **Type:** Forest plot (horizontal) showing odds ratios + 95% CIs for structural predictor categories
- **Reference groups:** clearly labeled (e.g., Tile roof as reference for roof material)
- **Why:** Presents statistical results in a transparent, reproducible format accessible to non-statisticians
- **Bob's role:** Generate plot code from model output; human reviews reference group selection and statistical interpretation

---

## 7. Bob's Agentic Role vs. Human Validation

### What Bob Can Do Agentically (Minimal Human Input Required)
| Task | Bob's Action |
|---|---|
| Fetch DINS GeoJSON from ArcGIS REST | Write and execute Python fetch script |
| Compute field completeness audit | Generate pandas `.isnull()` summary |
| Generate frequency tables and cross-tabs | Produce pandas cross-tabulation code |
| Write chi-squared test and Cramér's V code | Use `scipy.stats` |
| Fit ordinal logistic regression | Use `statsmodels` `OrderedModel` |
| Generate draft figures (1, 2, 3) | Write `matplotlib`/`seaborn`/`folium` code |
| Maintain project file structure | Create and organize directories |
| Write structured log entries | Append to `bob_action_log.jsonl` |
| Generate draft `README.md` and Methods section text | Write from code context |

### What Requires Human Validation (Researcher Must Decide)
| Decision Point | Why Human Must Decide |
|---|---|
| Confirm DINS endpoint is the correct and complete dataset | Endpoint version and completeness cannot be verified agentically |
| Select which damage categories to collapse (e.g., Major+Minor vs. keep ordinal) | Substantive domain judgment |
| Choose reference categories in regression | Statistical and interpretive choice |
| Interpret odds ratios in context of fire behavior | Requires domain knowledge beyond code |
| Confirm figure axis labels and category groupings are correct | Visual/interpretive judgment |
| Decide whether parcel join is sufficiently complete to include | Quality threshold judgment |
| Write poster text: Introduction, Background, Conclusion, Limitations | Narrative requires researcher voice and academic judgment |
| Validate geographic projections against known landmarks | Cannot be verified programmatically |
| Sign off on statistical assumptions (proportional odds check) | Statistical judgment |

---

## 8. Reproducible Project / File Structure

```
eaton-fire-dins-analysis/
│
├── README.md                        # Project overview, setup, and reproduction steps
├── eaton-fire-research-plan.md      # This plan file (version-controlled)
│
├── data/
│   ├── raw/
│   │   ├── eaton_dins.geojson       # Retrieved from CAL FIRE ArcGIS REST (do not edit)
│   │   └── la_parcels_raw.geojson   # Retrieved from LA County (optional Phase 2)
│   └── processed/
│       ├── eaton_dins_clean.csv     # After null audit and type normalization
│       └── eaton_dins_parcel.csv    # After APN join (optional Phase 2)
│
├── notebooks/
│   ├── 01_data_acquisition.ipynb    # Fetch DINS and parcel data
│   ├── 02_data_quality_audit.ipynb  # Completeness, distributions, outliers
│   ├── 03_descriptive_analysis.ipynb
│   ├── 04_statistical_analysis.ipynb
│   └── 05_geospatial_analysis.ipynb
│
├── scripts/
│   ├── fetch_dins.py                # Standalone fetch script (no notebook dependency)
│   ├── clean_dins.py
│   └── fit_ordinal_model.py
│
├── figures/
│   ├── fig1_damage_by_roof.png
│   ├── fig2_spatial_damage_map.png
│   └── fig3_odds_ratio_forest.png
│
├── logs/
│   ├── bob_action_log.jsonl         # Machine-readable log of all Bob actions
│   └── human_review_log.md         # Researcher notes on all human validation decisions
│
├── poster/
│   └── eaton_fire_poster_draft.pptx # Final poster (assembled by researcher)
│
└── requirements.txt                 # Python dependencies (pinned versions)
```

---

## 9. Bob Action Logging Schema

To evaluate the agentic AI workflow as a research artifact, every Bob action is logged. The log has two components:

### 9.1 Machine-Readable Log: `logs/bob_action_log.jsonl`
Each line is a JSON object:
```json
{
  "timestamp": "2025-01-15T14:32:00Z",
  "session_id": "session-001",
  "action_type": "code_generation | data_fetch | analysis | figure | plan_revision | error",
  "description": "Generated Python script to fetch DINS GeoJSON from CAL FIRE ArcGIS REST",
  "files_affected": ["scripts/fetch_dins.py"],
  "outcome": "success | failure | partial",
  "human_review_required": true,
  "human_review_note": "",
  "revision_of": null
}
```

**Action types:**
- `code_generation` — Bob wrote a new script or notebook cell
- `data_fetch` — Bob executed a data retrieval step
- `analysis` — Bob ran a statistical or descriptive analysis
- `figure` — Bob generated or revised a figure
- `plan_revision` — Bob updated the research plan
- `error` — Bob encountered an execution or data error (and how it was resolved)
- `human_intervention` — Researcher overrode, corrected, or redirected Bob's output

### 9.2 Human-Readable Log: `logs/human_review_log.md`
A researcher-maintained Markdown log with entries such as:
```markdown
## Session 2 — 2025-01-15

### Decision: Roof material reference category
Bob defaulted to alphabetical first category ("Composition Shingle") as regression reference.
Researcher changed to "Tile" because it is the most common and fire-resistant baseline category.
**Rationale:** Domain knowledge from WUI fire science literature.

### Error: APN join failure rate 38%
Bob flagged that 38% of DINS records did not match parcel APNs.
Researcher decision: Report join rate in limitations; do not include year_built in primary model.
```

### 9.3 Why This Supports the Methodological Research Question
The log provides evidence for:
- Which analytical steps Bob completed autonomously (and with what accuracy)
- Where human correction was necessary (and what kind of judgment was required)
- How many revisions occurred and why
- Whether the workflow is reproducible by another researcher following the log

---

## 10. Sub-Tasks for Implementation

### Sub-Task 1: Environment Setup and Data Acquisition
- **Intent:** Establish reproducible Python environment; fetch raw DINS data
- **Expected Outcomes:** `requirements.txt`, `data/raw/eaton_dins.geojson`, project directory structure created
- **Steps:**
  1. Create project directory structure as specified in Section 8
  2. Write `requirements.txt` (geopandas, pandas, requests, scipy, statsmodels, matplotlib, seaborn, folium, notebook)
  3. Write and test `scripts/fetch_dins.py` to query CAL FIRE ArcGIS REST endpoint
  4. **HUMAN REVIEW:** Verify the correct DINS layer for Eaton Fire is being queried; confirm record count is plausible (~9,000+ structures)
  5. Save raw GeoJSON to `data/raw/`
  6. Log action in `bob_action_log.jsonl`
- **Status:** [x] done — All files created. **HUMAN REVIEW GATE OPEN:** Researcher must confirm SERVICE_NAME in `scripts/fetch_dins.py` before running the fetch.

### Sub-Task 2: Data Quality Audit
- **Intent:** Quantify completeness of DINS fields before analysis
- **Expected Outcomes:** Completeness table (% non-null per field), distribution of damage categories, identified fields suitable for analysis
- **Steps:**
  1. Load `eaton_dins.geojson` into geopandas
  2. Compute null rates for all candidate variables
  3. Produce frequency table of `damage_category`
  4. **HUMAN REVIEW:** Researcher confirms which fields have sufficient completeness (>60% threshold suggested) to include in analysis
  5. Save cleaned dataset to `data/processed/eaton_dins_clean.csv`
  6. Log action
- **Status:** [ ] pending

### Sub-Task 3: Descriptive Analysis and Figure 1
- **Intent:** Characterize damage patterns by structural attributes
- **Expected Outcomes:** Cross-tabulation tables, Figure 1 (damage by roof material), Figure supplemental (damage by structure type)
- **Steps:**
  1. Run cross-tabulations for each structural predictor vs. `damage_category`
  2. Generate Figure 1 (grouped/stacked bar chart)
  3. **HUMAN REVIEW:** Confirm category groupings and axis labels are scientifically appropriate
  4. Save figures to `figures/`
  5. Log action
- **Status:** [ ] pending

### Sub-Task 4: Statistical Analysis and Figure 3
- **Intent:** Test formal associations; produce regression model and forest plot
- **Expected Outcomes:** Chi-squared test results, Cramér's V table, ordinal logistic regression output, Figure 3
- **Steps:**
  1. Run chi-squared tests for each predictor
  2. Compute Cramér's V effect sizes
  3. Fit ordinal logistic regression (proportional odds model)
  4. Generate Figure 3 (forest plot)
  5. **HUMAN REVIEW:** Researcher validates reference group choices, reviews proportional odds assumption check, interprets results in domain context
  6. Log action
- **Status:** [ ] pending

### Sub-Task 5: Geospatial Analysis and Figure 2
- **Intent:** Produce spatial visualization of damage patterns
- **Expected Outcomes:** Figure 2 (damage map with fire perimeter), Moran's I statistic
- **Steps:**
  1. Project DINS points to appropriate CRS
  2. Source Eaton Fire perimeter (NIFC GeoMAC or CAL FIRE)
  3. Generate Figure 2 (folium or matplotlib map)
  4. Compute Moran's I; report in limitations if significant
  5. **HUMAN REVIEW:** Verify geographic accuracy against known Altadena/Pasadena geography
  6. Log action
- **Status:** [ ] pending

### Sub-Task 6: Methods Documentation and Log Finalization
- **Intent:** Document the complete agentic workflow for the methodological research question
- **Expected Outcomes:** Complete `bob_action_log.jsonl`, `human_review_log.md`, `README.md`, draft Methods section text
- **Steps:**
  1. Compile complete action log
  2. Summarize Bob action counts by type (code_generation, error, human_intervention)
  3. Draft Methods section text describing agentic workflow
  4. **HUMAN REVIEW:** Researcher writes narrative interpretation of workflow evaluation
  5. Export summary statistics on the agentic workflow itself (a meta-analysis)
- **Status:** [ ] pending

---

## 11. Identified Weaknesses

### Empirical Weaknesses
1. **Missing data bias:** If high-missing fields (vents, eaves, defensible space) are the most theoretically important predictors, the analysis will be underpowered on the most interesting variables.
2. **Spatial autocorrelation is unmodeled:** The ordinal logistic regression treats observations as independent. In reality, adjacent structures share fire exposure. This inflates false positive rates. The analysis acknowledges but does not correct for this (correcting would require geographically weighted regression or spatial lag models — beyond poster scope).
3. **DINS is not a random sample:** Inspectors may prioritize accessible, heavily burned areas. The "Inaccessible" category is excluded by design, but these likely represent the most severely damaged structures.
4. **No fire behavior covariates:** Wind speed, fire spread direction, and fuel load at the structure level are not in DINS. These are likely stronger predictors of damage than roof material alone.
5. **Cross-sectional, post-event design:** Cannot distinguish whether structural characteristics caused different outcomes or whether other correlated factors (maintenance, age, neighborhood) did.

### Methodological Weaknesses
6. **APN join failure rate is unknown in advance:** If fewer than 50% of DINS records match parcel data, Phase 2 enrichment is not viable.
7. **DINS field definitions may differ from documented schema:** CAL FIRE's field naming conventions evolve by incident. The actual GeoJSON field names must be verified before writing analysis code.
8. **Ordinal regression assumption may fail:** The proportional odds assumption is frequently violated in practice. If the Brant test fails, a multinomial logistic regression or cumulative link model with non-proportional terms would be needed.

### Poster-Scope Weaknesses
9. **Causation framing risk:** Poster audiences may interpret associations as causal. The poster must explicitly state limitations in every section where findings are presented.
10. **Generalizability:** Findings are specific to the 2025 Eaton Fire context (urban-interface, high-wind event in older housing stock). Do not generalize to other fire types or regions without qualification.

---

## 12. Notes on Academic Integrity and Citation

- CAL FIRE DINS data must be cited with retrieval date and endpoint URL (data changes as inspections continue)
- All analyses generated by Bob must be reviewed and validated by the researcher before inclusion
- The poster must clearly state: "Analysis conducted with the assistance of IBM Bob agentic AI; all statistical interpretations reviewed and validated by [researcher name]"
- Consult your institution's IRB/ethics guidance on AI-assisted research if required
