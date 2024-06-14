import {
    App,
    PaneType,
    Menu,
    MenuItem,
    Notice,
    normalizePath,
    TFile,
} from "obsidian";

import {
    getDisplayTitle,
    getFrontMatter,
} from "./dataservice";

import {
    BearingsConfiguration,
} from "./settings";

import {
    UpdateDisplayTitleModal,
    CreateRelationshipModal,
    appendFrontmatterLists,
    CreateFileModal,
} from "./dataupdate"

export function buildLinkTargetEditMenu(
    app: App,
    configuration: BearingsConfiguration,
    menu: Menu,
    linkPath: string,
    updateCallbackFn: () => Promise<void>,
    includePreSeparator = true,
) {
    if (includePreSeparator) {
        menu.addSeparator();
    }
    menu.addItem((item) =>
        item
            .setTitle("Edit display title fields")
            .setIcon("edit")
            .onClick(() => {
                const normalizedPath = normalizePath(linkPath);
                const file = app.vault.getAbstractFileByPath(normalizedPath);
                if (file instanceof TFile) {
                    const modal = new UpdateDisplayTitleModal(
                        app,
                        configuration,
                        file,
                        updateCallbackFn,
                    );
                    modal.open();
                } else {
                    new Notice("File not found or the path is not a valid file.");
                }
            })
    );

    let activeFilePath: string = app.workspace.getActiveFile()?.path || "";
    menu.addItem((item) =>
                    item
                    .setTitle(`Add relationship link to ...`)
                    // .setIcon("git-branch-plus")
                    // .setIcon("git-fork")
                    .setIcon("git-pull-request")
                    .onClick( () => {
                        const modal = new CreateRelationshipModal(
                            app,
                            configuration,
                            activeFilePath,
                            // activeFilePath === linkPath ? "" : linkPath,
                            linkPath,
                            updateCallbackFn,
                        );
                        modal.open();
                    }));
    menu.addItem((item) =>
                    item
                    .setTitle(`Add relationship link from ...`)
                    // .setIcon("git-branch-plus")
                    .setIcon("git-pull-request-arrow")
                    // .setIcon("git-fork")
                    .onClick( () => {
                        const modal = new CreateRelationshipModal(
                            app,
                            configuration,
                            linkPath,
                            activeFilePath,
                            updateCallbackFn,
                        );
                        modal.open();
                    }));

    // menu.addItem((item) =>
    //                 item
    //                 .setTitle(`Create new file with relationship to ...`)
    //                 .setIcon("git-pull-request-create")
    //                 // .setIcon("file-input")
    //                 .onClick( () => {
    //                     let initialPath = linkPath ? `${linkPath.replace(/.md$/,"")}_related` : "NewRelationFile";
    //                     const modal = new CreateFileModal(
    //                         app,
    //                         configuration,
    //                         (newPath: string) => {
    //                             if (newPath) {
    //                                 const modal = new CreateRelationshipModal(
    //                                     app,
    //                                     configuration,
    //                                     newPath,
    //                                     linkPath,
    //                                     async () => {
    //                                         const modal = new UpdateDisplayTitleModal(
    //                                             app,
    //                                             configuration,
    //                                             newPath,
    //                                             async () => {
    //                                                 updateCallbackFn()
    //                                             }
    //                                         );
    //                                     modal.open();
    //                                     },
    //                                 );
    //                                 modal.open();
    //                             }
    //                         },
    //                         initialPath);
    //                     modal.open();
    //                 }));
    menu.addItem((item) =>
                    item
                    .setTitle(`Create new file with relationship to ...`)
                    .setIcon("git-pull-request-create")
                    // .setIcon("file-input")
                    .onClick( () => {
                        let initialPath = linkPath ? `${linkPath.replace(/.md$/,"")}_related` : "NewRelationFile";
                        const modal = new CreateFileModal(
                            app,
                            configuration,
                            (newPath: string) => {
                                if (newPath) {
                                    const titleModal = new UpdateDisplayTitleModal(
                                        app,
                                        configuration,
                                        newPath,
                                        async () => {
                                            const relModal = new CreateRelationshipModal(
                                                app,
                                                configuration,
                                                newPath,
                                                linkPath,
                                                async () => {
                                                    updateCallbackFn()
                                                }
                                            );
                                        relModal.open();
                                        },
                                    );
                                    titleModal.open();
                                }
                            },
                            initialPath);
                        modal.open();
                    }));
    menu.addItem((item) =>
                    item
                    .setTitle(`Create new file with relationship from ...`)
                    .setIcon("git-pull-request-create-arrow")
                    // .setIcon("file-output")
                    .onClick( () => {
                        let initialPath = linkPath ? `${linkPath.replace(/.md$/,"")}_related` : "NewRelationFile";
                        const modal = new CreateFileModal(
                            app,
                            configuration,
                            (newPath: string) => {
                                if (newPath) {
                                    const titleModal = new UpdateDisplayTitleModal(
                                        app,
                                        configuration,
                                        newPath,
                                        async () => {
                                            const relModal = new CreateRelationshipModal(
                                                app,
                                                configuration,
                                                linkPath,
                                                newPath,
                                                async () => {
                                                    updateCallbackFn()
                                                }
                                            );
                                        relModal.open();
                                        },
                                    );
                                    titleModal.open();
                                }
                            },
                            initialPath);
                        modal.open();
                    }));
}

export function buildLinkOpenMenu(
    menu: Menu,
    app: App,
    linkPath: string,
    includePreSeparator = true,
) {
    // menu.addItem((item) => {
    //     const submenu = (item as any)
    //     .setTitle("Open ...")
    //     // .setIcon("git-pull-request-create")
    //     .setIcon("scroll")
    //     // .setIcon("file-input")
    //     .setSubmenu();
    //     buildLinkOpenSubmenu(submenu, app, linkPath);
    // });
    if (includePreSeparator) {
        menu.addSeparator();
    }
    buildLinkOpenSubmenu(menu, app, linkPath);
}


export function buildLinkOpenSubmenu(
    menu: Menu,
    app: App,
    linkPath: string,
) {
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

    if (includePreSeparator) {
        menu.addSeparator();
    }

    // menu.addItem((item) => {
    //     const submenu = (item as any)
    //         .setTitle("Clipboard ...")
    //         // .setIcon("git-pull-request-create")
    //         .setIcon("clipboard-copy")
    //         .setSubmenu();
    //     buildLinkCopySubmenu(
    //         submenu,
    //         linkPath,
    //     );
    // });

    buildLinkCopySubmenu(menu, linkPath);

    if (includePostSeparator) {
        menu.addSeparator();
    }

}

export function buildLinkCopySubmenu(
    menu: Menu,
    linkPath: string,
) {
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

    const normalizedLinkPath = normalizePath(linkPath);
    const internalPath = normalizedLinkPath.replace(/.md$/, "");

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
}


