---
name: Premium narration boundary
description: The product boundary between free device speech and paid enhanced narration.
---

Tier 1 device text-to-speech remains available without an account or subscription. Enhanced ElevenLabs narration is a paid capability and must be protected by the RevenueCat entitlement before audio synthesis.

**Why:** The reader's existing import, local library, progress, speed, and device playback behavior are the free experience; premium narration should add value without breaking that baseline.

**How to apply:** Treat missing store configuration as a setup state rather than granting premium access. Configure the RevenueCat store products and entitlement before enabling public checkout.

Development preview is allowed only when the client is a development build and the server is running with `NODE_ENV=development` plus an explicit preview request flag; production synthesis must always require the entitlement.

**Why:** Developers need a fast way to evaluate ElevenLabs voices before store products exist, but a client-only unlock would be an unsafe production bypass.

**How to apply:** Keep the preview switch hidden from production builds and enforce the environment check on the server, not just in the mobile UI.