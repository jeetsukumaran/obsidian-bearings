# Bearings

Your notegraph is traversed through links.

Metadata is tracked by frontmatter properties.

Bearings allows you to flow through the logical hallways, highways, and byways of your notegraph's semantic architectures constructed by combining these two mechanisms.

Bearings provides multiplexed dynamically-scoped tree views of the logical hallways, highways, and byways of the architectures of your knowledgebase with semantic relationships defined by frontmatter metadata.

Wander through cathedrals (if you are an "architect") or bazaars (if you are a "gardner"), or the gardens of your cathedrals or the cathedrals of your gardens if you are someone in between at least part of the time.

Multiple hierarchies and non-hiearchies are supported simultaneously and concurrently.

## Installation

### Pre-requisites

[Dataview](https://blacksmithgu.github.io/obsidian-dataview/) is required to be installed, from the [Obsidian Community Plugin Store](https://obsidian.md/plugins?id=dataview) website or internally in the Obsidian application.

### Install via Community Plugin Store

This plugin is available via the [Obsidian Community Plugin Store](https://obsidian.md/plugins?id=bearings), through the previous link or from the application.

### Install via BRAT

To test Beta builds of this plugin follow these steps:

- Install the BRAT plugin via Community Plugin Search
- [Read the docs](https://tfthacker.com/BRAT)
- Add `https://github.com/jeetsukumaran/obsidian-bearings`

### Manually installing the plugin

- Copy over `main.js`, `manifest.json` to your vault `${VAULT}/.obsidian/plugins/obsidian-bearings/` from [https://github.com/jeetsukumaran/obsidian-bearings/releases](https://github.com/jeetsukumaran/obsidian-bearings).

## Overview

Navigate your notegraph through tree-based views of links listed in frontmatter properties that define semantic and logical relationships between notes.

Relationships can be either hierarchical (e.g., superordinate/subordinates, parent/child, classifier/classified) or flat (e.g. coordinate, related, adjacent, see-also).

Relationships are defined by specifying a link to another note in a given note's frontmatter properties.

Semantics are applied through defined relationship terms (e.g., "entry-parents", or "entry-children"), with multiple relationships or hierarchies supported (e.g., "entry-classifiers"/"entry-classifieds").

Views can present multiple classes of relationships together in a comprehensive tree view (all hierarchical relationships).

Iconography provides information as to the type and direction of the relationship.

Nodes are independently expandable or collapsible.

Hovering over links opens up the Hover Editor (if installed).

## Relationships

### Predefined relationhips

#### Hierarchical relationships (defined in terms of superordinate-major convention)



| Name            | Type         | Focal note role   | Linked note role  | Focal note property    |
|-----------------|--------------|-------------------|-------------------|------------------------|
| Parent          | hierarchical | "child"           | "parent"          | `entry-parents`        |
|                 |              | "parent"          | "child"           | `entry-children`       |
| Classifier      | hierarchical | "classified"      | "classifier"      | `entry-classifiers`    |
|                 |              | "classifier"      | "classified"      | `entry-children`       |
| Holding         | hierarchical | "holding"         | "collection"      | `entry-collections`    |
|                 |              | "collection"      | "holding"         | `entry-holdings`       |
| Source          | hierarchical | "source"          | "author"          | `source-authors`       |
|                 |              | "author"          | "source"          | `source-references`    |
| Production      | hierarchical | ""                | ""                | `entry-collaborators`  |
|                 |              | ""                | ""                | `entry-collaborations` |
| Bibliographical | coordinate   | "Document"        | "Reference"       | `entry-bibliography`   |
| Bibliographical | coordinate   | "Document"        | "Reference"       | `entry-references`     |
| Association     | coordinate   | "associated"      | "associated"      | `entry-associations`   |
| Referral        | coordinate   | "cross-reference" | "cross-reference" | `entry-referral`       |


## Views

### "Positions"

All hierarchical relationships of the current note, with superordinate relationships tracked as a chain of superordinates to their roots, and all subordinate relationships expanded into full subtrees (tracked to their leaves or until the specifed depth).


### "Parallels"

Full subtree expansions of all *immediate* superordinates (e.g., all children of all parents of the current note) expanded into full subtrees (tracked to their leaves or until the specifed depth).


