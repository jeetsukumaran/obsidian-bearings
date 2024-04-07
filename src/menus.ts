import {
    // ItemView,
    App,
    // Editor,
    // TFile,
    // MarkdownView,
    PaneType,
    Menu,
    // Modal,
    Notice,
    // Plugin,
    // PluginSettingTab,
    // Setting,
    // WorkspaceLeaf,
    // setIcon,
    // CachedMetadata,
    normalizePath,
    FileSystemAdapter,
} from "obsidian";

import * as _path from "path"

function getVaultBasePath(): string {
    const adapter = app.vault.adapter;
    if (adapter instanceof FileSystemAdapter) {
        return adapter.getBasePath();
    }
    return "";
}


export function buildLinkOpenMenu(
    menu: Menu,
    app: App,
    linkPath: string,
    includePreSeparator = true,
) {
    if (includePreSeparator) {
        menu.addSeparator();
    }
    menu.addItem((item) =>
        item
            .setTitle("Open in new tab")
            .setIcon("open")
            // .onClick(() => app.workspace.openLinkText(linkPath, "", "tab")
            .onClick(() => app.workspace.openLinkText(
                linkPath,
                linkPath,
                "tab",
                { active: true, }
            )
        )
    );
    menu.addItem((item) =>
        item
            .setTitle("Open in new tab (background)")
            .setIcon("open")
            // .onClick(() => app.workspace.openLinkText(linkPath, "", "tab")
            .onClick(() => app.workspace.openLinkText(
                linkPath,
                linkPath,
                "tab",
                { active: false, }
            )
        )
    );
    menu.addItem((item) =>
        item
            .setTitle("Open in new split")
            .setIcon("open")
            .onClick(() => app.workspace.openLinkText(linkPath, "", "split")
            )
    );
    menu.addItem((item) =>
        item
            .setTitle("Open in new split (background)")
            .setIcon("open")
            // .onClick(() => app.workspace.openLinkText(linkPath, "", "tab")
            .onClick(() => app.workspace.openLinkText(
                linkPath,
                linkPath,
                "split",
                { active: false, }
            )
        )
    );
    menu.addItem((item) =>
        item
            .setTitle("Open in new window")
            .setIcon("open")
            .onClick(() => app.workspace.openLinkText(linkPath, "", "window")
            )
    );
}

async function createUniqueNote(
    app: App,
    directoryPath: string,
    frontmatter: string,
    mode: PaneType | undefined,
): Promise<string> {

    const path = require('path');
    let counter = 0;
    let newNotePath;

    do {
        const fileName = `Untitled${counter ? ` ${counter}` : ''}.md`;
        newNotePath = path.join(directoryPath, fileName);
        counter++;
    } while (await app.vault.adapter.exists(newNotePath));

    try {
        await app.vault.create(newNotePath, frontmatter);
        app.workspace.openLinkText(newNotePath, '', mode);
    } catch (error) {
        console.error('Error creating or opening the new note:', error);
    }
    return newNotePath
}


export function buildLinkCreateMenu(
    menu: Menu,
    app: App,
    linkPath: string,
    getCloneEntryRelationships?: () => Map<string, string[]>,
    includePreSeparator = true,
) {
    const path = require('path');
    const fs = require('fs');

    // Function to create a new note with specific content in the directory
    async function createAndOpenNoteInDirectory(mode: PaneType | undefined) {
        const directoryPath = path.dirname(linkPath);

        // Check if linkPath is a file, then use its parent
        // if (fs.existsSync(linkPath) && !fs.statSync(linkPath).isDirectory()) {
        //     directoryPath = path.dirname(linkPath);
        // }

        // Prevent going beyond the root of the vault
        // const rootPath = app.vault.getRoot().path;
        // if (!directoryPath.startsWith(rootPath)) {
        //     directoryPath = rootPath;
        // }

        // Generate the current date and time in the desired format
        const currentDateTime = new Date()
        const formattedDateTime = currentDateTime.toISOString().replace(/:\d{2}\.\d{3}Z$/, '');

        // Create the YAML frontmatter content
        const frontmatterParts = []
        frontmatterParts.push("---")
        frontmatterParts.push(`entry-date: ${formattedDateTime}`)
        // frontmatterParts.push(`entry-parents:`)
        // frontmatterParts.push(`  - "[[${linkPath}]]"`)
        if (getCloneEntryRelationships) {
            getCloneEntryRelationships().forEach( (subEntries: string[], propertyName: string) => {
                frontmatterParts.push(`${propertyName}:`)
                subEntries.forEach( (subEntryPath) => frontmatterParts.push(`  - "[[${subEntryPath}]]"`) )
            })
        }
        frontmatterParts.push("---")
        const frontmatter = frontmatterParts.join("\n")

        // const newNotePath = path.join(directoryPath, `Untitled.md`);
        // try {
        //     await app.vault.create(newNotePath, frontmatter); // Create a note with the frontmatter
        //     app.workspace.openLinkText(newNotePath, '', mode); // Open the new note
        // } catch (error) {
        //     console.error('Error creating or opening the new note:', error);
        // }
        createUniqueNote(
            app,
            directoryPath,
            frontmatter,
            mode,
        )

    }

    if (includePreSeparator) {
        menu.addSeparator();
    }

    // Add options to create and open a new note
    menu.addItem((item) =>
        item
            .setTitle("Create sibling note")
            .setIcon("document")
            .onClick(() => createAndOpenNoteInDirectory(undefined))
    );

    menu.addItem((item) =>
        item
            .setTitle("Create sibling note in new tab")
            .setIcon("document")
            .onClick(() => createAndOpenNoteInDirectory('tab'))
    );

}




