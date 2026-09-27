# Aiditr landing page — agent prompt

Copy everything below the line into your AI agent. Replace the `[bracketed]` placeholders before launch.

---

You are designing and building the marketing landing page for **Aiditr** (aiditr.com). Your job is to make a first-time visitor understand, within 5 seconds, what Aiditr makes, who it is for, and why it is different, and then get them to click **Start creating**.

## 1. What Aiditr is (use this as the source of truth; do not invent features)

Aiditr turns a short description, plus up to 4 optional reference images, into a **live, animated design tool**: a working canvas with its own controls. It does not generate one image. It generates the *tool* that makes the images, so you can reuse it every day.

The core idea to communicate: **"Describe it once, use it every day."** An image generator gives you one picture. Aiditr gives you a small custom app, with sliders, colour pickers, text fields and image slots, that makes as many on-brand visuals as you need.

### The real user flow

1. **Describe.** Type what you want ("an animated quote card with a grainy gradient, a big serif quote and my logo in the corner") and optionally attach up to 4 inspiration screenshots. Aiditr may ask one or two quick clarifying questions.
2. **Wait about 1–2 minutes.** Aiditr plans the tool, writes it, then renders and checks it in a real browser. Blank or broken results are caught and repaired automatically before you see them.
3. **Tune in the Studio.** The tool opens on a live canvas with its generated controls: sliders (speed, density, grain…), colour pickers, dropdowns, toggles, text fields, and image slots for your logo or photos. Controls are grouped so the panel stays readable.
4. **Refine by chat.** Ask for changes in plain words ("slower", "more contrast", "add a second line of text", "make the particles follow the cursor"). The chat keeps its history per tool.
5. **Pick a canvas size.** Presets: HD 16:9 (1280×720), Square 1:1 (1080×1080), 4:3, Portrait 4:5 (1080×1350), Story 9:16 (1080×1920), or a custom width × height.
6. **Export.** PNG still; a short looping video (3–6 seconds, WebM); or a PNG-sequence ZIP to finish in your own editor.
7. **Share.** Share a public link, copy an embed code to put the live tool on any website, or publish to the public gallery.
8. **Discover and remix.** Browse the gallery. **Remix** any published tool into your own Studio, swap in your colours and logo, and make it yours. Your profile lists every tool you created or remixed.

### What it makes well

2D and 3D motion graphics and generative visuals: animated gradient posters, kinetic typography, particle fields, glowing neon trails, logo animations, orbiting/looping shapes, 3D depth scenes, and interactive cards that react to the cursor (for example, an image that pixelates as the mouse approaches).

### What it is NOT (never imply otherwise)

- Not a video editor. It does not edit your footage, cut clips, add subtitles or do voice-over. The name contains "editor", so the page must make this clear early.
- Not a photo-realistic image or video generator.
- Not long-form animation: video exports are short 3–6 second loops.
- No MP4 export yet (WebM and PNG sequence only). Do not mention MP4.
- Visitors who open a shared link can watch the tool, but cannot change its controls. Only the owner (or someone who remixes it) can tweak it.
- No coding needed. A "view source" panel exists for the curious, but never make code a selling point.

### Plan and limits

- Free during beta: **[10] creations per day**. Refining is included.
- Publishing: **[describe your launch policy, e.g. "Your tools stay private until you publish them"]**.
- Pricing page: **[none for beta / link]**.

## 2. Who it is for, and how they use it day to day

Write the use-case section as **short, concrete "a day with Aiditr" scenarios**, not abstract benefits. Each one has four parts: the everyday problem, what they typed, the tool they got, and how they reuse it. Use roles, not invented names or photos.

1. **Social media manager (daily posts).**
   Problem: needs a fresh, on-brand visual every day and has no designer free.
   Typed: "Animated quote card, soft grain gradient in our brand colours, big serif quote, logo bottom-right."
   Got: controls for quote text, 3 brand colours, grain amount, motion speed, plus a logo slot.
   Every day after: change the text, export a 4:5 PNG for the feed and a 9:16 4-second loop for Stories. Under a minute per post.

