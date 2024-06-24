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
    getPathBaseName,
    getUniquePath,
} from "./fileservice";

import {
    updateFrontmatterStrings,
} from "./dataupdate";

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
        textArea.value = this.initialValue;
        textArea.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                // Trigger any desired action here
                // this.handleEnterKeyPress(textArea);
            }
        });
        this.addFooterButtons(textArea);

        // const textEl = new TextComponent(valueBox);
        // textEl.setPlaceholder('Enter filename');
        // textEl.setValue(this.initialValue);
        // textEl.disabled = true;

        return textArea;
    }

    async postProcessFile(file: TFile, isOpen: boolean) {
        const baseName = getPathBaseName(file.path).replace(/\.md$/, "");
        let defaultTitleField = this.configuration.titleFields.at(-1) || "title";
        await updateFrontmatterStrings(
            this.app,
            file,
            {
                [defaultTitleField]: baseName,
            },
            false,
        );
        await this.onSubmit(file.path);
        if (isOpen) {
            this.app.workspace.openLinkText(
                file.path,
                "",
                "split",
                { active: false }
            );
        }
    }
    async createFile(value: string, isOpen: boolean) {
        let cleanedValue = value.trim();
        const filepath = cleanedValue.replace(/\.md$/,"");
        if (filepath) {
            const fullFilePath = await getUniquePath(this.app, filepath) + ".md";
            this.app.vault.create(fullFilePath, "")
            .then( (file: TFile) => this.postProcessFile(file, isOpen).then( () => {} ))
            .catch( (error) => {
                new Notice(`Failed to create file: ${error}`);
            })
        }
    };


    // addFooterButtons(textArea: TextComponent) {
    addFooterButtons(textArea: HTMLTextAreaElement) {
        const footer = this.contentEl.createDiv({ cls: 'bearings-modal-footer' });
        // footer.createEl("div", {cls: [ "bearings-data-entry-control-cell", ]})
        this.addCancelButton(footer);
        const createButton = this.addFooterButton("Create", "bearings-modal-footer-button", footer)
        createButton.onclick = () => {
            this.createFile(textArea.value, true);
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