function _copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
        new Notice(`Copied to clipboard: ${text}`);
    }, (err) => {
        console.error('Failed to copy text: ', err);
        new Notice('FAILED to copy text');
    });
}

export function buildLinkCopyMenu(
    menu: Menu,
    linkPath: string,
    includePreSeparator = true,
    includePostSeparator = false,
) {
    const normalizedLinkPath = normalizePath(linkPath);
    const internalPath = normalizedLinkPath.replace(/.md$/, "");
    const absolutePath = _path.join(getVaultBasePath(), normalizedLinkPath);

    const _appendToClipboard = async (value: string) => {
        try {
            const current = await navigator.clipboard.readText();
            await navigator.clipboard.writeText(`${current}\n${value}`);
        } catch (err) {
            console.error('Failed to append to clipboard: ', err);
        }
    };

    const _clearClipboard = async () => {
        await navigator.clipboard.writeText("");
    };

    const _copyToClipboard = async (value: string) => {
        try {
            await navigator.clipboard.writeText(value);
        } catch (err) {
            console.error('Failed to copy to clipboard: ', err);
        }
    };

    if (includePreSeparator) {
        menu.addSeparator();
    }

    menu.addItem((item) =>
        item
            .setTitle("Copy as internal link")
            .setIcon("clipboard-copy")
            .onClick(() => _copyToClipboard(`[[${internalPath}]]`))
    );

    menu.addItem((item) =>
        item
            .setTitle("Copy as quoted internal link")
            .setIcon("clipboard-copy")
            .onClick(() => _copyToClipboard(`"[[${internalPath}]]"`))
    );

    menu.addItem((item) =>
        item
            .setTitle("Copy as property item link")
            .setIcon("clipboard-copy")
            .onClick(() => _copyToClipboard(`  - "[[${internalPath}]]"`))
    );

    // menu.addItem((item) =>
    //     item
    //         .setTitle("Copy as internal link")
    //         .setIcon("documents")
    //         .onClick(() => _appendToClipboard(`[[${internalPath}]]`))
    // );

    // menu.addItem((item) =>
    //     item
    //         .setTitle("Copy as quoted internal link")
    //         .setIcon("documents")
    //         .onClick(() => _appendToClipboard(`"[[${internalPath}]]"`))
    // );

    menu.addItem((item) =>
        item
            .setTitle("Append property item link to clipboard")
            .setIcon("list-end")
            .onClick(() => _appendToClipboard(`  - "[[${internalPath}]]"`))
    );

    if (includePostSeparator) {
        menu.addSeparator();
    }

    menu.addItem((item) =>
        item
            .setTitle("Copy filesystem absolute path")
            .setIcon("documents")
            .onClick(() => _appendToClipboard(absolutePath))
    );

    if (includePostSeparator) {
        menu.addSeparator();
    }

    menu.addItem((item) =>
        item
            .setTitle("Clear clipboard")
        // .setIcon("copy-x")
        // .setIcon("brackets")
            .setIcon("clipboard-x")
            .onClick(_clearClipboard)
    );
}



