import { App, Modal, Notice, TFile } from 'obsidian';

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

export class TitleUpdateModal extends Modal {
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
        await this.app.fileManager.processFrontMatter(this.file, (frontmatter: { [key: string]: any }) => {
            // Update each key in the new front matter data
            for (const key in newFrontMatter) {
                frontmatter[key] = newFrontMatter[key];
            }
            new Notice('Front matter updated.');
        }).catch((error) => {
            new Notice(`Failed to update front matter: ${error.message}`);
        });
        this.close();
    }
}

