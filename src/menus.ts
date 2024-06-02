import {
    App,
    PaneType,
    Menu,
    Notice,
    normalizePath,
    TFile,
} from "obsidian";

import {
    TitleUpdateModal,
} from "./dataupdate"

export function buildLinkTargetEditMenu(
    menu: Menu,
    app: App,
    linkPath: string,
    propertyFields: string[],
    includePreSeparator = true,
    updateCallbackFn: () => Promise<void>,
) {
    if (includePreSeparator) {
        menu.addSeparator();
    }
    menu.addItem((item) =>
        item
            .setTitle("Edit title display fields")
            .setIcon("edit")
            .onClick(() => {
                const normalizedPath = normalizePath(linkPath);
                const file = app.vault.getAbstractFileByPath(normalizedPath);
                if (file instanceof TFile) {
                    const modal = new TitleUpdateModal({
                        app: app,
                        path: normalizedPath,
                        propertyNames: propertyFields,
                        updateCallbackFn: updateCallbackFn,
                    });
                    modal.open();
                } else {
                    new Notice("File not found or the path is not a valid file.");
                }
            })
    );
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
            .setTitle("Clear clipboard")
        // .setIcon("copy-x")
        // .setIcon("brackets")
            .setIcon("clipboard-x")
            .onClick(_clearClipboard)
    );

    menu.addItem((item) =>
        item
            .setTitle("Copy relative path")
            .setIcon("documents")
            .onClick(() => _appendToClipboard(internalPath))
    );

    if (includePostSeparator) {
        menu.addSeparator();
    }

}



