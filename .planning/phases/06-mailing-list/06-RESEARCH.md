# Phase 6: Mailing List - Research

**Researched:** 2026-03-13
**Domain:** Email service provider integration for author website
**Confidence:** HIGH

<research_summary>
## Summary

Researched email service providers (ESPs) suitable for a non-technical author managing a mailing list for book updates and events. The key finding: **Mailchimp's free tier has been gutted** (250 contacts, 500 emails/month, no automation) making it a poor choice in 2026.

**MailerLite emerges as the clear winner** for this use case: it offers the cleanest interface for non-technical users, a reasonable free tier (1,000 contacts, 12,000 emails/month), and trivial HTML embed integration that works perfectly with the existing Astro footer form.

The site already has a newsletter form UI in the footer (`src/components/Footer.astro`) - it just shows an alert on submit. Integration requires: (1) creating a MailerLite account, (2) setting up a subscriber group, (3) replacing the form's action with MailerLite's endpoint.

**Primary recommendation:** Use MailerLite with HTML form embed. Minimal code changes, excellent admin UX, generous free tier.
</research_summary>

<standard_stack>
## Standard Stack

### Core - Recommended
| Service | Free Tier | Purpose | Why Recommended |
|---------|-----------|---------|-----------------|
| **MailerLite** | 1,000 contacts, 12,000 emails/mo | Email service provider | Cleanest UI, best for non-technical admins, great free tier |

### Alternatives Evaluated
| Service | Free Tier | Pros | Cons |
|---------|-----------|------|------|
| Kit (ConvertKit) | 10,000 contacts | Largest free tier, creator-focused | Steeper learning curve, more complex |
| Beehiiv | 2,500 contacts | Growth features, referral network | No automation on free tier, $49/mo paid tier jump |
| EmailOctopus | 2,500 contacts, 10,000 emails | Good free tier | Less polished UI |
| **Mailchimp** | 250 contacts, 500 emails | Name recognition | Gutted free tier, counts unsubscribed toward limit, avoid |
| Substack | Unlimited | Free forever | 10% cut if monetizing, newsletter-centric not ESP |

### Why NOT Mailchimp (2026)
- Free tier slashed: 250 contacts, 500 emails/month (was 2,000 contacts)
- No automation on free tier (removed June 2025)
- Counts unsubscribed contacts toward your limit
- Mailchimp logo forced on all emails
- Starting paid tier: $13/month for 500 contacts
- Industry sentiment: "overpriced for what you get"

### Why MailerLite for Non-Technical Admin
From user research:
- "Clear, modern, 'no bullshit' interface"
- "Even a complete beginner can send first campaign in less than an hour"
- "Everything is tidy, legible, and logical"
- "Intuitive drag-and-drop editor"
- "Fast onboarding without technical setup"

Kit (ConvertKit) comparison: "Kit adopts a cleaner but slightly more technical style... you need to understand the logic of tagging and automation"
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Pattern 1: HTML Form Embed (RECOMMENDED)
**What:** Replace existing form action with MailerLite POST endpoint
**When to use:** Static sites, existing form UI, minimal changes wanted
**Why:** No JavaScript changes needed, keeps existing styling, just change form action

```html
<!-- Current form (just shows alert) -->
<form class="footer__form" id="newsletter-form">
  <input type="email" placeholder="Your email" required />
  <button type="submit" class="btn btn--primary">Subscribe</button>
</form>

<!-- Updated form (posts to MailerLite) -->
<form
  class="footer__form"
  action="https://assets.mailerlite.com/jsonp/{ACCOUNT_ID}/forms/{FORM_ID}/subscribe"
  method="POST"
  data-code="{FORM_CODE}"
>
  <input type="email" name="fields[email]" placeholder="Your email" required />
  <button type="submit" class="btn btn--primary">Subscribe</button>
</form>
```

### Pattern 2: JavaScript Embed
**What:** Use MailerLite's JavaScript snippet
**When to use:** Want MailerLite's popup/success animations
**Why:** More polish, but adds JavaScript dependency

```html
<!-- In <head> of BaseLayout.astro -->
<script src="https://assets.mailerlite.com/js/universal.js" async></script>

<!-- In Footer.astro -->
<div class="ml-embedded" data-form="{FORM_ID}"></div>
```

### Recommended Project Changes
```
src/
└── components/
    └── Footer.astro    # Update form action + add hidden fields
```

Single file change. No new dependencies. No JavaScript additions.

