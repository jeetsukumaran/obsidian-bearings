import {
    App,
    Notice,
    SuggestModal,
    TFile,
} from "obsidian";

import {
    BearingsConfiguration,
} from "./settings";


import {
    getDisplayTitle,
} from "./dataservice";

interface FileDisplayRecord {
  path: string;
  displayTitle: string;
}

export class SelectFileModal extends SuggestModal<FileDisplayRecord> {

    configuration: BearingsConfiguration;
    _allFiles: FileDisplayRecord[];
    onUpdate: (path: string) => void;

    constructor(
        app: App,
        configuration: BearingsConfiguration,
        onUpdate: (path: string) => void,
    ) {
        super(app);
        this.configuration = configuration;
        this._allFiles = [];
        this.onUpdate = onUpdate;
    }

    getSuggestions(query: string): FileDisplayRecord[] {
        return this.loadFiles()
                .filter(
                (fileDisplayRecord: FileDisplayRecord) =>
            fileDisplayRecord.displayTitle.toLowerCase().includes(query.toLowerCase())
            || fileDisplayRecord.path.toLowerCase().includes(query.toLowerCase())
        );
    }

    renderSuggestion(fileDisplayRecord: FileDisplayRecord, el: HTMLElement) {
        el.createEl("div", { text: fileDisplayRecord.displayTitle });
        el.createEl("small", { text: fileDisplayRecord.path });
    }

    onChooseSuggestion(fileDisplayRecord: FileDisplayRecord, evt: MouseEvent | KeyboardEvent) {
        // new Notice(`Selected [[${fileDisplayRecord.path}]]: '${fileDisplayRecord.displayTitle}'`);
        this.onUpdate(fileDisplayRecord.path);
    }

    loadFiles(): FileDisplayRecord[] {
        return this.app.vault
            .getMarkdownFiles()
            .map( (file: TFile) => {
                return {
                    path: file.path,
                    displayTitle: getDisplayTitle(
                        this.app,
                        this.configuration,
                        undefined,
                        file,
                        file.path,
                    ),
                }
            })
            .sort((a: FileDisplayRecord, b: FileDisplayRecord) => a.displayTitle.localeCompare(b.displayTitle));
    }

    get allFiles() {
        if (!this._allFiles) {
            this._allFiles = this.loadFiles();
        }
        return this._allFiles;
    }

}