2. **Motion / brand designer (exploring an identity).**
   Problem: exploring variations in After Effects means re-keyframing everything for every idea.
   Typed: "Kinetic logo: my mark assembles from particles and settles, seamless loop."
   Got: toggles for shape, assembly style and material, plus speed and palette.
   After: drags sliders live in the client call to show 20 directions in 5 minutes, exports a PNG sequence to finish in their editor, and sends the client a share link.

3. **Founder or marketer (launch week).**
   Problem: needs launch visuals and a hero background for the website by Friday.
   Typed: "Slow-drifting gradient poster with our product name, calm and premium."
   Got: headline text, gradient colours, drift speed and grain controls.
   After: exports announcement loops for LinkedIn and X and embeds the live tool as the animated background on the landing page.

4. **Creator or streamer (channel packaging).**
   Problem: every stream, Short and video needs intros, backgrounds and thumbnails.
   Typed: "Neon trail background, 'Starting soon' text, purple and cyan."
   Got: text, colours, trail length and glow controls.
   After: a 16:9 version for the stream screen, a 9:16 loop for Shorts, and a still for thumbnails, all from the same tool.

5. **Web / portfolio designer (interactive pieces).**
   Typed: "Project card where my image pixelates and distorts as the cursor gets close."
   After: embeds it on their portfolio with the embed code, so it's live and interactive, not a GIF.

6. **Browsers (no idea yet).**
   Open the gallery, find something close, hit Remix, and swap in their colours and logo. They have their own tool in a minute without writing a prompt.

## 3. Page structure (in this order)

1. **Nav.** Aiditr wordmark · Gallery · How it works · Use cases · FAQ · Sign in · primary pill CTA **Start creating**.
2. **Hero.**
   - Headline: pick one of these or write a better one in the same spirit:
     - "Describe it once. Make it every day."
     - "Don't generate a graphic. Generate the tool that makes them."
     - "Your own motion design tools, made from a sentence."
   - Subhead (1–2 lines): "Aiditr turns a description into a live, animated design tool with its own sliders, colours and image slots. Tweak it, drop in your logo, export a PNG or a short loop, and come back tomorrow for the next one."
   - CTAs: **Start creating** (solid) and **Browse the gallery** (outline).
   - Hero visual: **show a real, running tool with a control the visitor can drag** (for example, a slider that changes colour or speed live). This single interaction proves "tool, not image" better than any copy. Use a real published tool embed or a faithful mock of the Studio (canvas centre, controls on the side). No decorative 3D blobs, stock images or AI-art collage.
   - Optional: a prompt box with example chips ("Kinetic type poster", "Particle field logo", "Neon trail background", "Grainy gradient quote card", "Cursor-reactive image card", "3D depth cube"). If you add it, it must carry the text into the Create page, and the Create page must read it. Wire both ends.
3. **"Not an image. A tool."** One visual explainer: one prompt → one tool with controls → 3–4 different outputs from the same tool (different text, colours and sizes). This is the key concept section.
4. **How it works.** 3 steps: **Describe → Tune → Ship**, one sentence each, with a small product visual per step. Mention the 1–2 minute wait and the automatic browser check honestly; it builds trust.
5. **A day with Aiditr (use cases).** Tabs or a segmented control by role (Social · Designer · Founder · Creator · Web). Each tab shows the scenario from section 2 and a visual of that tool. Avoid a grid of identical cards.
6. **What people are making.** A strip or scroller of real tools from the public gallery (live thumbnails), linking to /gallery. If the gallery is thin at launch, show 6–8 hand-picked tools you made yourself.
7. **What to expect.** A plain, honest two-column block:
   - *Great for:* motion graphics, generative backgrounds, kinetic type, logo loops, interactive embeds, on-brand repeatable visuals.
   - *Not for:* editing your videos, photo-real images, long animations, MP4 files (yet).
   - Plus the practical facts: 1–2 minutes per creation, [10] free per day, exports (PNG, 3–6s WebM loop, PNG sequence), share links and embeds.
