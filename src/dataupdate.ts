import {
    App,
    Modal,
    ButtonComponent,
    SuggestModal,
    FrontMatterCache,
    FuzzySuggestModal,
    Notice,
    TFile,
    normalizePath,
    TextComponent,
    // TextAreaComponent,
} from 'obsidian';

import {
    DEFAULT_TITLE_PREFIX_FIELD,
    RelationshipDefinition,
    BearingsConfiguration,
} from "./settings";

import {
    getDisplayTitle,
} from "./dataservice";

import {
    SelectFileModal,
} from "./SelectFile";

import {
    CreateFileModal,
} from "./CreateFile";


interface FrontMatterUpdateOptions {
    app: App;
    path: string;
    propertyNames: string[];
    updateCallbackFn: (file: TFile) => Promise<void>;
}

interface PropertyField {
    propertyName: string;
    textArea: HTMLTextAreaElement;
    restoreButton: HTMLButtonElement;
}

export async function copyYamlFrontmatterProperties(
    app: App,
    sourcePath: string,
    destinationPath: string,
    includedListFields: string[],
    includedStringFields: string[],
): Promise<void> {
    const sourceFile = app.vault.getAbstractFileByPath(sourcePath) as TFile;
    const destinationFile = app.vault.getAbstractFileByPath(destinationPath) as TFile;

    if (sourceFile && destinationFile) {
        try {
            let copiedFrontmatterLists: { [key: string]: any } = {};
            let copiedFrontmatterStringValues: { [key: string]: any } = {};
            await app.fileManager.processFrontMatter(sourceFile, (sourceFrontmatter: { [key: string]: any }) => {
                // Object.keys(sourceFrontmatter).forEach( (key: string) => {
                //     let value = sourceFrontmatter[key];
                // });
                for (let key of includedListFields) {
                    if (sourceFrontmatter[key]) {
                        copiedFrontmatterLists[key] = sourceFrontmatter[key];
                    }
                }
                for (let key of includedStringFields) {
                    if (sourceFrontmatter[key]) {
                        copiedFrontmatterStringValues[key] = sourceFrontmatter[key];
                    }
                }
            });
            Object.keys(copiedFrontmatterLists).forEach( async (key: string) => {
                await appendFrontmatterLists(this.app, destinationFile, key, copiedFrontmatterLists[key], false);
            });
            await updateFrontmatterStrings(
                this.app,
                destinationFile,
                copiedFrontmatterStringValues,
                false,
            );
            // Object.keys(copiedFrontmatterStringValues).forEach( async (key: string) => {
            // });
            new Notice('Front matter updated.');
        } catch (error) {
            new Notice(`Failed to read front matter: ${error.message}`);
        }
    }
}

export async function updateFrontmatterStrings(
    app: App,
    file: TFile,
    newFrontMatter: Record<string, string>,
    isAddUpdateNotice: boolean = true,
) {
    await app.fileManager.processFrontMatter(file, (frontmatter: { [key: string]: any }) => {
        // Update each key in the new front matter data
        for (const key in newFrontMatter) {
            frontmatter[key] = newFrontMatter[key];
        }
        if (isAddUpdateNotice) {
            new Notice('Front matter updated.');
        }
    }).catch((error) => {
        new Notice(`Failed to update front matter: ${error.message}`);
    });
}

export async function appendFrontmatterLists(
    app: App,
    file: TFile,
    propertyName: string,
    newItemValue: string,
    isAddUpdateNotice: boolean = true,
) {
    await app.fileManager.processFrontMatter(file, (frontmatter: { [key: string]: any }) => {
        // Update each key in the new front matter data
        let currentValue = frontmatter[propertyName];
        let newValue = [];
        if (!currentValue) {
        } else if (!Array.isArray(currentValue)) {
            newValue.push(currentValue);
        } else {
            newValue.push(... currentValue);
        }
        if (!Array.isArray(newItemValue)) {
            newValue.push(newItemValue);
        } else {
            newValue.push(... newItemValue);
        }
        frontmatter[propertyName] = [ ... new Set<string>(newValue) ]
        if (isAddUpdateNotice) {
            new Notice('Front matter updated.');
        }
    }).catch((error) => {
        new Notice(`Failed to update front matter: ${error.message}`);
    });
}

