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
    RelationshipDefinition,
    BearingsConfiguration,
} from "./settings";


import {
    getUniquePath,
} from "./fileservice";

import {
    getDisplayTitle,
} from "./dataservice";


export class CreateFileModal extends Modal {
    configuration: BearingsConfiguration;
    onSubmit: (filename: string) => void;
    initialValue: string;

    constructor(
        app: App,
        configuration: BearingsConfiguration,
        onSubmit: (filename: string) => void,
        initialValue: string = ''
    ) {
        super(app);
        this.configuration = configuration;
        this.onSubmit = onSubmit;
        this.initialValue = initialValue;
    }

    onOpen() {
        const headerEl = this.contentEl.createEl('h3', { text: "Create new file", cls: 'bearings-modal-data-entry-heading-title' });
        const fieldEntryContainer = this.contentEl.createDiv({ cls: 'bearings-modal-data-entry-item-container' });
        const valueBox = fieldEntryContainer.createDiv({ cls: 'bearings-modal-data-entry-value-box' });
        const textArea = valueBox.createEl('textarea', {
            cls: 'bearings-modal-data-entry-text-area',
            text: "",
        });
        // const textArea = new TextComponent(valueBox);
        // textArea.setClass("bearings-modal-data-entry-text-area");
        // textArea.setPlaceholder('Enter filename');
        // textArea.setValue(this.initialValue);
        textArea.value = this.initialValue;
        // textArea.disabled = true;
        this.addFooterButtons(textArea);

        return textArea;
    }

    // addFooterButtons(textArea: TextComponent) {
    addFooterButtons(textArea: HTMLTextAreaElement) {
        let createFile = async (isOpen: boolean) => {
            // const filename = textArea.getValue();
            const filepath = textArea.value.replace(/.md$/,"");
            if (filepath) {
                const fullFilePath = await getUniquePath(this.app, filepath) + ".md";
                this.app.vault.create(fullFilePath, "")
                    .then( (file: TFile) => {
                        if (isOpen) {
                            this.app.workspace.openLinkText(
                                fullFilePath,
                                "",
                                "split",
                                { active: false }
                            );
                        }
                        this.onSubmit(fullFilePath);
                    })
                    .catch( (error) => {
                        new Notice(`Failed to create file: ${error}`);
                    })
            }
            footer.createEl("div", {cls: [ "bearings-data-entry-control-cell", ]})
        };
        const footer = this.contentEl.createDiv({ cls: 'bearings-modal-footer' });
        this.addCancelButton(footer);
        const createButton = this.addFooterButton("Create", "bearings-modal-footer-button", footer)
        createButton.onclick = () => {
            createFile(true);
            this.close();
        }
    }

    addCancelButton(footer: HTMLElement) {
        const cancelButton = this.addFooterButton('Cancel', 'bearings-modal-footer-button', footer);
        cancelButton.onclick = () => this.close();
    }

    addFooterButton(text: string, className: string, footer: HTMLElement): HTMLButtonElement {
        const btn = footer.createEl('button', { text, cls: className });
        return btn;
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}