### Anti-Patterns to Avoid
- **Building custom email delivery:** Use ESP, never hand-roll
- **Storing emails locally:** GDPR/CAN-SPAM complexity, use ESP
- **Using Netlify Forms + manual export:** Defeats automation, creates admin burden
- **JavaScript-heavy popup forms:** Unnecessary complexity for simple signup
</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email delivery | SMTP integration | MailerLite/ESP | Deliverability, spam filtering, reputation |
| Subscriber storage | Database table | MailerLite | GDPR, unsubscribe handling, compliance |
| Double opt-in | Custom email flow | MailerLite (built-in) | Legal compliance, reduces fake signups |
| Unsubscribe handling | Manual removal | MailerLite (automatic) | CAN-SPAM requires one-click unsubscribe |
| Email templates | Custom HTML | MailerLite drag-and-drop | Non-technical admin can edit |
| Welcome sequences | Custom automation | MailerLite automations | Visual builder, no code needed |

**Key insight:** Email delivery seems simple but has massive hidden complexity: SPF/DKIM/DMARC configuration, bounce handling, spam reputation, unsubscribe compliance, GDPR consent tracking. ESPs solve all of this.
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Form Submission Without Success State
**What goes wrong:** User submits, nothing visible happens
**Why it happens:** Form posts to ESP but page doesn't indicate success
**How to avoid:** Use MailerLite's success redirect OR add client-side success state
**Warning signs:** Users submitting multiple times, confusion

**Solution:** Add thank-you redirect or success message:
```html
<input type="hidden" name="ml-submit" value="1" />
<input type="hidden" name="anticsrf" value="true" />
<!-- MailerLite handles redirect to thank-you page -->
```

### Pitfall 2: Missing GDPR Consent
**What goes wrong:** European visitors sign up without consent checkbox
**Why it happens:** US-focused development forgetting international visitors
**How to avoid:** Add consent checkbox for international compliance
**Warning signs:** None until legal issue arises

**Solution:** Add optional consent checkbox:
```html
<label>
  <input type="checkbox" name="gdpr" required />
  I agree to receive email updates
</label>
```

### Pitfall 3: ESP Account Not Verified
**What goes wrong:** Forms stop working, emails don't send
**Why it happens:** MailerLite requires email/domain verification
**How to avoid:** Complete verification before going live
**Warning signs:** Test submissions not appearing in dashboard

### Pitfall 4: Wrong Field Names
**What goes wrong:** Email captured but blank in ESP
**Why it happens:** Input `name` attribute doesn't match ESP expected format
**How to avoid:** Use exact field names from ESP embed code
**Warning signs:** Subscribers appear with empty email field
</common_pitfalls>

<integration_steps>
## Integration Steps

### MailerLite Setup (Admin Tasks - One Time)
1. Create MailerLite account at mailerlite.com
2. Verify email address
3. Create subscriber group (e.g., "Book Updates")
4. Create embedded form:
   - Forms → Embedded forms → Create form
   - Select subscriber group
   - Design minimal form (or skip styling - we keep our CSS)
5. Get embed code:
   - Overview → HTML tab
   - Copy the form action URL and required hidden fields

### Code Changes (Developer Tasks - ~15 min)
1. Update `Footer.astro`:
   - Change `<form>` action to MailerLite endpoint
   - Add `method="POST"`
   - Add required hidden fields
   - Update input `name` to `fields[email]`
   - Remove JavaScript alert handler (optional: replace with success state)

2. Test:
   - Submit test email
   - Verify appears in MailerLite dashboard
   - Test unsubscribe link works

### Optional Enhancements
- Success page redirect
- Inline success message (JavaScript)
- GDPR consent checkbox (if targeting EU)
- Welcome email automation in MailerLite
</integration_steps>

<code_examples>
## Code Examples

### Minimal Footer Form Update
```astro
<!-- Footer.astro - Updated newsletter form -->
<form
  class="footer__form"
  action="https://assets.mailerlite.com/jsonp/YOUR_ACCOUNT/forms/YOUR_FORM/subscribe"
  method="POST"
>
  <input type="hidden" name="ml-submit" value="1" />
  <input
    type="email"
    name="fields[email]"
    placeholder="Your email"
    required
  />
  <button type="submit" class="btn btn--primary">Subscribe</button>
</form>

<!-- Remove the JavaScript alert handler -->
```

### With Success Message (Enhanced)
```astro
---
const currentYear = new Date().getFullYear();
---

<div class="footer__newsletter">
  <h4>Stay Updated</h4>
  <p class="footer__text">Join our mailing list for book updates and events.</p>
  <form
    class="footer__form"
    id="newsletter-form"
    action="https://assets.mailerlite.com/jsonp/YOUR_ACCOUNT/forms/YOUR_FORM/subscribe"
    method="POST"
  >
    <input type="hidden" name="ml-submit" value="1" />
    <input
      type="email"
      name="fields[email]"
      placeholder="Your email"
      required
    />
    <button type="submit" class="btn btn--primary">Subscribe</button>
  </form>
  <p class="footer__success" id="newsletter-success" hidden>
    Thanks for subscribing!
  </p>
</div>

<script>
  const form = document.getElementById('newsletter-form');
  const success = document.getElementById('newsletter-success');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form as HTMLFormElement);

    try {
      await fetch((form as HTMLFormElement).action, {
        method: 'POST',
        body: formData,
        mode: 'no-cors' // MailerLite doesn't return CORS headers
      });
      (form as HTMLFormElement).style.display = 'none';
      success?.removeAttribute('hidden');
    } catch (error) {
      // Fallback: submit form normally
      (form as HTMLFormElement).submit();
    }
  });
</script>

<style>
  .footer__success {
    color: var(--color-accent);
    font-style: italic;
  }
</style>
```
</code_examples>