export class UpdateDisplayTitleModal extends Modal {
    private file: TFile;
    private propertyFields: PropertyField[] = [];
    public updateCallbackFn: (file: TFile) => Promise<void>;

    constructor(
        app: App,
        configuration: BearingsConfiguration,
        file: TFile | string,
        updateCallbackFn: (file: TFile) => Promise<void>,
    ) {
        super(app);
        const afile: TFile | null = (typeof file === "string") ? app.vault.getFileByPath(file) : file;
        if (afile === null) {
            new Notice('File not found.');
            this.close();
            return;
        }
        this.file = afile;
        this.updateCallbackFn = updateCallbackFn;
        this.loadProperties(
            [
                (configuration.options?.titlePrefix || DEFAULT_TITLE_PREFIX_FIELD),
                ... configuration.titleFields,
            ]
        );
    }

    async loadProperties(propertyNames: string[]) {
        const fileContents = await this.app.vault.read(this.file);
        const _getFrontMatter = (): FrontMatterCache  => {
            // let rval: FrontMatterCache | undefined = this.app.metadataCache?.getFileCache(this.file)?.frontmatter?.then( () => {} )
            //     .catch( () => {} )
            // return rval || {};
            return this.app.metadataCache?.getFileCache(this.file)?.frontmatter || {};
        };
        let frontMatter: FrontMatterCache = _getFrontMatter();

        this.contentEl.createEl('h3', { text: "Edit display title fields", cls: 'bearings-modal-data-entry-heading-title' });
        this.contentEl.createEl('div', {text: "Focal file (will be updated)", cls: 'bearings-modal-data-entry-item-label'});
        this.contentEl.createEl('div', { text: this.file.path, cls: 'bearings-modal-data-entry-fileinfo' } );
        propertyNames.forEach(propertyName => {
            const modalContainer = this.contentEl.createDiv({ cls: 'bearings-modal-data-entry-outer-container' });
            modalContainer.createEl('label', { text: `Property: '${propertyName}'`, cls: 'bearings-modal-data-entry-item-label' });
            const fieldEntryContainer = modalContainer.createDiv({ cls: 'bearings-modal-data-entry-item-container' });
            const valueBox = fieldEntryContainer.createDiv({ cls: 'bearings-modal-data-entry-value-box' });
            const textArea = valueBox.createEl('textarea', {
                cls: 'bearings-modal-data-entry-text-area',
                text: frontMatter?.[propertyName] ?? '',
            });

            const controlsContainer = fieldEntryContainer.createDiv({ cls: 'bearings-modal-data-entry-item-controls-container' });
            const restoreButton = controlsContainer.createEl('button', {
                cls: 'bearings-modal-data-entry-controls-button',
                text: '↺',
            });

            restoreButton.onclick = () => {
                let frontMatter = _getFrontMatter();
                textArea.value = frontMatter?.[propertyName] ?? '';
            };

            this.propertyFields.push({ propertyName, textArea, restoreButton });
        });

        this.addFooterButtons();
    }

    addFooterButtons() {
        const footer = this.contentEl.createDiv({ cls: 'bearings-modal-footer' });
        this.addCancelButton(footer);
        const restoreAllButton = this.addFooterButton('Restore', 'bearings-modal-footer-button', footer);
        restoreAllButton.onclick = () => {
            this.propertyFields.forEach(field => {
                field.textArea.value = field.textArea.dataset.initialValue || '';
            });
        };

        const saveAllButton = this.addFooterButton('Save', 'bearings-modal-footer-button', footer);
        saveAllButton.onclick = async () => {
            const newFrontMatter = this.propertyFields.reduce((acc, field) => ({
                ...acc,
                [field.propertyName]: field.textArea.value
            }), {});

            await this.updateFile(newFrontMatter);
            await this.updateCallbackFn(this.file);
        };
    }

    addCancelButton(footer: HTMLElement) {
        const cancelButton = this.addFooterButton('Cancel', 'bearings-modal-footer-button', footer);
        cancelButton.onclick = () => this.close();
    }

    addFooterButton(text: string, className: string, footer: HTMLElement): HTMLButtonElement {
        const btn = footer.createEl('button', { text, cls: className });
        return btn;
    }

    async updateFile(newFrontMatter: Record<string, string>) {
        updateFrontmatterStrings(this.app, this.file, newFrontMatter);
        this.close();
    }
}

