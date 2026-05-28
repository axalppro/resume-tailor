// =============================================================================
// brilliant-cv.typ — brilliant-CV adapter
// =============================================================================

#import "@preview/brilliant-cv:4.0.1": (
  cv, cv-section, cv-entry, cv-skill, h-bar,
)
#import "./partials/helpers.typ": year-range

#let payload = json("./resume-data.json")
#let master = payload.master
#let selected = payload.selected
#let basics = master.basics

#let metadata = (
  header_quote: selected.headline,
  cv_footer: "Curriculum vitae",
  letter_footer: "Cover letter",
  layout: (
    awesome_color: "skyblue",
    before_section_skip: "1pt",
    before_entry_skip: "1pt",
    before_entry_description_skip: "1pt",
    paper_size: "a4",
    date_width: "3.6cm",
    fonts: (
      regular_fonts: ("Source Sans 3",),
      header_font: "Roboto",
    ),
    header: (
      header_align: "left",
      display_profile_photo: false,
      profile_photo_radius: "50%",
      info_font_size: "10pt",
    ),
    entry: (
      display_entry_society_first: true,
      display_logo: false,
    ),
    section: (
      title_highlight: "first-letters",
      title_highlight_letters: 3,
    ),
    footer: (
      display_page_counter: false,
      display_footer: true,
    ),
  ),
  inject: (
    injected_keywords_list: (),
  ),
  personal: (
    first_name: basics.first_name,
    last_name: basics.last_name,
    info: (
      email: basics.email,
      phone: basics.phone,
      linkedin: basics.linkedin,
      homepage: basics.website,
      location: basics.location,
    ),
  ),
)

#show: cv.with(metadata)

#let approved-bullet-rewrites = selected.at("approvedBulletRewrites", default: ())
#let approved-capabilities = selected.at("approvedCapabilities", default: ())
#let language-items = master.at("languages", default: ())

#let profile-text = if selected.at("approvedSummary", default: "") != "" {
  selected.approvedSummary
} else {
  let profile = master.profile_variants.find((v) => v.id == selected.profile)
  if profile != none { profile.text } else { "" }
}

#if profile-text != "" [
  #cv-section("Profile")
  #profile-text
]

#if approved-capabilities.len() > 0 [
  #cv-section("Skills")
  #for cap in approved-capabilities [
    #cv-skill(type: [#cap.title], info: [#cap.details])
  ]
]

#let exp-ids = selected.experience
#let experiences = master.experience.filter((e) => exp-ids.contains(e.id))

#if experiences.len() > 0 [
  #cv-section("Professional Experience")
  #for exp in experiences {
    let bullets = approved-bullet-rewrites.filter((b) => b.experienceId == exp.id and b.included)
    cv-entry(
      title: [#exp.title],
      society: [#exp.org],
      date: [#year-range(exp)],
      location: [#exp.location],
      description: if bullets.len() > 0 {
        list(..bullets.map((b) => [#b.text]))
      } else {
        []
      },
    )
  }
]

#let educations = master.education.filter((e) => selected.education.contains(e.id))
#if educations.len() > 0 [
  #cv-section("Education")
  #for edu in educations {
    let description-parts = ()
    if edu.at("thesis", default: "") != "" {
      description-parts.push([*Thesis:* #edu.thesis])
    }
    if edu.at("courses", default: ()).len() > 0 {
      description-parts.push([*Courses:* #edu.courses.join(", ")])
    }
    cv-entry(
      title: [#edu.title],
      society: [#edu.institution],
      date: [#year-range(edu)],
      location: [#edu.location],
      description: if description-parts.len() > 0 {
        list(..description-parts)
      } else {
        []
      },
    )
  }
]

#let projects = master.projects.filter((p) => selected.projects.contains(p.id))
#if projects.len() > 0 [
  #cv-section("Projects")
  #for proj in projects {
    cv-entry(
      title: [#proj.title],
      society: [#proj.subtitle],
      date: [#year-range(proj)],
      location: [],
      description: [],
    )
  }
]

#let languages = language-items.filter((l) => selected.languages.contains(l.id))
#if languages.len() > 0 [
  #cv-section("Languages")
  #cv-skill(
    type: [Languages],
    info: languages.map((l) => l.name + " (" + l.level + ")").join(" #h-bar() "),
  )
]
