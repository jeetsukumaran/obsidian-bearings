import {
    App,
    Modal,
    ButtonComponent,
    SuggestModal,
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
    copyYamlFrontmatterProperties,
    updateFrontmatterStrings,
    appendFrontmatterLists,
    UpdateDisplayTitleModal,
} from "./dataupdate";


import {
    SelectFileModal,
} from "./SelectFile";

import {
    CreateFileModal,
} from "./CreateFile";

let PREV_LINK_PATHS: string[] = [];
let PREV_FOCAL_FILE_PATHS: string[] = [];
let PREV_RELATIONSHIPS: string[] = [];


export interface RelationshipLinkChoice {
    key: string;
    primaryRelationshipRole: string;
    complementaryRelationshipRole: string;
    propertyName: string;
    displayText: string;
}

export class CreateRelationshipModal extends Modal {
    public _focalFilePath: string;
    public _focalFilePathDisplayTitle: string;
    public _linkPath: string;
    public _linkPathDisplayTitle: string;
    public initialRelationshipKey: string;
    public configuration: BearingsConfiguration;
    public updateCallbackFn: (file: TFile) => Promise<void>;
    private selectBox: HTMLSelectElement;
    // private relationshipChoices: { [key: string]: RelationshipLinkChoice };
    private relationshipChoices: { [key: string]: RelationshipLinkChoice };
    // private relationshipDescEl: HTMLElement;
    private headerEl: HTMLElement;
    private focalFilePathDisplayEl: HTMLElement;
    private linkPathDisplayEl: HTMLElement;
    private primaryRelationshipRoleEl: HTMLElement;
    private primaryRelationshipValueEl: HTMLElement;
    private complementaryRelationshipRoleEl: HTMLElement;
    private complementaryRelationshipValueEl: HTMLElement;
    // private saveButton: ButtonComponent;
    private saveButton: HTMLButtonElement;

    constructor(
        app: App,
        configuration: BearingsConfiguration,
        focalFilePath: string,
        linkPath: string,
        updateCallbackFn: (file: TFile) => Promise<void>,
        initialRelationshipKey: string = "",
    ) {
        super(app);
        this.focalFilePath = focalFilePath;
        this.linkPath = linkPath;
        // this._focalFilePathDisplayTitle = this.focalFilePath ? getDisplayTitle(app, configuration, this.focalFilePath, undefined, this.focalFilePath) : "";
        // this._linkPathDisplayTitle = this.linkPath ? getDisplayTitle(app, configuration, this.linkPath, undefined, this.linkPath) : "";
        this.configuration = configuration;
        this.updateCallbackFn = updateCallbackFn;
        this.selectBox = document.createElement('select');
        // this.selectBox.addEventListener('change', this.selectionUpdate.bind(this));
        this.selectBox.addEventListener('change', () => this.selectionUpdate());
        this.initialRelationshipKey = initialRelationshipKey;
        if (!this.initialRelationshipKey && PREV_RELATIONSHIPS.length > 0) {
            this.initialRelationshipKey = PREV_RELATIONSHIPS.at(-1) || this.initialRelationshipKey;
        }
        this.loadChoices();
        this.loadProperties();
    }

    get currentSelection() {
        return this.relationshipChoices[this.selectBox.value];
    }

    get focalFilePath() {
        if (!this._focalFilePath && PREV_FOCAL_FILE_PATHS.length > 0) {
            this._focalFilePath = PREV_FOCAL_FILE_PATHS.at(-1) || this._focalFilePath;
        }
        return this._focalFilePath;
    }
    set focalFilePath(value: string) {
        if (value) {
            PREV_FOCAL_FILE_PATHS.push(value);
        }
        if (PREV_FOCAL_FILE_PATHS.length > 10) {
            PREV_FOCAL_FILE_PATHS = PREV_FOCAL_FILE_PATHS.slice(-10);
        }
        this._focalFilePath = value;
        this._focalFilePathDisplayTitle = "";
    }

    get linkPath() {
        if (!this._linkPath && PREV_LINK_PATHS.length > 0) {
            this._linkPath = PREV_LINK_PATHS.at(-1) || this._linkPath;
        }
        return this._linkPath;
    }
    set linkPath(value: string) {
        if (value) {
            PREV_LINK_PATHS.push(value);
        }
        if (PREV_LINK_PATHS.length > 10) {
            PREV_LINK_PATHS = PREV_LINK_PATHS.slice(-10);
        }
        this._linkPath = value;
        this._linkPathDisplayTitle = "";
    }

    get focalFilePathDisplayTitle() {
        if (!this._focalFilePathDisplayTitle) {
            this._focalFilePathDisplayTitle = this.focalFilePath ? getDisplayTitle(app, this.configuration, this.focalFilePath, undefined, true, this.focalFilePath) : "";
        }
        return this._focalFilePathDisplayTitle;
    }

    get linkPathDisplayTitle() {
        if (!this._linkPathDisplayTitle) {
            this._linkPathDisplayTitle = this.linkPath ? getDisplayTitle(app, this.configuration, this.linkPath, undefined, true, this.linkPath) : "";
        }
        return this._linkPathDisplayTitle;
    }

