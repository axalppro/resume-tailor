// =============================================================================
// base-resume.typ — parameterized Typst template
// -----------------------------------------------------------------------------
// The compiler microservice writes `resume-data.json` next to this file before
// running `typst compile`. The template loads it via `json(...)`. The resulting
// design closely matches `master-resume-3.typ` but is fully self-contained and
// imports modular partials from `./partials/`.
// =============================================================================

#import "@preview/neat-cv:1.0.0": cv, entry, item-with-level, cv-with-side, contact-info

#import "./partials/helpers.typ": get-by-id, year-range, keyword-line, compact-entry
#import "./partials/sections.typ": render-skills, render-experience-with-bullets, render-section, render-capabilities, render-languages, render-additional-experience

#let payload = json("./resume-data.json")
#let master   = payload.master
#let selected = payload.selected

#let basics = master.basics

#show: cv.with(
  author: (
    firstname: basics.first_name,
    lastname: basics.last_name,
    email: basics.email,
    phone: basics.phone,
    position: selected.headline,
    website: basics.website,
    linkedin: basics.linkedin,
  ),
  accent-color: rgb("#2642a4"),
  header-color: rgb("#264274"),
  footer: ""
)

#let selected-profile() = {
  // Approved tailored summary takes precedence over the picked variant id.
  if "approvedSummary" in selected and selected.approvedSummary != "" {
    selected.approvedSummary
  } else if "profile" in selected {
    let profile = get-by-id(master.profile_variants, selected.profile)
    if profile != none { profile.text } else { "" }
  } else {
    ""
  }
}

// -----------------------------------------------------------------------------
// Skills section — Phase 3.6: every approved capability is the new
// `{ id, title, details }` shape (legacy `text` field removed by the clean
// break). Empty `approvedCapabilities` falls back to picking from the
// master capability_pool by id so the rest of the document still renders.
// -----------------------------------------------------------------------------
#let approved-capabilities() = {
  if "approvedCapabilities" in selected and selected.approvedCapabilities.len() > 0 {
    render-skills(selected.approvedCapabilities)
  } else {
    render-capabilities(master, selected.capabilities)
  }
}

#cv-with-side[
= Profile
#selected-profile()

#render-languages(master, selected.languages)

= Contact
#contact-info()
][
#approved-capabilities()

#render-experience-with-bullets(master, selected, "Professional Experience")

#render-section("Education", master.education, selected.education, org-key: "institution")

#render-section("Projects", master.projects, selected.projects, org-key: "subtitle")

#render-additional-experience(master, selected.additional_experience)
]
