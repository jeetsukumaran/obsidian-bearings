import { App, Modal, Notice, TFile } from 'obsidian';

interface FrontMatterUpdateOptions {
    app: App;
    path: string;
    propertyNames: string[];
}

interface PropertyField {
    propertyName: string;
    textArea: HTMLTextAreaElement;
    restoreButton: HTMLButtonElement;
}

export class FrontMatterUpdateModal extends Modal {
    private file: TFile;
    private propertyFields: PropertyField[] = [];

    constructor(options: FrontMatterUpdateOptions) {
        super(options.app);
        this.file = this.app.vault.getAbstractFileByPath(options.path) as TFile;
        if (!this.file) {
            new Notice('File not found.');
            this.close();
            return;
        }
        this.loadProperties(options.propertyNames);
    }

    async loadProperties(propertyNames: string[]) {
        const fileContents = await this.app.vault.read(this.file);
        const frontMatter = this.app.metadataCache.getFileCache(this.file)?.frontmatter;

        propertyNames.forEach(propertyName => {
            const container = this.contentEl.createDiv({ cls: 'bearings-modal-data-entry-container' });
            container.createEl('label', { text: propertyName, cls: 'bearings-modal-data-entry-label' });

            const valueBox = container.createDiv({ cls: 'bearings-modal-data-entry-value-box' });
            const textArea = valueBox.createEl('textarea', {
                cls: 'bearings-modal-data-entry-text-area',
                text: frontMatter?.[propertyName] ?? '',
            });

            const controlsContainer = container.createDiv({ cls: 'bearings-modal-data-entry-controls-container' });
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
        const footer = this.contentEl.createDiv({ cls: 'modal-footer' });
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
        let content = await this.app.vault.read(this.file);
        const frontMatterEndIndex = content.indexOf('---', 3);
        let newFrontMatterString = '---\n';
        for (const key in newFrontMatter) {
            newFrontMatterString += `${key}: ${newFrontMatter[key]}\n`;
        }
        newFrontMatterString += '---\n';
        content = newFrontMatterString + content.slice(frontMatterEndIndex + 3);
        await this.app.vault.modify(this.file, content);
        new Notice('Front matter updated.');
        this.close();
    }
}

