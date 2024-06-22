# Bearings

Your notegraph is traversed through links.

Metadata is tracked by frontmatter properties.

Bearings allows you to flow through the logical hallways, highways, and byways of your notegraph's semantic architectures constructed by combining these two mechanisms.

### What it does

Bearings provides dynamically-scoped expanding tree views of relationships between your notes.

The semantics of the relationships are specified by a user-controlled vocabulary of YAML frontmatter property keys or names, while the structure of the relationships given by links listed under those named properties for a particular note.

### Finding your bearings

Initially inspired by categorizing my notes along the lines of the [classification system of the Python Package Index](https://pypi.org/classifiers/), i.e., with multiple concurrent hierarchies such as:

```
Topic :: Scientific/Engineering :: Artificial Life
Topic :: Scientific/Engineering :: Bio-Informatics
Intended Audience :: Science/Research
Development Status :: 4 - Beta
```

the framework now supports multiple two-way hierarchies (link "up" using a superordinate relationship, e.g. "`entry-parents`", or link "down" using a subordinate relationship, e.g. "`entry-children`"), as well as coordinate (non-hierarchical or "rhizomatic") relationships (e.g. "`entry-references`", "`entry-associated`").

The following hypothetical examples shows what might be possible: a note that is supporting two "parent" projects, and itself has child notesm and in addition has various PyPI-like classifiers indicating the notes development status and topics etc.

```
entry-parents:
  - "[[path/to/project1/project01-index]]"
  - "[[path/to/project2/project02-index]]"
entry-children:
  - "[[path/to/project1/child-note-01]]"
  - "[[path/to/project1/child-note-02]]"
entry-classifiers:
  - "[[00-classifiers/development/tasking/01-active]]"
  - "[[00-classifiers/development/status/04-beta]]"
  - "[[00-classifiers/development/phase/04-production-draft]]"
  - "[[00-classifiers/feature/topic/bio-informatics]]"
  - "[[00-classifiers/feature/topic/artificial-life]]"
  - "[[00-classifiers/feature/subject/mathematics/combinatorics/graph-theory]]"
  - "[[00-classifiers/feature/subject/mathematics/probability-theory-and-stochastic-processes/markov-processes]]"
  - "[[00-classifiers/feature/subject/biology/G16.075_biological-evolution]]"
entry-associated:
  - "[[path/to/related/project3]]"
  - "[[path/to/similar/note]]"
entry-references:
  - "[[sources/a/@avocado2024]]"
  - "[[sources/b/@blueberry2021]]"
  - "[[sources/s/@cilantro2019]]"
```

The following shows a "working" note from my own vault (and rather more conservatively indexed than the contrived example above).

![image](https://github.com/jeetsukumaran/obsidian-bearings/assets/26183/727692a1-f3d8-416d-9fb6-e27405d52e59)

> The icononology and colors are currently fixed.
> Future plans include customization.

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

## Basic usage

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

### Relationships

#### Example relationships

(Note: here the naming convention of the relationships reflect the superordinate role. This is just a convention).


| Name         | Category               | Focal note property     | Focal note role  | Linked note role |
|--------------|------------------------|-------------------------|------------------|------------------|
| Parent       | superordinate          | `entry-parents`         | "Parent"         | "Child"          |
|              | (implicit subordinate) | `entry-children`        | "Child"          | "Parent"         |
|              |                        |                         |                  |                  |
| Classifier   | superordinate          | `entry-classifiers`     | "Classifier"     | "Classification" |
|              | (implicit subordinate) | `entry-classifications` | "Classification" | "Classifier"     |
|              |                        |                         |                  |                  |
| Collection   | superordinate          | `entry-collections`     | "Collection"     | "Item"           |
|              | (implicit subordinate) | `entry-items`           | "Item"           | "Collection"     |
|              |                        |                         |                  |                  |
| Author       | superordinate          | `source-authors`        | "Author"         | "Bibliography"   |
|              | (implicit subordinate) | `entry-bibliography`    | "Bibliography"   | "Author"         |
|              |                        |                         |                  |                  |
| Collaborator | superordinate          | `entry-collaborators`   | "Collaborator"   | "Collaboration"  |
|              | (implicit subordinate) | `entry-collaborations`  | "Collaboration"  | "Collaborator"   |
|              |                        |                         |                  |                  |
| Reference    | superordinate          | `entry-bibliography`    | "Reference"      |                  |
|              |                        |                         |                  |                  |
| Next         | superordinate          | `entry-next`            | "Next"           | "Previous"       |
|              | (implicit subordinate) | `entry-previous`        | "Previous"       | "Next"           |
|              |                        |                         |                  |                  |
| Attachment   | superordinate          | `entry-attachments`     |                  | "Attachment"     |
|              |                        |                         |                  |                  |
| Topic        | superordinate          | `entry-topics`          | "Topic"          | "Case"           |
|              | (implicit subordinate) | `entry-cases`           | "Case"           | "Topic"          |
|              |                        |                         |                  |                  |
| Referral     | symmetrical            | `entry-referrals`       | "Referral"       | "Referral"       |



#### Custom relationships

You may add, delete, override the default relationships in the settings.

![image](https://github.com/jeetsukumaran/obsidian-bearings/assets/26183/7877635a-2306-4927-97fa-cd1dfbb49ffa)


> **IMPORTANT**
>
> If you define your own scheme, make sure your relationship has at least one of the "superordinate" or the "coordinate" keyword in the category field, so that it gets picked up by one of the pre-defined "views" listed below.
>
> Future plans include custom views, which will include support for custom category filters, but for now a relationships needs to be associated with one of these two categories.


### Views

Views are dynamically-scoped collapsible hierarchical lists or "trees" of subgraphs rooted at the current note, considering the union of connections under a particular set of relationshions.

For example, the main "Positions" view shows all logically hierarchical relationships (superordinate-subordinate, parent-child, classifier-classifications) regardless of semantics (e.g., a "child" note will look the same as a "classified" note).

Future plans include custom views and dynamically custom views, but, for now, view are predefined.

#### "Positions"

All superordinate relationships of the current note, with superordinate relationships tracked as a chain of superordinates to their roots, and all subordinate relationships expanded into full subtrees (tracked to their leaves or until the specifed depth).


![image](https://github.com/jeetsukumaran/obsidian-bearings/assets/26183/e1989f7a-fe3c-4322-b811-f4cf24d305cc)


#### "Parallels"

Full subtree expansions of all *immediate* superordinates (e.g., all children of all parents of the current note) expanded into full subtrees (tracked to their leaves or until the specifed depth).

#### "Crosslinks"

All symmetrical relationships.

#### "Backlinks"

All inlinks/backlinks to this note.

### Code blocks

The navigational views can be embedded into a note using the code block identifier "`bearings`"

~~~
```bearings
```
~~~

![image](https://github.com/jeetsukumaran/obsidian-bearings/assets/26183/ea16e33c-a716-4093-b5cf-eb488e655f5e)


### Decorations

#### Title prefix

Title prefixes, by default picked up from the ``title-prefix`` property field of each note allow you to augment the display of the nodes by marked up text.
You can use "``/``" or the "`::`" to separate prefix elements.

For example, notes with:

```
---
title-prefix: "Tasking/Capture"
title: "Inbox"
---
```

will display as ![image](https://github.com/jeetsukumaran/obsidian-bearings/assets/26183/e65c08d3-0dc4-4ef4-905b-1aa5ed01b31a) .


You can use this feature to provide more visual cues for navigation or adjusting the sort order by using key prefixes:


![image](https://github.com/jeetsukumaran/obsidian-bearings/assets/26183/c6b97dd7-b060-4d44-90ff-1f3410e20c9e)



## Design considerations

### Mechanisms

- All relationships will be expressed by a single mechanism: Obsidian internal links in the frontmatter YAML.
    - **Justification:** These are supported natively by Obsidian at the time of writing.


