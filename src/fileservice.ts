import {
    App,
    TAbstractFile,
    TFile,
    TFolder,
    MenuItem,
    normalizePath,
    Notice,
} from "obsidian";

export async function getUniquePath(
    app: App,
    initialPath: string,
    extension = "md"
): Promise<string> {
    let uniquePath = initialPath.replace(new RegExp(`\\.${extension}$`), "");
    let index = 1;
    const fileExists = (path: string): boolean => {
        const file = app.vault.getAbstractFileByPath(`${path}.${extension}`);
        return file != null;
    };
    while (fileExists(uniquePath)) {
        uniquePath = `${initialPath}-${index}`;
        index++;
    }
    return normalizePath(uniquePath);
}

