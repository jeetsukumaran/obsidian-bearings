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

async function copyYamlFrontmatterProperties(
    app: App,
    sourcePath: string,
    destinationPath: string,
    includedPropertyNames: string[]
): Promise<void> {
    const sourceFile = app.vault.getAbstractFileByPath(sourcePath) as TFile;
    const destinationFile = app.vault.getAbstractFileByPath(destinationPath) as TFile;

    if (sourceFile && destinationFile) {
        try {
            await app.fileManager.processFrontMatter(sourceFile, (sourceFrontmatter: { [key: string]: any }) => {
                app.fileManager.processFrontMatter(destinationFile, (destinationFrontmatter: { [key: string]: any }) => {
                    for (const key of includedPropertyNames) {
                        if (sourceFrontmatter[key] !== undefined) {
                            destinationFrontmatter[key] = sourceFrontmatter[key];
                        }
                    }
                });
            });
            new Notice('Front matter updated.');
        } catch (error) {
            new Notice(`Failed to update front matter: ${error.message}`);
        }
    }
}
