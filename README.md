# Bearings

Your notegraph is traversed through links.

Metadata is tracked by frontmatter properties.

Bearings allows you to flow through the logical hallways, highways, and byways of your notegraph's semantic architectures constructed by combining these two mechanisms.

Bearings provides multiplexed dynamically-scoped tree views of the logical hallways, highways, and byways of the architectures of your knowledgebase with semantic relationships defined by frontmatter metadata. Multiple hierarchies and non-hiearchies are supported simultaneously and concurrently.

![image](https://github.com/jeetsukumaran/obsidian-bearings/assets/26183/727692a1-f3d8-416d-9fb6-e27405d52e59)


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

Relationships can be either superordinate (e.g., superordinate/subordinates, parent/child, classifier/classified) or flat (e.g. coordinate, related, adjacent, see-also).

Relationships are defined by specifying a link to another note in a given note's frontmatter properties.

```
entry-parents:
  - "[[parent1]]"
entry-classifiers:
  - "[[classifier/note1]]"
  - "[[classifier/note2]]"
```

Semantics are applied through defined relationship terms (e.g., "entry-parents", or "entry-children"), with multiple relationships or hierarchies supported (e.g., "entry-classifiers"/"entry-classifieds").

Views can present multiple classes of relationships together in a comprehensive tree view (all superordinate relationships).

Iconography provides information as to the type and direction of the relationship.

Nodes are independently expandable or collapsible.

Hovering over links opens up the Hover Editor (if installed).

## Relationships

### Default relationships


| Name            | Type          | Focal note property    | Focal note role   | Linked note role  |
|-----------------|---------------|------------------------|-------------------|-------------------|
| Parent          | superordinate | `entry-parents`        | "child"           | "parent"          |
| Child           | superordinate | `entry-children`       | "parent"          | "child"           |
| Classifier      | superordinate | `entry-classifiers`    | "classified"      | "classifier"      |
| Classified      | superordinate | `entry-classifieds`    | "classifier"      | "classified"      |
| Holding         | superordinate | `entry-collections`    | "holding"         | "collection"      |
| Collection      | superordinate | `entry-holdings`       | "collection"      | "holding"         |
| Source          | superordinate | `source-authors`       | "source"          | "author"          |
| Author          | superordinate | `source-sources`       | "author"          | "source"          |
| Production      | superordinate | `entry-collaborators`  | "production"      | "collaborator"    |
| Production      | superordinate | `entry-collaborations` | "collaborator"    | "production"      |
| Bibliographical | coordinate    | `entry-bibliography`   | "reference"       | "bibliographical" |
| Bibliographical | coordinate    | `entry-references`     | "bibliographical" | "reference"       |
| Association     | coordinate    | `entry-associations`   | "associated"      | "associated"      |
| Referral        | coordinate    | `entry-referral`       | "cross-reference" | "cross-reference" |


### Custom relationships

You may add, delete, override the default relationships in the settings.

If you define your own scheme, make sure your relationship has at least the "superordinate" or the "coordinate" keyword in the category field, so that it gets picked up by the pre-defined "views" listed below. Future plans include custom views, which will include support for custom category filters, but for now a relationships needs to be associated with one of these two categories.


## Views

Views are tree-lists of nodes of the subgraphs induced on your notegraph by considering the union of a set of relationships. For example, all hierarchical relationships are grouped together into the "Positions" view. Currently, this plugin

### "Positions"

All superordinate relationships of the current note, with superordinate relationships tracked as a chain of superordinates to their roots, and all subordinate relationships expanded into full subtrees (tracked to their leaves or until the specifed depth).


### "Parallels"

Full subtree expansions of all *immediate* superordinates (e.g., all children of all parents of the current note) expanded into full subtrees (tracked to their leaves or until the specifed depth).


