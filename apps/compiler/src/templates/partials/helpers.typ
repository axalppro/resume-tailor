// Helpers shared by the base template and section partials.

#import "@preview/neat-cv:1.0.0": entry

#let get-by-id(items, id) = {
  for item in items {
    if item.id == id {
      return item
    }
  }
  none
}

#let year-range(item) = {
  let start = str(item.start_year)
  let end = if "end_year" in item { item.end_year } else { "" }

  if end == "" or end == none {
    start
  } else if str(end) == start {
    start
  } else {
    start + " – " + str(end)
  }
}

#let keyword-line(keywords) = {
  if keywords.len() > 0 {
    emph(keywords.join(" · "))
  }
}

#let compact-entry(item, org-key: "org") = {
  let org = if org-key in item { item.at(org-key) } else if "institution" in item { item.institution } else if "subtitle" in item { item.subtitle } else { "" }
  let loc = if "location" in item and item.location != "" { item.location } else { "" }
  let body = if "keywords" in item and item.keywords.len() > 0 {
    [#keyword-line(item.keywords)]
  } else {
    []
  }

  entry(
    title: item.title,
    date: year-range(item),
    institution: org,
    location: loc,
  )[
    #body
  ]
}