    async selectionUpdate() {
        let currentSelection = this.currentSelection;
        // if (!this.focalFilePath && !this.linkPath) {
        //     // this.saveButton.tooltip = "Focal file source and link target file are unspecified";
        //     this.saveButton.disabled = true;
        // } else
        if (!this.focalFilePath) {
            // this.saveButton.tooltip = "Focal file source is unspecified";
            this.saveButton.disabled = true;
        } else if (!this.linkPath) {
            // this.saveButton.tooltip = "Link target is unspecified";
            this.saveButton.disabled = true;
        } else if (this.focalFilePath === this.linkPath) {
            // this.saveButton.tooltip = "Focal file source and link target file are the same";
            this.saveButton.disabled = true;
        } else {
            // this.saveButton.tooltip = "Add the relationship link to the focal file source metadata";
            this.saveButton.disabled = false;
        }
        let wrapIfNotEmpty = (s: string, verb: string) => {
            if (s) {
                return `: ${verb} as '${s}'`;
            } else {
                return "";
            }
        };
        let formatDisplay = (fpath: string, ftitle: string) => {
            let s = [];
            if (!fpath) {
                return "";
            }
            if (ftitle) {
                return `[[${fpath}]]: '${ftitle}'`;
            } else {
                return `[[${fpath}]]`;
            }
        }
        let focalFileDisplayText = formatDisplay(this.focalFilePath, this.focalFilePathDisplayTitle)
        let linkDisplayText = formatDisplay(this.linkPath, this.linkPathDisplayTitle)
        this.focalFilePathDisplayEl.setText(focalFileDisplayText);
        this.linkPathDisplayEl.setText(linkDisplayText)
        this.complementaryRelationshipRoleEl.setText(`Focal file source${wrapIfNotEmpty(currentSelection.complementaryRelationshipRole, "self-designated")}`);
        this.complementaryRelationshipValueEl.setText(focalFileDisplayText);
        this.primaryRelationshipRoleEl.setText(`Selected target${wrapIfNotEmpty(currentSelection.primaryRelationshipRole, "designated")}`);
        this.primaryRelationshipValueEl.setText(linkDisplayText);
    }

    buildFileNodeViewBox(
        onUpdate: (path: string) => void,
        getCurrentValue: () => string,
    ): HTMLElement {
        const fieldEntryContainer = this.contentEl.createDiv({ cls: 'bearings-modal-data-entry-item-container' });
        const valueBox = fieldEntryContainer.createDiv({ cls: 'bearings-modal-data-entry-value-box' });
        const textArea = valueBox.createEl('textarea', {
            cls: 'bearings-modal-data-entry-text-area',
            text: "",
        });
        textArea.disabled = true;

        const controlsContainer = fieldEntryContainer.createDiv({ cls: 'bearings-modal-data-entry-item-controls-container' });
        let findButton = new ButtonComponent(
            controlsContainer.createEl("div", {cls: [ "bearings-data-entry-control-cell", ]})
        );
        findButton.setClass("bearings-control-button");
        findButton.setTooltip("Find file");
        findButton.setIcon("search");
        findButton.onClick(() => {
            const modal = new SelectFileModal(
                this.app,
                this.configuration,
                onUpdate,
            );
            modal.open();
        });
        let newButton = new ButtonComponent(
            controlsContainer.createEl("div", {cls: [ "bearings-data-entry-control-cell", ]})
        );
        newButton.setClass("bearings-control-button");
        newButton.setTooltip("New file");
        newButton.setIcon("file-plus-2");
        newButton.onClick(() => {
            let initialValue: string = getCurrentValue().replace(/\.md$/,"") + "_related";
            const modal = new CreateFileModal(
                this.app,
                this.configuration,
                (newPath: string) => {
                    if (newPath) {
                        const titleModal = new UpdateDisplayTitleModal(
                            this.app,
                            this.configuration,
                            newPath,
                            async () => {
                                onUpdate(newPath);
                            },
                        );
                        titleModal.open();
                    }
                },
                initialValue,
            );
            modal.open();
        });
        return textArea;
    }

