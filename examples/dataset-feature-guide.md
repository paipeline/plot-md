# Biopolymer dataset

> A model-ready guide to composition, test conditions, targets, and leakage-safe validation.

:::smd-hook title="It scored 0.99 R². Did it learn material science—or recognise the paper?"
Before celebrating, follow one formulation from its ingredients to its measured property. The shape of that journey tells us which features are real signal and which shortcuts are leakage.
:::

:::smd-visual title="Every row is a tiny experiment" variant="hero"
![A handcrafted scientific diorama where biopolymer ingredients pass through a laboratory machine and become a translucent film that is stretched, heated, and tested.](./assets/story/biopolymer-world-v1.jpg)

Composition and test conditions go in. One measured property comes out. The model must learn that journey without memorising the laboratory.
:::

:::smd-flow title="The learning task" variant="equation"
1. Polymer composition
2. Test conditions
3. Measured property
:::

Each row represents one measured property for one formulation. Scalar properties live in `dataset_*.csv`; kinetic curves live in `dataset_kinetic_*.jsonl`.

:::smd-note title="The rule that matters most" tone="critical"
Rows from the same paper are **not independent**. Always cross-validate with `paper_group` or the supplied `split_fold`. A random split leaks formulation and laboratory context into the test set, so it can make accuracy look much better than real generalisation.
:::

:::smd-meme title="RANDOM SPLIT: 0.99 R². WE ARE SO BACK." variant="classic"
![An overconfident scientist celebrates while the same stack of research papers enters two evaluation gates, with the second copy wearing sunglasses and a moustache.](./assets/memes/random-split-classic-v2.jpg)

**同一篇论文：** 戴个假胡子，再考一次。
:::

:::smd-reveal title="The model did not learn material science. It learned the handwriting of one paper."
Grouping by `paper_group` removes that disguise. The score may fall, but what remains is the first honest estimate of generalisation.
:::

## Feature contract

:::smd-matrix title="What enters the model" variant="tiers"
| Tier | Columns | Treatment |
|---|---|---|
| Must - inputs | `role_*_wt`, `n_components`, `plasticizer_present`, `filler_present`, `dominant_matrix`, `matrix_chem_family`, relevant `cond_*` | Train on these |
| Must - plumbing | `target_value`, `target_log`, `log_space`, `target_in_bounds`, `unit_status`, `paper_group`, `split_fold` | Target, filtering, routing, and validation |
| Nice | `feat_reduced_temp`, `composition_sum`, `composition_complete`, `n_unmapped_components`, `confidence_score` | Add when the family benefits |
| Discard | IDs, hashes, provenance, `process_type`, raw targets, `feat_crystallinity_weight` | Audit metadata or zero information |
:::

:::smd-visual title="One formulation, three representations" variant="scene"
![A handmade scientific railway fork where one biopolymer formulation branches into dense role vessels, four measuring tanks, and a wall of mostly empty component drawers.](./assets/story/composition-encoding-fork-v1.jpg)

The three encodings are alternate views of the same formulation—not three independent signals. Feeding all of them together repeats information and inflates dimensionality.
:::

:::smd-decision id="composition-encoding" status="accepted" title="Choose one composition encoding" variant="comparison"
| Encoding | Shape | Best use | Risk |
|---|---|---|---|
| `role_*_wt` | 11 dense functional-role columns | Recommended first model | Loses named-component detail |
| `feat_*_fraction` | 4 normalised fractions | Robust when mass does not sum to 100 | Coarser representation |
| `comp__*` | About 126 sparse component columns | Learned component embeddings | About 99% zeros; weak alone |

**Outcome:** Start with `role_*_wt` plus blend-structure scalars. Do not feed all three raw encodings together because they describe the same composition.
:::

:::smd-checkpoint title="Choose the first honest baseline"
1. Start with `role_*_wt` and blend-structure scalars.
2. Add only the test conditions that govern the target property.
3. Keep `paper_group` outside the feature matrix and use it for splitting.
:::

## Training pipeline

:::smd-flow title="Leakage-safe preparation" variant="steps"
1. Keep rows where `target_in_bounds == true` and `unit_status == "ok"`.
2. Route the target with `log_space`; use `target_log` for moduli and permeabilities that span orders of magnitude.
3. Split with `paper_group` or reuse `split_fold`.
4. One-hot `dominant_matrix`, `matrix_chem_family`, and `process_method`.
5. Add a missing indicator for incomplete test conditions, then impute inside the training fold.
6. Standardise numeric inputs for neural models; tree models do not require scaling.
7. Train one model per property file because units and governing physics differ.
:::

## Where the signal lives

:::smd-matrix title="Property-family map" variant="columns"
| Family | Primary signal | Required context | Honest expectation |
|---|---|---|---|
| Intrinsic thermal | Polymer composition and chemistry | DSC heating rate and cycle | Strongest family from composition |
| Mechanical | Composition and morphology | Temperature, strain rate, process | Composition alone generalises poorly |
| Barrier | Chemistry and structure | Thickness, humidity, temperature | Use log-space; data is often lower-volume |
| Degradation / uptake | Medium-sensitive kinetics | Medium and temperature | Natural home for time-series and PINNs |
:::

:::smd-visual title="The same film lives in two regimes" variant="split"
![A continuous handmade polymer film passes through a brass temperature threshold, appearing cold, glassy, and cracked on the left and warm, elastic, and stretched on the right.](./assets/story/reduced-temperature-world-v1.jpg)

Reduced temperature gives the model a compact physics clue: below the transition the film is glassy and brittle; above it, rubbery and ductile.
:::

:::smd-note title="A useful physics prior" tone="insight"
`feat_reduced_temp = T_test / T_g`. Values below 1 indicate a glassy or brittle regime; values above 1 indicate a rubbery or ductile regime. Keep the feature, but preserve a missing indicator when blend `T_g` is unavailable.
:::

## Kinetic data

Each JSONL record adds a raw time series:

- `value_series.points` - the observable curve.
- `endpoint_value` - the final plateau.
- `time_to_50`, `time_to_90` - time to reach a fraction of the endpoint.
- `kinetic.rate_k_per_day`, `kinetic.asymptote_A` - a first-order baseline.

:::smd-note title="Next dataset version" tone="caution"
The first export is mainly a role-based encoding. The suggested v2 adds dense physical descriptors such as Fox blend `T_g`, Voigt/Reuss modulus bounds, Hansen solubility parameters, miscibility proxies, and decoded test conditions. These descriptors are the most promising route to generalising beyond polymers already seen during training.
:::

:::smd-checkpoint title="If you remember only four things"
- One row is one measured property for one formulation.
- Composition only makes sense beside the conditions of measurement.
- Split by paper, never by random row.
- Prefer one compact composition encoding, then add physics-informed descriptors.
:::
