import {
    App,
    Modal,
    SuggestModal,
    FuzzySuggestModal,
    Notice,
    TFile,
    normalizePath,
} from 'obsidian';

import {
    RelationshipDefinition,
    BearingsConfiguration,
} from "./settings";

interface FrontMatterUpdateOptions {
    app: App;
    path: string;
    propertyNames: string[];
    updateCallbackFn: () => Promise<void>;
}

interface PropertyField {
    propertyName: string;
    textArea: HTMLTextAreaElement;
    restoreButton: HTMLButtonElement;
}

export const PLUGIN_NAME = "Bearings";

export async function updateFrontmatterStrings(
    app: App,
    file: TFile,
    newFrontMatter: Record<string, string>
) {
    await app.fileManager.processFrontMatter(file, (frontmatter: { [key: string]: any }) => {
        // Update each key in the new front matter data
        for (const key in newFrontMatter) {
            frontmatter[key] = newFrontMatter[key];
        }
        new Notice('Front matter updated.');
    }).catch((error) => {
        new Notice(`Failed to update front matter: ${error.message}`);
    });
}

export async function appendFrontmatterLists(
    app: App,
    file: TFile,
    propertyName: string,
    newItemValue: string,
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
        newValue.push(newItemValue)
        frontmatter[propertyName] = [ ... new Set<string>(newValue) ]
        new Notice('Front matter updated.');
    }).catch((error) => {
        new Notice(`Failed to update front matter: ${error.message}`);
    });
}

export interface RelationshipLinkChoice {
    designatedRelationshipName: string;
    propertyName: string;
    displayText: string;
}

export class CreateRelationshipModal extends FuzzySuggestModal<RelationshipLinkChoice> {

    public focalFilePath: string;
    public linkPath: string;
    public configuration: BearingsConfiguration;
    public updateCallbackFn: () => Promise<void>;

    constructor(
        app: App,
        configuration: BearingsConfiguration,
        focalFilePath: string,
        linkPath: string,
        updateCallbackFn: () => Promise<void>,
    ) {
        super(app);
        this.focalFilePath = focalFilePath;
        this.linkPath = linkPath;
        this.configuration = configuration;
        this.updateCallbackFn = updateCallbackFn;
    }

    // async open() {
    //     super.open();
    // }

    outlinkedRelationshipChoices(): RelationshipLinkChoice[] {
        let result: RelationshipLinkChoice[] = []
        Object.keys(this.configuration.relationshipDefinitions).forEach( (key: string) => {
            const relDef: RelationshipDefinition = this.configuration.relationshipDefinitions[key];
            if (relDef.designatedPropertyName) {
                let propertyName: string = relDef.designatedPropertyName;
                let relName: string = key;
                let description1: string;
                if (relName) {
                    description1 = ` (designate as: '${relName}')`
                } else {
                    description1 = ``
                }
                let displayText: string = `${propertyName}${description1}`
                result.push({
                    "designatedRelationshipName": relName,
                    "propertyName": propertyName,
                    "displayText": displayText,
                })
            }
            if (relDef.invertedRelationshipPropertyName) {
                let propertyName: string = relDef.invertedRelationshipPropertyName;
                let relName: string = relDef.invertedRelationshipLabel || "";
                let description1: string;
                if (relName) {
                    description1 = ` (designate as: '${relName}')`
                } else {
                    description1 = ``
                }
                let displayText: string = `${propertyName}${description1}`
                result.push({
                    "designatedRelationshipName": relName,
                    "propertyName": propertyName,
                    "displayText": displayText,
                })
            }
        });
        return result;
    }

    getItems(): RelationshipLinkChoice[] {
        return this.outlinkedRelationshipChoices();
    }

    getItemText(relItem: RelationshipLinkChoice): string {
        return relItem.displayText;
    }

    async onChooseItem(relItem: RelationshipLinkChoice, evt: MouseEvent | KeyboardEvent) {
        // new Notice(`Selected ${relItem.propertyName}`);
        const normalizedPath = normalizePath(this.focalFilePath);
        const file = app.vault.getAbstractFileByPath(normalizedPath);
        if (file instanceof TFile) {
            await appendFrontmatterLists(
                app,
                file,
                relItem.propertyName,
                `[[${this.linkPath}]]`,
            );
            await this.updateCallbackFn(); // Callback to refresh views or data
        } else {
            new Notice("File not found or the path is not a valid file.");
        }
    }

}

export class UpdateDisplayTitleModal extends Modal {
    private file: TFile;
    private propertyFields: PropertyField[] = [];
    public updateCallbackFn: () => Promise<void>;

    constructor(options: FrontMatterUpdateOptions) {
        super(options.app);
        this.file = this.app.vault.getAbstractFileByPath(options.path) as TFile;
        if (!this.file) {
            new Notice('File not found.');
            this.close();
            return;
        }
        this.updateCallbackFn = options.updateCallbackFn;
        this.loadProperties(options.propertyNames);
    }

    async loadProperties(propertyNames: string[]) {
        const fileContents = await this.app.vault.read(this.file);
        const frontMatter = this.app.metadataCache.getFileCache(this.file)?.frontmatter;

        this.contentEl.createEl('h3', { text: "Bearings display title fields", cls: 'bearings-modal-data-entry-heading-title' });
        this.contentEl.createEl('hr');
        this.contentEl.createEl('div', { text: this.file.path, cls: 'bearings-modal-data-entry-fileinfo' } );
        this.contentEl.createEl('hr');
        propertyNames.forEach(propertyName => {
            const modalContainer = this.contentEl.createDiv({ cls: 'bearings-modal-data-entry-outer-container' });
            modalContainer.createEl('label', { text: propertyName, cls: 'bearings-modal-data-entry-label' });

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
                textArea.value = frontMatter?.[propertyName] ?? '';
            };

            this.propertyFields.push({ propertyName, textArea, restoreButton });
        });

        this.addFooterButtons();
    }

    addFooterButtons() {
        const footer = this.contentEl.createDiv({ cls: 'bearings-modal-footer' });
        this.addCancelButton(footer);
        const restoreAllButton = this.addFooterButton('Restore All', 'bearings-modal-footer-button', footer);
        restoreAllButton.onclick = () => {
            this.propertyFields.forEach(field => {
                field.textArea.value = field.textArea.dataset.initialValue || '';
            });
        };

        const saveAllButton = this.addFooterButton('Save All', 'bearings-modal-footer-button', footer);
        saveAllButton.onclick = async () => {
            const newFrontMatter = this.propertyFields.reduce((acc, field) => ({
                ...acc,
                [field.propertyName]: field.textArea.value
            }), {});

            await this.updateFile(newFrontMatter);
            await this.updateCallbackFn();
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

