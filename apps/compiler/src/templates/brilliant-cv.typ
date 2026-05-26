// =============================================================================
// brilliant-cv.typ — brilliant-CV adapter
// =============================================================================

#import "@preview/brilliant-cv:4.0.1": (
  cv, cv-section, cv-entry, cv-skill, cv-skill-tag, h-bar,
)

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

#let profile-text = if "approvedSummary" in selected and selected.approvedSummary != "" {
  selected.approvedSummary
} else if "profile" in selected {
  let profile = master.profile_variants.find((v) => v.id == selected.profile)
  if profile != none { profile.text } else { "" }
} else {
  ""
}

#if profile-text != "" {
  cv-section("Profile")
  profile-text
}

#let caps = if "approvedCapabilities" in selected and selected.approvedCapabilities.len() > 0 {
  selected.approvedCapabilities
} else {
  []
}

#if caps.len() > 0 {
  cv-section("Skills")
  for cap in caps {
    cv-skill(type: [#cap.title], info: [#cap.details])
  }
}

#let exp-ids = selected.experience
#let experiences = master.experience.filter((e) => exp-ids.contains(e.id))

#if experiences.len() > 0 {
  cv-section("Professional Experience")
  for exp in experiences {
    #let bullets = selected.approvedBulletRewrites.filter((b) => b.experienceId == exp.id and b.included)
    cv-entry(
      title: [#exp.title],
      society: [#exp.org],
      date: [#exp.dates],
      location: [#exp.location],
      description: if bullets.len() > 0 {
        list(..bullets.map((b) => [#b.text]))
      } else {
        []
      },
    )
  }
}

#let educations = master.education.filter((e) => selected.education.contains(e.id))
#if educations.len() > 0 {
  cv-section("Education")
  for edu in educations {
    cv-entry(title: [#edu.degree], society: [#edu.institution], date: [#edu.year], location: [#edu.location], description: [])
  }
}

#let projects = master.projects.filter((p) => selected.projects.contains(p.id))
#if projects.len() > 0 {
  cv-section("Projects")
  for proj in projects {
    cv-entry(title: [#proj.title], society: [#proj.subtitle], date: [#proj.year], location: [], description: [])
  }
}

#let languages = master.languages.filter((l) => selected.languages.contains(l.id))
#if languages.len() > 0 {
  cv-section("Languages")
  cv-skill(type: [Languages], info: languages.map((l) => l.name + " (" + l.level + ")").join(" #h-bar() "))
}