    async loadProperties() {
        // const file = this.app.vault.getAbstractFileByPath(this.focalFilePath);
        // if (!file || !(file instanceof TFile)) {
        //     new Notice('File not found or the path is not a valid file.');
        //     this.close();
        //     return;
        // }
        this.headerEl = this.contentEl.createEl('h3', { text: "Create relationship link", cls: 'bearings-modal-data-entry-heading-title' });

        this.contentEl.createEl('div', {text: `The focal file source:`, cls: 'bearings-modal-data-entry-item-label'});
        // this.focalFilePathDisplayEl = this.contentEl.createEl('div', { text: "", cls: 'bearings-modal-data-entry-fileinfo' });
        this.focalFilePathDisplayEl = this.buildFileNodeViewBox(
            (path: string) => {
                this.focalFilePath = path;
                this.selectionUpdate();
            },
            () => this.focalFilePath,
        );

        let swapRow = this.contentEl.createEl('div', {cls: 'bearings-data-entry-control-row'});
        let swapButton = new ButtonComponent(
            swapRow.createEl("div", {cls: [ "bearings-settings-spanning-controls-container", ]})
        );
        swapButton.setClass("bearings-settings-spanning-control");
        swapButton.setTooltip("Swap focal and link paths");
        swapButton.setIcon("arrow-up-down");
        swapButton.onClick(() => {
            let t = this.focalFilePath
            this.focalFilePath = this.linkPath;
            this.linkPath = t;
            this.selectionUpdate();
        });

        swapRow.createEl('div', {text: `will designate:`, cls: 'bearings-modal-data-entry-item-label'});
        // this.linkPathDisplayEl = this.contentEl.createEl('div', { text: "", cls: 'bearings-modal-data-entry-fileinfo' });
        this.linkPathDisplayEl = this.buildFileNodeViewBox(
            (path: string) => {
                this.linkPath = path;
                this.selectionUpdate();
            },
            () => this.linkPath,
        );


        this.contentEl.createEl('div', {text: `as:`, cls: 'bearings-modal-data-entry-item-label'});
        const selectContainer = this.contentEl.createDiv({ cls: 'bearings-modal-data-entry-item-container' });
        this.selectBox.className = 'bearings-modal-data-entry-select-box';
        Object.values(this.relationshipChoices)
            .sort((a, b) => a.displayText.localeCompare(b.displayText))
            .forEach(choice => {
                const optionEl = this.selectBox.createEl('option', {
                    text: choice.displayText,
                    value: choice.key,
                });
            });
        if (this.initialRelationshipKey) {
            this.selectBox.value = this.initialRelationshipKey;
        }
        selectContainer.appendChild(this.selectBox);
        this.contentEl.createEl('br');
        this.complementaryRelationshipRoleEl = this.contentEl.createEl('div', {text: "*", cls: 'bearings-modal-data-entry-item-label'});
        this.complementaryRelationshipValueEl = this.contentEl.createEl('div', {text: "*", cls: 'bearings-modal-infobox bearings-modal-data-entry-item-fixed-value'});
        this.primaryRelationshipRoleEl = this.contentEl.createEl('div', {text: "*", cls: 'bearings-modal-data-entry-item-label'});
        this.primaryRelationshipValueEl = this.contentEl.createEl('div', {text: "*", cls: 'bearings-modal-infobox bearings-modal-data-entry-fixed-value'});
        this.addFooterButtons();
        await this.selectionUpdate();
    }

    loadChoices(): void {
        this.relationshipChoices = {};

        const createChoice = (propertyName: string, primaryRole: string, complementaryRole: string): string => {
            const roleDescription = primaryRole ? `'${primaryRole}' ` : "";
            return `${roleDescription}(link under property: '${propertyName}')`;
        };

        for (const [key, relDef] of Object.entries(this.configuration.relationshipDefinitions)) {
            const {
                primaryRelationshipPropertyName,
                primaryRelationshipRole = "",
                    complementaryRelationshipPropertyName,
                complementaryRelationshipRole = ""
            } = relDef;

            if (primaryRelationshipPropertyName) {
                const displayText = createChoice(primaryRelationshipPropertyName, primaryRelationshipRole, complementaryRelationshipRole);
                this.relationshipChoices[displayText] = {
                    key: displayText,
                    primaryRelationshipRole,
                    complementaryRelationshipRole,
                    propertyName: primaryRelationshipPropertyName,
                    displayText
                };
            }

            if (complementaryRelationshipPropertyName) {
                const displayText = createChoice(complementaryRelationshipPropertyName, complementaryRelationshipRole, primaryRelationshipRole);
                this.relationshipChoices[displayText] = {
                    key: displayText,
                    primaryRelationshipRole: complementaryRelationshipRole,
                    complementaryRelationshipRole: primaryRelationshipRole,
                    propertyName: complementaryRelationshipPropertyName,
                    displayText
                };
            }
        }
    }

    async onUpdate(file: TFile, selectedProperty: string) {
        await appendFrontmatterLists(
            this.app,
            file,
            selectedProperty,
            `[[${this.linkPath}]]`,
        );
        await this.updateCallbackFn(file);
    }

    addFooterButtons() {
        const footer = this.contentEl.createDiv({ cls: 'bearings-modal-footer' });
        this.addCancelButton(footer);

        this.saveButton = this.addFooterButton('Save', 'bearings-modal-footer-button', footer);
        this.saveButton.onclick = async () => {
            if (!this.focalFilePath || !this.linkPath) {
                return;
            }
            const selectedProperty = this.currentSelection.propertyName;
            const normalizedPath = normalizePath(this.focalFilePath);
            const file = this.app.vault.getAbstractFileByPath(normalizedPath);
            if (selectedProperty) {
                PREV_RELATIONSHIPS.push(this.selectBox.value);
            }
            if (PREV_RELATIONSHIPS.length > 10) {
                PREV_RELATIONSHIPS = PREV_RELATIONSHIPS.slice(-10);
            }
            if (file instanceof TFile) {
                this.onUpdate(file, selectedProperty)
                    .then( () => {} )
                    .catch( () => {} );
                this.close();
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