8. **FAQ.** Is Aiditr a video editor? (No, and explain what it is.) Do I need to code? What can I export, and at what sizes? Can I use my own logo and brand colours? How is it different from Canva, Midjourney or After Effects? What are the gallery and Remix? Is it free? Who owns what I make? ([link to Terms]) How do I say "Aiditr"? ([your chosen pronunciation])
9. **Final CTA band.** Full-width solid Aiditr-blue band: one line ("Make your first tool in two minutes.") and a white pill **Start creating** button.
10. **Footer.** Gallery · Sign in · Terms · Privacy · Contact ([email]) · © [year] Aiditr.

## 4. Voice and copy rules

- Calm, confident, craft-focused: "creative director energy". Short sentences. Labels over lectures.
- Concrete over abstract: say "change the text, export a 9:16 loop", not "unlock limitless creativity".
- Banned: "revolutionary", "game-changing", "unleash", "supercharge", "limitless", "magic", "10x", emoji in headings.
- **No fake social proof:** no invented testimonials, user counts, "trusted by" logo walls or star ratings. Add them only when real.
- Use "tool" consistently for what Aiditr makes; do not switch between "template", "widget", "app" and "asset".

## 5. Visual design system (match the existing product)

- Canvas: white `#FFFFFF`; text `#1C1D1F`; muted text `#5C5C5C`; soft bands `#FAFAFA`; borders `#E4E7EC`.
- **One accent only:** Aiditr blue `#0000FF`, used for the primary CTA, the final CTA band and links. Secondary solid buttons are near-black `#202124` with light text. No gradients on UI chrome, no glassmorphism, no gradient text.
- Type: Geist (sans) for everything, and Geist Mono only for small technical labels. Large headlines use tight tracking (about -0.03em) and a restrained weight.
- Shapes: pill CTAs about 48px tall; cards 10px radius; panels 12px radius; hairline borders rather than heavy shadows.
- Motion: 120–240ms, `cubic-bezier(0.4, 0, 0.2, 1)`, small fades and rises on scroll. Everything must respect `prefers-reduced-motion`. The product visuals move, and the page chrome stays calm.
- Layout: generous whitespace, asymmetric hero (copy left, live tool right on desktop; stacked on mobile), light and soft-grey band rhythm, and product UI as the imagery. The canvas is the star.
- Accessibility: WCAG AA contrast, keyboard reachable everything, visible focus rings, touch targets ≥ 44px, real alt text, and captions or labels on any autoplaying visual.
- Responsive: flawless at 375px, 768px, 1280px and 1440px. No horizontal scroll.
- Dark mode: support it using the same token names (dark background, light text, same blue accent).

## 6. SEO and sharing

- `<title>`: "Aiditr: turn a sentence into your own motion design tool"
- Meta description (≤155 chars): "Describe a visual, get a live design tool with sliders, colours and your logo. Export PNGs and short loops, share, embed and remix. Free in beta."
- Open Graph and Twitter image: 1200×630, showing the Studio with a tool on the canvas and controls visible, plus the wordmark.
- JSON-LD `SoftwareApplication` (name Aiditr, applicationCategory DesignApplication, offers price 0 during beta).
- One `<h1>`, a logical heading order and semantic sections.

## 7. If you are building inside the Aiditr codebase

- Next.js 16 App Router + Tailwind v4 utilities on the CSS variable tokens in `apps/web/app/globals.css`. Don't hard-code new colours; add tokens if needed.
- The landing lives in `apps/web/features/landing/` and is rendered by `apps/web/app/page.tsx`. Use `motion/react` (already installed) for animation. Don't add dependencies without a clear reason.
- Routes: `/create` (auth-gated; logged-out users get redirected to `/login?next=/create`), `/gallery`, `/signup`, `/login`, published tools at `/t/{publicId}`.
- Live gallery data: `GET /api/v1/public/gallery` (anonymous, same-origin).
- Verify in a real browser: every CTA and its logged-out/logged-in path, the gallery strip loading and empty states, mobile and desktop, both themes, and reduced motion. A screenshot of the hero is not enough.

## 8. Definition of done

- A stranger can say what Aiditr does after reading only the hero.
- The "tool, not image" idea is shown interactively, not just stated.
- Every claim on the page matches section 1. Nothing is promised that the product can't do today.
- Lighthouse: Performance ≥ 90 and Accessibility ≥ 95 on mobile.
