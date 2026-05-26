// Section renderers — each takes the master pool and an id list from the
// selected resume, then renders only what was picked.

#import "@preview/neat-cv:1.0.0": item-with-level, entry
#import "./helpers.typ": get-by-id, compact-entry, year-range, keyword-line

#let render-section(title, items, ids, org-key: "org") = {
  if ids.len() > 0 [
    = #title
    #for id in ids {
      let item = get-by-id(items, id)
      if item != none {
        compact-entry(item, org-key: org-key)
      }
    }
  ]
}

// =============================================================================
// Phase 3.5: render-skills
// -----------------------------------------------------------------------------
// Renders the AI-tailored Skills section. Each entry has a bold title +
// details line: `- *Electronics design*: Hands-on with schematics, PCB...`.
// =============================================================================
#let render-skills(approved-skills) = {
  if approved-skills.len() > 0 [
    = Skills
    #for s in approved-skills [
      - *#s.title*: #s.details
    ]
  ]
}

#let render-capabilities(master, ids) = {
  if ids.len() > 0 [
    = Skills
    #for id in ids {
      let cap = get-by-id(master.capability_pool, id)
      if cap != none [
        - #cap.text
      ]
    }
  ]
}

#let render-languages(master, ids) = {
  if ids.len() > 0 [
    = Languages
    #for id in ids {
      let lang = get-by-id(master.languages, id)
      if lang != none {
        item-with-level(lang.name, 0, subtitle: lang.level)
      }
    }
  ]
}

#let render-additional-experience(master, ids) = {
  if ids.len() > 0 {
    render-section("Additional Experience", master.additional_experience, ids, org-key: "org")
  }
}

// =============================================================================
// Phase 3.5: render-experience-with-bullets
// -----------------------------------------------------------------------------
// Renders the Professional Experience section using user-approved bullets +
// their per-bullet skill sub-lines. For each experience entry the user kept
// (selected.experience), we look up the approved bullets in
// `selected.approvedBulletRewrites` (grouped by experienceId) and render:
//
//   - <main STAR bullet text>
//     _<keyword · keyword · keyword>_
//
// Bullets where `included == false` are skipped. If no approved bullets exist
// for an entry, we fall back to the entry's `compact-entry` keyword line so
// the old rendering keeps working for pre-3.5 sessions.
// =============================================================================
#let render-experience-with-bullets(master, selected, title) = {
  if "experience" in selected and selected.experience.len() > 0 [
    = #title
    #for id in selected.experience {
      let item = get-by-id(master.experience, id)
      if item != none {
        // Collect approved bullets for THIS experience id.
        let approved-bullets = ()
        if "approvedBulletRewrites" in selected {
          for b in selected.approvedBulletRewrites {
            let included = if "included" in b { b.included } else { true }
            let exp-id = if "experienceId" in b { b.experienceId } else { "" }
            if included and exp-id == item.id {
              approved-bullets.push(b)
            }
          }
        }

        // Header row (title — org — dates — location).
        let org = if "org" in item { item.org } else { "" }
        let loc = if "location" in item and item.location != "" { item.location } else { "" }

        if approved-bullets.len() > 0 {
          // Render with per-bullet body.
          entry(
            title: item.title,
            date: year-range(item),
            institution: org,
            location: loc,
          )[
            #for b in approved-bullets [
              - #b.text
              #if "keywords" in b and b.keywords.len() > 0 [
                #h(1em)#emph(b.keywords.join(" · "))
              ]
            ]
          ]
        } else {
          // No approved bullets for this entry — fall back to the legacy
          // compact-entry rendering (entry-level keyword line).
          compact-entry(item, org-key: "org")
        }
      }
    }
  ]
}