<sota_updates>
## State of the Art (2025-2026)

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Mailchimp free tier | Avoid Mailchimp | 2024-2026 | Free tier gutted to 250 contacts |
| ConvertKit name | Kit rebrand | 2024 | Same product, new name |
| Complex integrations | HTML form POST | Ongoing | Simpler is better for static sites |

**Industry Trends:**
- Free tiers shrinking across all ESPs
- MailerLite and Kit maintaining most generous free offerings
- Substack gaining traction for newsletter-first creators
- Beehiiv growing for growth-focused newsletters

**For Author Websites Specifically:**
- Simple email capture is sufficient (no complex automations needed)
- Focus on ease of admin use over advanced features
- MailerLite's simplicity wins over Kit's power features
</sota_updates>

<admin_guide>
## Non-Technical Admin Guide

### What Diane Will Do (After Setup)

**In MailerLite Dashboard:**
1. **View subscribers:** Dashboard shows total count and recent signups
2. **Send newsletter:** Campaigns → Create → Drag-and-drop editor
3. **See analytics:** Open rates, click rates per campaign
4. **Manage list:** Remove bounces, handle unsubscribes (automatic)

**What's Automatic:**
- Double opt-in confirmation emails
- Unsubscribe handling (one-click, legally compliant)
- Bounce management
- Basic analytics

**Learning Curve:** ~30 minutes to send first newsletter

### MailerLite Free Tier Limits
- 1,000 subscribers
- 12,000 emails/month
- MailerLite branding on emails
- Limited templates (but sufficient for author newsletter)

**When to Upgrade:** At 1,000 subscribers ($10/month for Growing Business plan)
</admin_guide>

<open_questions>
## Open Questions

1. **Success state preference**
   - What we know: Can do inline success message or redirect to thank-you page
   - What's unclear: User preference
   - Recommendation: Start with inline message (simpler), add dedicated page if wanted

2. **GDPR checkbox**
   - What we know: Required for EU compliance
   - What's unclear: Whether site targets EU visitors
   - Recommendation: Add checkbox to be safe (low effort, high protection)

3. **Welcome email**
   - What we know: MailerLite supports automated welcome sequences
   - What's unclear: What content Diane wants in welcome email
   - Recommendation: Set up after form integration works
</open_questions>

<sources>
## Sources

### Primary (HIGH confidence)
- [MailerLite Official - Embedded Forms](https://www.mailerlite.com/help/how-to-create-an-embedded-form)
- [MailerLite Official - Adding Forms](https://www.mailerlite.com/help/how-to-add-a-form-to-your-website)

### Secondary (MEDIUM confidence)
- [Kindlepreneur - Email Services for Authors 2026](https://kindlepreneur.com/best-email-services-for-authors/)
- [EmailToolTester - Free Email Marketing Services 2026](https://www.emailtooltester.com/en/blog/free-email-marketing-services/)
- [EmailToolTester - MailerLite vs Kit](https://www.emailtooltester.com/en/blog/mailerlite-vs-convertkit/)
- [GroupMail - Mailchimp Free Plan Changes 2026](https://blog.groupmail.io/mailchimp-free-plan-changes-2026/)
- [GroupMail - Mailchimp Alternatives 2026](https://blog.groupmail.io/mailchimp-free-plan-alternatives-2026/)

### Codebase (HIGH confidence)
- `src/components/Footer.astro` - Existing newsletter form (lines 34-41)
</sources>

<metadata>
## Metadata

**Research scope:**
- Core technology: Email service provider selection
- Ecosystem: Astro static site integration patterns
- Patterns: HTML form embed, JavaScript embed
- Pitfalls: Form submission UX, compliance, verification

**Confidence breakdown:**
- ESP recommendation: HIGH - multiple authoritative sources agree
- MailerLite ease of use: HIGH - consistent user feedback
- Integration pattern: HIGH - official MailerLite documentation
- Code examples: MEDIUM - adapted from docs, not tested

**Research date:** 2026-03-13
**Valid until:** 2026-06-13 (90 days - ESP landscape relatively stable)
</metadata>

---

*Phase: 06-mailing-list*
*Research completed: 2026-03-13*
*Ready for planning: yes*
