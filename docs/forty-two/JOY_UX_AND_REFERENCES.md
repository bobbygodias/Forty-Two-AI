# Forty-Two AI — Joy UX & Reference Policy

**Checkpoint:** 2026-08-18 00:38 BRT (UTC-03:00)

This document preserves a core product intention developed during the long Forty-Two AI design conversation: the application should not merely function; when appropriate, it should leave the person a little lighter, more amused or more curious than when they opened it.

This is a UX aspiration, not a medical or therapeutic claim.

## North star: useful first, human second, joyful whenever possible

Forty-Two AI should be socially useful and emotionally pleasant without becoming saccharine, manipulative or distracting.

The ideal experience is:

- a sad or tired person can open the app and encounter warmth, wit and small moments of recognition instead of a sterile control panel;
- a person who already feels good can find additional delight through references, easter eggs and unexpectedly human microcopy;
- the application never forces cheerfulness when the user is clearly dealing with something serious;
- functionality remains legible even if the user does not understand a single cultural reference.

**Rule:** the joke is a bonus layer, never the interface contract.

## Tone

The product voice can be:

- intelligent;
- warm without infantilizing;
- dry or absurd when appropriate;
- lightly self-aware;
- nerdy without gatekeeping;
- playful without becoming noisy;
- capable of becoming completely plain when risk or clarity demands it.

Avoid fake enthusiasm, forced positivity, guilt, streak pressure, manipulative engagement loops and jokes that make the user feel mocked.

## Where joy and references belong

Good places for playful microcopy and easter eggs:

- onboarding and first launch;
- model-ready confirmations;
- non-critical loading states;
- empty states;
- successful downloads/imports;
- benchmark completion;
- completed maintenance/cleanup;
- optional helper text;
- About / Credits;
- model unload/close/exit moments;
- small status labels for experimental features;
- occasional button labels when the action remains unmistakable.

The same reference should not appear on every run. Repetition destroys the surprise.

## Where humor must step aside

First show the factual cause and actionable next step for:

- data loss/corruption;
- destructive deletion;
- credentials/secrets;
- camera/microphone/file/network permissions;
- insufficient memory;
- critical thermal throttling;
- crashes;
- failed model loads;
- backend mismatch;
- privacy/security warnings;
- any statement about actual hardware capability or actual inference execution.

Humor may appear only after the fact is clear, and never in a way that minimizes the problem.

## Reference hierarchy

### Tier 1 — canonical Forty-Two flavor

**The Hitchhiker’s Guide to the Galaxy** is the most natural reference family because the product name itself comes from 42.

Approved examples/concepts include:

- “Não entre em pânico.” for recoverable, non-critical waiting/error states;
- “Até mais, e obrigado pelos peixes.” for About/Credits/exit-like contexts;
- towel references as rare easter eggs;
- “42” as a subtle experimental/default/example number only when it does not corrupt a real technical parameter.

Use Brazilian Portuguese cultural phrasing when Portuguese is the selected locale rather than awkward literal translations.

### Tier 1 — Star Trek

Star Trek references are explicitly welcome. Forty-Two AI may use Trek-style easter eggs, wording or acknowledgements when they fit naturally.

Good reference themes include:

- “Vida longa e próspera”;
- transporter/Scotty jokes for moving/importing/exporting something;
- “resistência é inútil” only in harmless contexts where it cannot sound coercive;
- “onde ninguém jamais esteve” for discovery/exploration;
- Spock-style logic references for diagnostics/analysis.

Do not let Star Trek vocabulary make a technical control ambiguous.

### Explicit exclusion — Star Wars

**Do not use Star Wars references in Forty-Two AI.**

No Force, Jedi, Sith, lightsaber, droid or Star Wars quote/easter egg should be added as product flavor. This is a deliberate project preference, not an accidental omission.

### Tier 2 — broader classic pop culture

A preserved reference library from the project contains dozens of optional references spanning works such as:

- Back to the Future;
- The Matrix;
- The Terminator;
- The Lord of the Rings;
- Batman;
- Toy Story;
- The Lion King;
- Finding Nemo;
- Harry Potter;
- Sherlock Holmes;
- Apollo 13;
- Pokémon;
- Dragon Ball Z;
- Super Mario;
- Mortal Kombat;
- Chapolin Colorado;
- Chaves;
- Looney Tunes and other widely recognized classics.

These are seasoning, not a checklist. Never build a screen merely to justify a reference.

## Microcopy patterns

### Good pattern: fact + optional smile

Example structure:

1. “Modelo carregado. Backend efetivo: Vulkan — Mali-G57 MC2.”
2. Optional secondary text: a short playful line/easter egg.

The first sentence carries the truth. The second carries personality.

### Good pattern: recoverable wait

Primary: “Carregando o modelo…”
Secondary: “Não entre em pânico.”

### Good pattern: success

Primary: “Download concluído.”
Secondary: a rotating optional reference or original Forty-Two line.

### Bad pattern

“Tudo perfeito!” when the runtime silently fell back from Vulkan to CPU.

Forty-Two AI must prefer an unfunny truth over a funny lie.

## Internet access warning

If/when a model or feature can access the internet, the user must receive a clear warning before enabling it.

The warning must explain, in plain language:

- the necessary query/content may be sent to the external service or site being contacted;
- external content may be incorrect, malicious or misleading;
- third-party services follow their own terms/privacy policies;
- Forty-Two AI does **not** automatically send local files, credentials, conversation history or other private local data merely because internet access was enabled;
- users should treat internet-enabled model behavior as external-data interaction and **use it at their own risk**.

Humor can follow this explanation, never replace it.

## Reference implementation principle

References should be implemented as a small, maintainable microcopy/easter-egg layer rather than scattered hardcoded strings across screens.

Desired behavior:

- locale-aware;
- context-aware;
- sparse/rotating;
- easy to disable or reduce later if accessibility/usability requires it;
- never used as the sole label for destructive or technical actions;
- never used to fake system state.

## Accessibility and emotional respect

Joy should come from recognition, wit, clarity and craft — not from overstimulation.

Therefore:

- reduced motion/glow remains respected;
- references must not require fandom knowledge to understand an action;
- a serious user state should not trigger relentless jokes;
- avoid infantilizing diminutives or fake therapeutic language;
- no shame/guilt for leaving, not using the app, disabling features or choosing simpler models.

## Continuity note

The project File Library contains a preserved reference list with 63 pop-culture entries that inspired this layer. The exact list is reference material; this document is the policy that decides how (and whether) any of those references enter the product.

The product principle is more important than any individual quote:

> Make the app useful enough to trust, human enough to enjoy, and surprising enough to make somebody smile — without ever sacrificing clarity or truth.
