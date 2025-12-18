# GEMINI.md — JaZeR Visual Effects Engine

This file defines **non-negotiable context, constraints, and quality standards**
for any AI agent (Gemini CLI, Gemini Advanced, etc.) working in this repository.

If you are an AI agent: follow these rules exactly.
If a request conflicts with these rules, explain the conflict and propose a compliant alternative.

---

## 1. Project Identity

**Project:** JaZeR Visual Effects Engine  
**Repository:** visual-background-index  

JaZeR Visual Effects Engine is a **curated, professional-grade collection of standalone visual effects**, primarily built with **Three.js r160**, intended for:

- High-end web visuals
- Ambient background systems
- Cinematic looping visuals
- Sacred geometry and abstract motion art

These are **not demos**, **not experiments**, and **not UI widgets**.
Each effect is a **finished visual composition**.

---

## 2. Core Philosophy (Critical)

### Visuals come first
This project prioritizes:
- Visual clarity
- Cinematic motion
- Intentional composition
- Mathematical coherence

Code elegance matters **only insofar as it serves the visual result**.

### Refinement over reinvention
When asked to “improve” an effect:
- **Preserve the core motif**
- **Reduce noise, chaos, and visual clutter**
- **Refine motion, depth, and composition**
- Do **not** transform it into a different concept

If an effect stops reading as what it claims to be (e.g., Flower of Life),
that is a failure.

---

## 3. Technology Constraints

### Core stack
- **Three.js r160**
- JavaScript (ES Modules)
- HTML5 + CSS3
- WebGL (via Three.js)
- HTML5 Canvas (for select effects)

### Rendering rules
- Avoid unnecessary post-processing unless explicitly requested
- Prefer geometry, lighting, and motion discipline over shader noise
- Effects must run smoothly on mid-range hardware

---

## 4. Repository Structure (Do Not Break)

### `effects/`
- Each effect is a **standalone HTML file**
- Naming: `jazer-[effect-name].html`
- Effects must:
  - Run independently
  - Be loopable
  - Remain self-contained
  - Integrate cleanly into the main index infrastructure

### `lib/`
Shared logic only.
- Do **not** inline massive engine logic into effects if it belongs here
- Sacred geometry math should live in:
  - `lib/sacred-geometry/`

### `templates/`
- Use `jazer-effect-template.html` as the baseline
- New effects must conform to template conventions

---

## 5. What “Professional-Grade Visual” Means Here

### Motion
Avoid:
- Constant spinning
- Pure orbital camera paths
- Screensaver-style movement
- Unbounded noise or drift

Prefer:
- Slow, intentional motion
- Layered sinusoids
- Breath-like timing
- Subtle parallax
- Cinematic “glide” instead of rotation

If the camera is moving, it should feel **operated**, not automated.

---

### Composition
- A clear focal plane must exist
- Depth should be controlled with fog and fade, not clutter
- Fewer elements > more readable structure
- Gold / highlight colors are **rare accents**, not defaults

---

### Looping (Mandatory)
All visuals must support **true seamless looping**.

Rules:
- Use deterministic math
- Use periodic functions (`sin`, `cos`) tied to a known loop duration
- No accumulating drift
- No unseeded randomness

If a loop breaks or visibly “jumps,” it is unacceptable.

---

## 6. Sacred Geometry Rules (Extremely Important)

If an effect references sacred geometry (e.g., Flower of Life):

- The geometry must remain **recognizable**
- The underlying mathematical structure must be preserved
- Motion may enhance, but **must not destroy**, the form

### Flower of Life specifically:
- It is a **hexagonal lattice of overlapping circles**
- Mapping it naïvely to a cylinder or twisting it excessively will destroy legibility
- The viewer must be able to visually identify the pattern without explanation

Tunnel interpretations must:
- Preserve planar overlap relationships
- Fade or abstract *with distance*, not at the focal plane
- Avoid turning the pattern into a generic helix or ring tunnel

If the result no longer reads as Flower of Life, stop and revise.

---

## 7. Camera Design Rules

### Cinematic ≠ spinning
Camera motion must:
- Avoid continuous orbit
- Avoid constant roll
- Avoid symmetrical looping paths that feel mechanical

Preferred approaches:
- Dolly forward with subtle lateral drift
- Slow arc pushes
- Micro-parallax from layered movement
- Locked-off shots with environmental motion

Roll should be:
- Rare
- Minimal
- Purposeful

---

## 8. Performance Discipline

- No per-frame object allocation
- Use `InstancedMesh` where applicable
- Cache vectors, matrices, and colors
- Provide quality presets where relevant
- Pixel ratio must be clamped

Visual elegance is meaningless if the effect stutters.

---

## 9. AI Output Rules

When generating or modifying code:
- Preserve existing structure unless explicitly told otherwise
- Do not introduce unrelated concepts
- Do not create multiple “versions” of the same effect
- Prefer **small, meaningful improvements** over sweeping rewrites

When uncertain:
- Ask clarifying questions
- Do not guess wildly
- Do not “add complexity” to appear helpful

---

## 10. Success Criteria Checklist

Before finalizing any change, verify:

- [ ] The visual still reads as its named concept
- [ ] Motion feels intentional and cinematic
- [ ] Looping is seamless
- [ ] The scene is cleaner than before
- [ ] No unnecessary spin or chaos was introduced
- [ ] Performance remains solid

If any box cannot be checked, the work is incomplete.
