// Section renderers — each takes the master pool and an id list from the
// selected resume, then renders only what was picked.

#import "@preview/neat-cv:1.0.0": item-with-level
#import "./helpers.typ": get-by-id, compact-entry

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
