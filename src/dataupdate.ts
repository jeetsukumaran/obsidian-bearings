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
    index: number;
    designatedRelationshipName: string;
    propertyName: string;
    displayText: string;
}

export class CreateRelationshipModal extends Modal {
    public focalFilePath: string;
    public linkPath: string;
    public configuration: BearingsConfiguration;
    public updateCallbackFn: () => Promise<void>;
    private selectBox: HTMLSelectElement;
    private relationshipChoices: RelationshipLinkChoice[];

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
        this.selectBox = document.createElement('select');
        // this.selectBox.addEventListener('change', this.selectionUpdate.bind(this));
        this.selectBox.addEventListener('change', () => this.selectionUpdate());
        this.loadChoices();
        this.loadProperties();
    }

    async selectionUpdate() {
    }

    async loadProperties() {
        const file = this.app.vault.getAbstractFileByPath(this.focalFilePath);
        if (!file || !(file instanceof TFile)) {
            new Notice('File not found or the path is not a valid file.');
            this.close();
            return;
        }

        this.contentEl.createEl('h3', { text: "Add relationship link", cls: 'bearings-modal-data-entry-heading-title' });
        this.contentEl.createEl('div', {text: "Focal file (will be updated)", cls: 'bearings-modal-data-entry-item-label'});
        this.contentEl.createEl('div', { text: this.focalFilePath, cls: 'bearings-modal-data-entry-fileinfo' });
        this.contentEl.createEl('div', {text: "Linked file target", cls: 'bearings-modal-data-entry-item-label'});
        this.contentEl.createEl('div', { text: this.linkPath, cls: 'bearings-modal-data-entry-fileinfo' });
        this.contentEl.createEl('div', {text: "Relationship property name", cls: 'bearings-modal-data-entry-item-label'});
        const selectContainer = this.contentEl.createDiv({ cls: 'bearings-modal-data-entry-item-container' });
        this.selectBox.className = 'bearings-modal-data-entry-select-box';
        this.relationshipChoices.forEach(choice => {
            const optionEl = this.selectBox.createEl('option', {
                text: choice.displayText,
                value: choice.index.toString(),
            });
        });
        await this.selectionUpdate();
        selectContainer.appendChild(this.selectBox);
        this.contentEl.createEl('div', {text: "Relationship", cls: 'bearings-modal-data-entry-item-label'});
        this.contentEl.createEl('div', { text: this.focalFilePath, cls: 'bearings-modal-data-entry-fileinfo' });

        this.addFooterButtons();
    }

    loadChoices() {
        this.relationshipChoices = [];
        Object.keys(this.configuration.relationshipDefinitions).forEach((key: string) => {
            const relDef: RelationshipDefinition = this.configuration.relationshipDefinitions[key];
            if (relDef.designatedPropertyName) {
                let propertyName: string = relDef.designatedPropertyName;
                let relName: string = key;
                let description1: string;
                if (relName) {
                    description1 = ` (designate '${this.linkPath}' as: '${relName}')`
                } else {
                    description1 = ``
                }
                let displayText: string = `${propertyName}${description1}`
                this.relationshipChoices.push({
                    "index": this.relationshipChoices.length,
                    "designatedRelationshipName": relName,
                    "propertyName": propertyName,
                    "displayText": displayText,
                });
            }
            if (relDef.invertedRelationshipPropertyName) {
                let propertyName: string = relDef.invertedRelationshipPropertyName;
                let relName: string = relDef.invertedRelationshipLabel || "";
                let description1: string;
                if (relName) {
                    description1 = ` (designate '${this.linkPath}' as: '${relName}')`
                } else {
                    description1 = ``
                }
                let displayText: string = `${propertyName}${description1}`
                this.relationshipChoices.push({
                    "index": this.relationshipChoices.length,
                    "designatedRelationshipName": relName,
                    "propertyName": propertyName,
                    "displayText": displayText,
                });
            }
        });
    }

    addFooterButtons() {
        const footer = this.contentEl.createDiv({ cls: 'bearings-modal-footer' });
        this.addCancelButton(footer);

        const saveButton = this.addFooterButton('Save', 'bearings-modal-footer-button', footer);
        saveButton.onclick = async () => {
            const selectedProperty = this.relationshipChoices[Number(this.selectBox.value)].propertyName;
            const normalizedPath = normalizePath(this.focalFilePath);
            const file = this.app.vault.getAbstractFileByPath(normalizedPath);
            if (file instanceof TFile) {
                await appendFrontmatterLists(
                    this.app,
                    file,
                    selectedProperty,
                    `[[${this.linkPath}]]`,
                );
                await this.updateCallbackFn(); // Callback to refresh views or data
            } else {
                new Notice("File not found or the path is not a valid file.");
            }
            this.close();
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

